import type { GitHubAdapter, GitHubIssue } from '@lou/github';
import type { AgentRunResult } from '@lou/opencode-runtime';
import { describe, expect, it } from 'vitest';
import type { RunEnvironment } from '../src/run/run-command';
import { parseRunArguments, readIssueNumber, runTicket } from '../src/run/run-command';
import {
  createAuditSpy,
  createFakeRuntime,
  createGitHubSpy,
  createGitSpy,
  createTestRunner,
  resultFor,
} from './fakes';

const ISSUE: GitHubIssue = {
  number: 1,
  title: 'Add reset password',
  body: 'User can reset the password.',
  state: 'OPEN',
};

const PLANNER_STDOUT = [
  'SUMMARY: implement the reset password flow',
  'PLAN_TITLE: feat: reset password',
  'PLAN_BRANCH: feature/reset-password',
  'PLAN_COMMIT: feat(auth): add password reset',
  'PLAN_STEP: add the reset endpoint',
].join('\n');

function happyReplies(): readonly AgentRunResult[] {
  return [
    resultFor(PLANNER_STDOUT),
    resultFor('TEST_PLAN: valid token'),
    resultFor('CHANGED: test/reset.spec.ts\nSUMMARY: tests written'),
    resultFor('CHANGED: src/reset.ts\nSUMMARY: implemented'),
    resultFor('VERDICT: APPROVED\nREASON: looks good'),
  ];
}

interface EnvFixture {
  readonly env: RunEnvironment;
  readonly git: ReturnType<typeof createGitSpy>;
  readonly audit: ReturnType<typeof createAuditSpy>;
  readonly github: ReturnType<typeof createGitHubSpy>;
  readonly runtime: ReturnType<typeof createFakeRuntime>;
  readonly out: readonly string[];
}

function buildEnv(
  replies: readonly AgentRunResult[],
  issue: GitHubIssue = ISSUE,
  model?: string,
): EnvFixture {
  const git = createGitSpy();
  const audit = createAuditSpy();
  const github = createGitHubSpy(issue);
  const tests = createTestRunner(true);
  const runtime = createFakeRuntime(replies);
  const out: string[] = [];
  const env: RunEnvironment = {
    issueNumber: issue.number,
    workspace: '/work',
    github: github.github,
    git: git.git,
    tests: tests.runner,
    audit: audit.log,
    runtime,
    conventions: 'conventional commits',
    ask: () => Promise.resolve('y'),
    out: (line: string) => out.push(line),
    dryRun: false,
    ...(model !== undefined ? { model } : {}),
  };
  return { env, git, audit, github, runtime, out };
}

describe('runTicket', () => {
  it('drives the ticket to a pull request', async () => {
    const { env, git, audit, github, runtime, out } = buildEnv(happyReplies());

    const code = await runTicket(env);

    expect(code).toBe(0);
    expect(runtime.runs.map((run) => run.agent)).toEqual([
      'planner',
      'test-designer',
      'test-writer',
      'developer',
      'reviewer',
    ]);
    expect(git.branches).toEqual(['feature/reset-password']);
    expect(git.commits).toEqual(['feat(auth): add password reset']);
    expect(git.pushes).toBe(1);
    expect(github.created).toHaveLength(1);
    const output = out.join('\n');
    expect(output).toContain('Pull request created: https://hub.example/pr/42');
    expect(audit.events().map((event) => event.event)).toEqual(
      expect.arrayContaining(['human_approval', 'review_finished', 'pr_created']),
    );
  });

  it('refuses a closed issue', async () => {
    const closed: GitHubIssue = { ...ISSUE, state: 'CLOSED' };
    const { env, out } = buildEnv([], closed);

    const code = await runTicket(env);

    expect(code).toBe(1);
    expect(out.join('\n')).toContain('already closed');
  });

  it('reports a fetch failure', async () => {
    const failing: GitHubAdapter = {
      getIssue: () => Promise.reject(new Error('network down')),
      createPullRequest: () => Promise.reject(new Error('nope')),
    };
    const git = createGitSpy();
    const audit = createAuditSpy();
    const tests = createTestRunner(true);
    const runtime = createFakeRuntime(happyReplies());
    const out: string[] = [];
    const env: RunEnvironment = {
      issueNumber: 1,
      workspace: '/work',
      github: failing,
      git: git.git,
      tests: tests.runner,
      audit: audit.log,
      runtime,
      conventions: 'conventional commits',
      ask: () => Promise.resolve('y'),
      out: (line: string) => out.push(line),
      dryRun: false,
    };

    const code = await runTicket(env);

    expect(code).toBe(1);
    expect(out.join('\n')).toContain('Cannot fetch issue #1: network down');
  });

  it('fails when the reviewer blocks the change', async () => {
    const replies = [
      ...happyReplies().slice(0, 4),
      resultFor('VERDICT: BLOCKED\nREASON: insecure'),
    ];
    const { env, out } = buildEnv(replies);

    const code = await runTicket(env);

    expect(code).toBe(1);
    expect(out.join('\n')).toContain('Blocked by the reviewer');
  });

  it('asks the human before committing and opening the pull request', async () => {
    const asked: string[] = [];
    const { env, out } = buildEnv(happyReplies());
    const envWithPrompts = {
      ...env,
      ask: (question: string) => {
        asked.push(question);
        return Promise.resolve('y');
      },
    };

    const code = await runTicket(envWithPrompts);

    expect(code).toBe(0);
    expect(asked.some((question) => question.includes('Approve plan'))).toBe(true);
    expect(asked.some((question) => question.includes('Approve review'))).toBe(true);
    expect(out.join('\n')).toContain('Plan gate');
  });

  it('routes the configured model to every agent run', async () => {
    const { env, runtime } = buildEnv(happyReplies(), ISSUE, 'gpt-5');

    const code = await runTicket(env);

    expect(code).toBe(0);
    expect(runtime.runs).toHaveLength(5);
    for (const run of runtime.runs) {
      expect(run.model).toBe('gpt-5');
    }
  });
});

describe('runTicket in dry-run', () => {
  it('prints the plan and makes no git, github, test or implementation calls', async () => {
    const git = createGitSpy();
    const audit = createAuditSpy();
    const github = createGitHubSpy(ISSUE);
    const tests = createTestRunner(true);
    const runtime = createFakeRuntime([resultFor(PLANNER_STDOUT)]);
    const out: string[] = [];
    const env: RunEnvironment = {
      issueNumber: ISSUE.number,
      workspace: '/work',
      github: github.github,
      git: git.git,
      tests: tests.runner,
      audit: audit.log,
      runtime,
      conventions: 'conventional commits',
      ask: () => Promise.resolve('y'),
      out: (line: string) => out.push(line),
      dryRun: true,
    };

    const code = await runTicket(env);

    expect(code).toBe(0);
    expect(runtime.runs.map((run) => run.agent)).toEqual(['planner']);
    expect(git.branches).toEqual([]);
    expect(git.commits).toEqual([]);
    expect(git.pushes).toBe(0);
    expect(github.created).toHaveLength(0);
    expect(tests.runs).toEqual([]);
    const output = out.join('\n');
    expect(output).toContain('Plan: feat: reset password');
    expect(output).toContain('Branch: feature/reset-password');
    expect(output).toContain('Commit: feat(auth): add password reset');
  });

  it('asks for clarifications and re-plans before printing the plan', async () => {
    const withQuestion = [
      'SUMMARY: implement the reset password flow',
      'QUESTION: auth or not?',
      'PLAN_TITLE: feat: reset password',
      'PLAN_BRANCH: feature/reset-password',
      'PLAN_COMMIT: feat(auth): add password reset',
      'PLAN_STEP: add the reset endpoint',
    ].join('\n');
    const answered: string[] = [];
    const runtime = createFakeRuntime([resultFor(withQuestion), resultFor(PLANNER_STDOUT)]);
    const env: RunEnvironment = {
      issueNumber: ISSUE.number,
      workspace: '/work',
      github: createGitHubSpy(ISSUE).github,
      git: createGitSpy().git,
      tests: createTestRunner(true).runner,
      audit: createAuditSpy().log,
      runtime,
      conventions: 'conventional commits',
      ask: (question: string) => {
        answered.push(question);
        return Promise.resolve('yes, auth');
      },
      out: () => undefined,
      dryRun: true,
    };

    const code = await runTicket(env);

    expect(code).toBe(0);
    expect(answered).toEqual(['auth or not? ']);
    expect(runtime.runs.map((run) => run.agent)).toEqual(['planner', 'planner']);
  });

  it('routes the model to the planner during a dry run', async () => {
    const runtime = createFakeRuntime([resultFor(PLANNER_STDOUT)]);
    const env: RunEnvironment = {
      issueNumber: ISSUE.number,
      workspace: '/work',
      github: createGitHubSpy(ISSUE).github,
      git: createGitSpy().git,
      tests: createTestRunner(true).runner,
      audit: createAuditSpy().log,
      runtime,
      conventions: 'conventional commits',
      ask: () => Promise.resolve('y'),
      out: () => undefined,
      dryRun: true,
      model: 'gpt-5',
    };

    const code = await runTicket(env);

    expect(code).toBe(0);
    expect(runtime.runs).toHaveLength(1);
    expect(runtime.runs[0]?.model).toBe('gpt-5');
  });
});

describe('parseRunArguments', () => {
  it('parses an issue number', () => {
    expect(parseRunArguments(['run', '12'])).toEqual({ issueNumber: 12, dryRun: false });
  });

  it('parses a --dry-run flag', () => {
    expect(parseRunArguments(['run', '12', '--dry-run'])).toEqual({
      issueNumber: 12,
      dryRun: true,
    });
  });

  it('parses a --model option', () => {
    expect(parseRunArguments(['run', '12', '--model', 'gpt-5'])).toEqual({
      issueNumber: 12,
      dryRun: false,
      model: 'gpt-5',
    });
  });

  it('parses --dry-run combined with --model', () => {
    expect(parseRunArguments(['run', '12', '--dry-run', '--model', 'gpt-5'])).toEqual({
      issueNumber: 12,
      dryRun: true,
      model: 'gpt-5',
    });
  });

  it.each(['run', 'run|12|extra', 'run|abc', 'run|12|--push', 'run|12|--dry-run|extra'])(
    'rejects %j',
    (line) => {
      const args = line.split('|');
      expect(parseRunArguments(args)).toBeNull();
    },
  );

  it.each(['run|12|--model', 'run|12|--model|'])(
    'rejects a missing or empty model value %j',
    (line) => {
      const args = line.split('|');
      expect(parseRunArguments(args)).toBeNull();
    },
  );
});

describe('readIssueNumber', () => {
  it('parses a positive integer issue number', () => {
    expect(readIssueNumber('12')).toBe(12);
  });

  it.each(['0', '-3', '1.5', 'abc'])('rejects %j', (value) => {
    expect(readIssueNumber(value)).toBeNull();
  });

  it('rejects no value', () => {
    expect(readIssueNumber(undefined)).toBeNull();
  });
});
