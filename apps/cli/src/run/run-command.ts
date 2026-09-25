import { NodeAuditLog } from '@lou/audit';
import type { AuditLog, AuditEventPayload } from '@lou/audit';
import { NodeGitHubAdapter } from '@lou/github';
import type { GitHubAdapter, GitHubIssue } from '@lou/github';
import { NodeGitAdapter } from '@lou/git';
import type { GitAdapter } from '@lou/git';
import { OpenCodeRuntime } from '@lou/opencode-runtime';
import type { AgentRuntime } from '@lou/opencode-runtime';
import { Orchestrator } from '@lou/orchestrator';
import type {
  HumanKeeper,
  OrchestratorOutcome,
  OrchestratorStatus,
  OrchestratorSteps,
  PlanDraft,
  UnderstandInput,
} from '@lou/orchestrator';
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
  readonly dryRun: boolean;
  readonly model?: string;
  readonly modelsByAgent?: Readonly<Record<string, string>>;
}

interface ProductionRunOptions {
  readonly issueNumber: number;
  readonly cwd: string;
  readonly out: (line: string) => void;
  readonly dryRun: boolean;
  readonly model?: string;
  readonly modelsByAgent?: Readonly<Record<string, string>>;
}

interface RunArguments {
  readonly issueNumber: number;
  readonly dryRun: boolean;
  readonly model?: string;
  readonly modelsByAgent?: Readonly<Record<string, string>>;
}

const DRY_RUN_FLAG = '--dry-run';
const MODEL_FLAG = '--model';
const MODEL_BY_AGENT_FLAG = '--model-by-agent';

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
export function parseRunArguments(argv: readonly string[]): RunArguments | null {
  const issueNumber = readIssueNumber(argv[1]);
  if (issueNumber === null) {
    return null;
  }
  const flags = parseFlags(argv.slice(2));
  if (flags === null) {
    return null;
  }
  return {
    issueNumber,
    dryRun: flags.dryRun,
    ...(flags.model !== undefined ? { model: flags.model } : {}),
    ...(flags.modelsByAgent !== undefined ? { modelsByAgent: flags.modelsByAgent } : {}),
  };
}

interface FlagState {
  dryRun: boolean;
  model: string | undefined;
  modelsByAgent: Readonly<Record<string, string>> | undefined;
}

function parseFlags(rest: readonly string[]): FlagState | null {
  const flags: FlagState = { dryRun: false, model: undefined, modelsByAgent: undefined };
  for (let index = 0; index < rest.length; index += 1) {
    const nextIndex = applyFlag(rest, index, flags);
    if (nextIndex === null) {
      return null;
    }
    index = nextIndex;
  }
  return flags;
}

function applyFlag(rest: readonly string[], index: number, flags: FlagState): number | null {
  const flag = rest[index];
  if (flag === DRY_RUN_FLAG) {
    flags.dryRun = true;
    return index;
  }
  const value = readFlagValue(rest, index);
  if (value === null) {
    return null;
  }
  if (flag === MODEL_FLAG) {
    flags.model = value;
    return index + 1;
  }
  if (flag !== MODEL_BY_AGENT_FLAG) {
    return null;
  }
  const mapping = parseModelsByAgent(value);
  if (mapping === null) {
    return null;
  }
  flags.modelsByAgent = mapping;
  return index + 1;
}

function readFlagValue(rest: readonly string[], index: number): string | null {
  const value = rest[index + 1];
  if (value === undefined || value.length === 0) {
    return null;
  }
  return value;
}

function parseModelsByAgent(value: string): Readonly<Record<string, string>> | null {
  const entries = value.split(',');
  if (entries.some((entry) => entry.length === 0)) {
    return null;
  }
  const mapping: Record<string, string> = {};
  for (const entry of entries) {
    const separator = entry.indexOf('=');
    if (separator <= 0 || separator === entry.length - 1) {
      return null;
    }
    mapping[entry.slice(0, separator)] = entry.slice(separator + 1);
  }
  return mapping;
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
    dryRun: options.dryRun,
    ...(options.model !== undefined ? { model: options.model } : {}),
    ...(options.modelsByAgent !== undefined ? { modelsByAgent: options.modelsByAgent } : {}),
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
  const steps = createOpenCodeSteps({
    runtime: env.runtime,
    workspace: env.workspace,
    ...(env.model !== undefined ? { model: env.model } : {}),
    ...(env.modelsByAgent !== undefined ? { modelsByAgent: env.modelsByAgent } : {}),
  });
  if (env.dryRun) {
    return runDryRun(issue, env, steps);
  }
  const orchestrator = new Orchestrator({
    runId: `run-${issue.number}`,
    issue,
    workspace: env.workspace,
    workflow: new Workflow(),
    steps,
    keeper: createTerminalKeeper({ ask: env.ask, out: env.out }),
    reviewer: new ReviewerAgent({
      runtime: env.runtime,
      ...(env.model !== undefined ? { model: env.model } : {}),
      ...(env.modelsByAgent !== undefined ? { modelsByAgent: env.modelsByAgent } : {}),
    }),
    tests: env.tests,
    git: env.git,
    github: env.github,
    audit: withStreaming(env.audit, env.out),
    conventions: env.conventions,
  });
  const outcome = await orchestrator.run();
  return report(outcome, env.out);
}

async function runDryRun(
  issue: GitHubIssue,
  env: RunEnvironment,
  steps: OrchestratorSteps,
): Promise<number> {
  const keeper: HumanKeeper = createTerminalKeeper({ ask: env.ask, out: env.out });
  let understanding = await steps.understand(understandInput(issue, env, []));
  if (understanding.questions.length > 0) {
    const answers = await keeper.askClarifications(understanding.questions);
    understanding = await steps.understand(understandInput(issue, env, answers));
  }
  printPlan(understanding.plan, env.out);
  return 0;
}

function understandInput(
  issue: GitHubIssue,
  env: RunEnvironment,
  feedback: readonly string[],
): UnderstandInput {
  return {
    runId: `dry-run-${issue.number}`,
    issue,
    workspace: env.workspace,
    feedback,
  };
}

function printPlan(plan: PlanDraft, out: (line: string) => void): void {
  out('');
  out(`Plan: ${plan.title}`);
  out(`Branch: ${plan.branchName}`);
  out(`Commit: ${plan.commitMessage}`);
  out('Steps:');
  plan.steps.forEach((step, index) => {
    out(`${index + 1}. ${step}`);
  });
  out('Dry run complete — no branch, commits, tests or implementation were performed.');
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
