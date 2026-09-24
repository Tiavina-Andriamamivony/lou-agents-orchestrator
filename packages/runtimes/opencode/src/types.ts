import type { CommandResult } from './command-runner';

export interface AgentRunInput {
  readonly runId: string;
  readonly agent?: string;
  readonly model?: string;
  readonly instructions: string;
  readonly workspace: string;
}

export interface AgentRunResult extends CommandResult {
  readonly runId: string;
}

export interface AgentStatus {
  readonly runId: string;
  readonly running: boolean;
  readonly finished: boolean;
  readonly interrupted?: boolean;
  readonly exitCode?: number;
}
