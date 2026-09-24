import type { AgentRuntime } from '@lou/opencode-runtime';
import type {
  ChangeNote,
  OrchestratorSteps,
  PlanDraft,
  UnderstandInput,
  Understanding,
} from '@lou/orchestrator';

interface OpenCodeStepsOptions {
  readonly runtime: AgentRuntime;
  readonly workspace: string;
}

const SUMMARY_PATTERN = /^SUMMARY\s*:\s*(.+)$/im;
const QUESTION_PATTERN = /^QUESTION\s*:\s*(.+)$/im;
const TITLE_PATTERN = /^PLAN_TITLE\s*:\s*(.+)$/im;
const BRANCH_PATTERN = /^PLAN_BRANCH\s*:\s*(.+)$/im;
const COMMIT_PATTERN = /^PLAN_COMMIT\s*:\s*(.+)$/im;
const STEP_PATTERN = /^PLAN_STEP\s*:\s*(.+)$/im;
const TEST_PLAN_PATTERN = /^TEST_PLAN\s*:\s*(.+)$/im;
const CHANGED_PATTERN = /^CHANGED\s*:\s*(.+)$/im;

export function createOpenCodeSteps(options: OpenCodeStepsOptions): OrchestratorSteps {
  const { runtime, workspace } = options;
  return {
    understand: (input) => understand(runtime, input),
    designTests: (plan) => designTests(runtime, workspace, plan),
    writeTests: (plan) =>
      changeNote({ runtime, workspace, plan, agent: 'test-writer', prompt: buildWriteTestsPrompt }),
    implement: (plan) =>
      changeNote({ runtime, workspace, plan, agent: 'developer', prompt: buildImplementPrompt }),
  };
}

async function understand(runtime: AgentRuntime, input: UnderstandInput): Promise<Understanding> {
  const result = await runtime.run({
    runId: input.runId,
    agent: 'planner',
    instructions: buildUnderstandPrompt(input),
    workspace: input.workspace,
  });
  return parseUnderstanding(result.stdout);
}

async function changeNote(options: {
  readonly runtime: AgentRuntime;
  readonly workspace: string;
  readonly plan: PlanDraft;
  readonly agent: string;
  readonly prompt: (input: PlanDraft) => string;
}): Promise<ChangeNote> {
  const { runtime, workspace, plan, agent, prompt } = options;
  const result = await runtime.run({
    runId: runIdFor(agent, plan),
    agent,
    instructions: prompt(plan),
    workspace,
  });
  return {
    changedFiles: matchAll(result.stdout, CHANGED_PATTERN),
    summary: matchValue(result.stdout, SUMMARY_PATTERN) ?? '(no summary)',
  };
}

async function designTests(
  runtime: AgentRuntime,
  workspace: string,
  plan: PlanDraft,
): Promise<{ readonly testPlan: string }> {
  const result = await runtime.run({
    runId: runIdFor('test-designer', plan),
    agent: 'test-designer',
    instructions: buildDesignTestsPrompt(plan),
    workspace,
  });
  return { testPlan: matchAll(result.stdout, TEST_PLAN_PATTERN).join('\n') || '(no test plan)' };
}

function buildUnderstandPrompt(input: UnderstandInput): string {
  const description = input.issue.body.length > 0 ? input.issue.body : '(no description)';
  const feedback =
    input.feedback.length > 0 ? input.feedback.map((entry) => `- ${entry}`).join('\n') : '(none)';
  return [
    'You are the Lou planner. Understand the ticket below and turn it into a plan.',
    '',
    `Ticket: #${input.issue.number} — ${input.issue.title}`,
    description,
    '',
    'Feedback from the human:',
    feedback,
    '',
    'Reply exactly with:',
    'SUMMARY: <one line>',
    'QUESTION: <one ambiguity>',
    'PLAN_TITLE: <conventional commits title>',
    'PLAN_BRANCH: <feature/...>',
    'PLAN_COMMIT: <conventional commit message>',
    'PLAN_STEP: <concrete implementation step>',
  ].join('\n');
}

function buildDesignTestsPrompt(plan: PlanDraft): string {
  return [
    'You are the Lou test designer. Design the acceptance tests for this plan.',
    '',
    `Plan title: ${plan.title}`,
    plan.steps.length > 0 ? plan.steps.map((step) => `- ${step}`).join('\n') : '(no steps)',
    '',
    'Reply exactly with:',
    'TEST_PLAN: <one test case>',
  ].join('\n');
}

function buildWriteTestsPrompt(plan: PlanDraft): string {
  return [
    'You are the Lou test writer. Write the tests described by the test plan.',
    '',
    `Plan title: ${plan.title}`,
    plan.steps.length > 0 ? plan.steps.map((step) => `- ${step}`).join('\n') : '(no steps)',
    '',
    'Reply exactly with:',
    'CHANGED: <changed file path>',
    'SUMMARY: <one line>',
  ].join('\n');
}

function buildImplementPrompt(plan: PlanDraft): string {
  return [
    'You are the Lou developer. Implement each planned step, respecting the plan.',
    '',
    `Plan title: ${plan.title}`,
    plan.steps.length > 0 ? plan.steps.map((step) => `- ${step}`).join('\n') : '(no steps)',
    '',
    'Reply exactly with:',
    'CHANGED: <changed file path>',
    'SUMMARY: <one line>',
  ].join('\n');
}

function parseUnderstanding(stdout: string): Understanding {
  return {
    summary: matchValue(stdout, SUMMARY_PATTERN) ?? '(no summary)',
    questions: matchAll(stdout, QUESTION_PATTERN),
    plan: {
      title: requiredValue(stdout, TITLE_PATTERN, 'PLAN_TITLE'),
      branchName: requiredValue(stdout, BRANCH_PATTERN, 'PLAN_BRANCH'),
      commitMessage: requiredValue(stdout, COMMIT_PATTERN, 'PLAN_COMMIT'),
      steps: matchAll(stdout, STEP_PATTERN),
    },
  };
}

function requiredValue(stdout: string, pattern: RegExp, label: string): string {
  const value = matchValue(stdout, pattern);
  if (value === null) {
    throw new Error(`planner output must contain ${label}: <value>`);
  }
  return value;
}

function matchValue(stdout: string, pattern: RegExp): string | null {
  return pattern.exec(stdout)?.[1]?.trim() ?? null;
}

function matchAll(stdout: string, pattern: RegExp): readonly string[] {
  const regex = new RegExp(pattern.source, 'gim');
  const values: string[] = [];
  for (const match of stdout.matchAll(regex)) {
    const value = match[1];
    if (value !== undefined) {
      values.push(value.trim());
    }
  }
  return values;
}

function runIdFor(agent: string, plan: PlanDraft): string {
  return `run-${agent}-${plan.title}`;
}
