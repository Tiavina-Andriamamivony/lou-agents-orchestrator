import type { Phase } from './types.ts';

export type WorkflowStatus = 'accepted' | 'rejected' | 'intervention-required';

export interface WorkflowResult {
  readonly status: WorkflowStatus;
  readonly phase: Phase;
  readonly event: string;
  readonly reason?: string;
}

export function rejected(phase: Phase, reason: string): WorkflowResult {
  return { status: 'rejected', phase, event: 'transition:rejected', reason };
}
