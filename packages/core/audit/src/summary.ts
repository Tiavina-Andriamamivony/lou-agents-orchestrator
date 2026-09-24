import type { AuditEvent, AuditEventPayload } from './types.ts';

const CLOCK = '2026-09-23T20:00:00.000Z';

export interface RunSummary {
  readonly runId: string;
  readonly totalEvents: number;
  readonly toolCalls: number;
  readonly deniedCalls: number;
  readonly humanApprovals: number;
  readonly humanRejections: number;
  readonly testsFinished: number;
  readonly gitCommits: number;
  readonly gitPushes: number;
  readonly pullRequestsCreated: number;
}

export function event(
  runId: string,
  type: AuditEvent['event'],
  extra: Omit<AuditEventPayload, 'runId' | 'event'> = {},
): AuditEvent {
  return { timestamp: CLOCK, runId, event: type, ...extra };
}

export function summarizeRun(events: readonly AuditEvent[]): RunSummary {
  const runId = events[0]?.runId ?? 'UNKNOWN';
  return {
    runId,
    totalEvents: events.length,
    toolCalls: count(events, 'tool_called'),
    deniedCalls: count(events, 'tool_denied'),
    humanApprovals: count(events, 'human_approval'),
    humanRejections: count(events, 'human_rejection'),
    testsFinished: count(events, 'test_finished'),
    gitCommits: count(events, 'git_commit'),
    gitPushes: count(events, 'git_push'),
    pullRequestsCreated: count(events, 'pr_created'),
  };
}

function count(events: readonly AuditEvent[], type: AuditEvent['event']): number {
  return events.filter((entry) => entry.event === type).length;
}
