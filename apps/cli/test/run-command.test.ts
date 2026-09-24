import type { GitHubAdapter, GitHubIssue } from '@lou/github';
import type { AgentRunResult } from '@lou/opencode-runtime';
import { describe, expect, it } from 'vitest';
import type { RunEnvironment } from '../src/run/run-command';
import { readIssueNumber, runTicket } from '../src/run/run-command';
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

function buildEnv(replies: readonly AgentRunResult[], issue: GitHubIssue = ISSUE): EnvFixture {
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
