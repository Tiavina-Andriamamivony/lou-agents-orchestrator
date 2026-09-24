import { NodeAuditLog } from '@lou/audit';
import type { AuditLog, AuditEventPayload } from '@lou/audit';
import { NodeGitHubAdapter } from '@lou/github';
import type { GitHubAdapter, GitHubIssue } from '@lou/github';
import { NodeGitAdapter } from '@lou/git';
import type { GitAdapter } from '@lou/git';
import { OpenCodeRuntime } from '@lou/opencode-runtime';
import type { AgentRuntime } from '@lou/opencode-runtime';
import { Orchestrator } from '@lou/orchestrator';
import type { OrchestratorOutcome, OrchestratorStatus } from '@lou/orchestrator';
import { ReviewerAgent } from '@lou/reviewer';
import { Workflow } from '@lou/state-machine';
import { NodeTestRunner } from '@lou/test-runner';
import type { TestRunner } from '@lou/test-runner';
import { join } from 'node:path';
import { createInterface } from 'node:readline/promises';
import { createOpenCodeSteps } from './opencode-steps.ts';
import { createTerminalKeeper } from './terminal-keeper.ts';

const STREAMED_EVENTS: ReadonlySet<string> = new Set([
  'human_approval',
  'human_rejection',
  'review_finished',
  'pr_created',
]);

export interface RunEnvironment {
  readonly issueNumber: number;
  readonly workspace: string;
  readonly github: GitHubAdapter;
  readonly git: GitAdapter;
  readonly tests: TestRunner;
  readonly audit: AuditLog;
  readonly runtime: AgentRuntime;
  readonly conventions: string;
  readonly ask: (question: string) => Promise<string>;
  readonly out: (line: string) => void;
}

interface ProductionRunOptions {
  readonly issueNumber: number;
  readonly cwd: string;
  readonly out: (line: string) => void;
}

export function readIssueNumber(value: string | undefined): number | null {
  if (value === undefined) {
    return null;
  }
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return null;
  }
  return parsed;
}

export function runProduction(options: ProductionRunOptions): Promise<number> {
  const auditFile = join(options.cwd, '.lou', 'runs', `run-${options.issueNumber}.jsonl`);
  return runTicket({
    issueNumber: options.issueNumber,
    workspace: options.cwd,
    github: new NodeGitHubAdapter({ root: options.cwd }),
    git: new NodeGitAdapter({ root: options.cwd }),
    tests: new NodeTestRunner(),
    audit: new NodeAuditLog({ file: auditFile }),
    runtime: new OpenCodeRuntime(),
    conventions: 'conventional commits',
    ask: terminalQuestion,
    out: options.out,
  });
}

export async function runTicket(env: RunEnvironment): Promise<number> {
  const issue = await readIssue(env);
  if (issue === null) {
    return 1;
  }
  if (issue.state === 'CLOSED') {
    env.out(`Issue #${issue.number} is already closed.`);
    return 1;
  }
  const orchestrator = new Orchestrator({
    runId: `run-${issue.number}`,
    issue,
    workspace: env.workspace,
    workflow: new Workflow(),
    steps: createOpenCodeSteps({ runtime: env.runtime, workspace: env.workspace }),
    keeper: createTerminalKeeper({ ask: env.ask, out: env.out }),
    reviewer: new ReviewerAgent({ runtime: env.runtime }),
    tests: env.tests,
    git: env.git,
    github: env.github,
    audit: withStreaming(env.audit, env.out),
    conventions: env.conventions,
  });
  const outcome = await orchestrator.run();
  return report(outcome, env.out);
}

async function readIssue(env: RunEnvironment): Promise<GitHubIssue | null> {
  try {
    const issue = await env.github.getIssue(env.issueNumber);
    env.out(`Ticket #${issue.number} — ${issue.title}`);
    return issue;
  } catch (error) {
    env.out(`Cannot fetch issue #${env.issueNumber}: ${errorMessage(error)}`);
    return null;
  }
}

function withStreaming(audit: AuditLog, out: (line: string) => void): AuditLog {
  return {
    record(payload: AuditEventPayload): Promise<void> {
      if (STREAMED_EVENTS.has(payload.event)) {
        out(`• ${payload.event}${payload.target !== undefined ? ` — ${payload.target}` : ''}`);
      }
      return audit.record(payload);
    },
    history: () => audit.history(),
  };
}

function report(outcome: OrchestratorOutcome, out: (line: string) => void): number {
  out(STATUS_LINES[outcome.status](outcome));
  return outcome.status === 'pr-created' ? 0 : 1;
}

const STATUS_LINES: Readonly<Record<OrchestratorStatus, (outcome: OrchestratorOutcome) => string>> =
  {
    'pr-created': (outcome) => `Pull request created: ${outcome.pullRequest?.url ?? '(no url)'}`,
    blocked: (outcome) => `Blocked by the reviewer: ${outcome.reason ?? '(no reason)'}`,
    'human-intervention': (outcome) =>
      `Needs human intervention: ${outcome.reason ?? '(no reason)'}`,
    failed: (outcome) => `Run failed: ${outcome.reason ?? '(no reason)'}`,
  };

function errorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return 'unknown error';
}

async function terminalQuestion(question: string): Promise<string> {
  const readline = createInterface({ input: process.stdin, output: process.stdout });
  const answer = await readline.question(question);
  readline.close();
  return answer;
}
