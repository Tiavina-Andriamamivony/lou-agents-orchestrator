import { mkdtempSync, rmSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { EVENT_TYPES, AuditLog, NodeAuditLog } from '../src/audit-log.ts';
import { event, summarizeRun } from '../src/summary.ts';
import type { AuditEvent } from '../src/types.ts';

const CLOCK = '2026-09-23T20:00:00.000Z';

let dir: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'lou-audit-'));
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

const toolCall = (runId: string): AuditEvent => ({
  timestamp: CLOCK,
  runId,
  event: 'tool_called',
  agent: 'developer',
  tool: 'filesystem.write',
  target: 'src/auth/service.ts',
  risk: 'low',
  result: 'success',
});

function recordedLog(): AuditLog {
  const file = join(dir, 'nested', 'audit.jsonl');
  return new NodeAuditLog({ file, clock: () => CLOCK });
}

describe('AuditEventType list', () => {
  it('covers the minimum event types from the spec', () => {
    for (const type of EVENT_TYPES) {
      expect(type).toMatch(
        /^(agent_started|agent_finished|tool_called|tool_denied|permission_requested|human_approval|human_rejection|file_changed|command_executed|test_started|test_finished|review_started|review_finished|git_commit|git_push|pr_created)$/,
      );
    }
  });
});

describe('NodeAuditLog', () => {
  it('persists an event as one JSON line with the injected timestamp', async () => {
    const log = recordedLog();

    await log.record({
      runId: 'RUN-001',
      agent: 'developer',
      event: 'tool_called',
      tool: 'filesystem.write',
      target: 'src/auth/service.ts',
      risk: 'low',
      result: 'success',
    });

    const raw = readFileSync(join(dir, 'nested', 'audit.jsonl'), 'utf8');
    expect(raw.trim().split('\n')).toEqual([
      '{"timestamp":"2026-09-23T20:00:00.000Z","runId":"RUN-001","agent":"developer","event":"tool_called","tool":"filesystem.write","target":"src/auth/service.ts","risk":"low","result":"success"}',
    ]);
  });

  it('creates the parent directory', async () => {
    await expect(
      recordedLog().record({ runId: 'R', event: 'agent_started', agent: 'planner' }),
    ).resolves.toBeUndefined();
  });

  it('appends events in order', async () => {
    const log = recordedLog();
    await log.record(toolCall('RUN-001'));
    await log.record({
      runId: 'RUN-001',
      event: 'human_approval',
      agent: 'human',
    });

    const events = await log.history();
    expect(events.map((entry) => entry.event)).toEqual(['tool_called', 'human_approval']);
  });

  it('reads back every persisted field', async () => {
    const log = recordedLog();
    const payload = toolCall('RUN-001');
    await log.record(payload);

    const events = await log.history();
    expect(events[0]).toEqual(payload);
  });

  it('throws when an audit line is malformed', async () => {
    const file = join(dir, 'audit.jsonl');
    const log = new NodeAuditLog({ file, clock: () => CLOCK });
    await log.record({ runId: 'RUN-001', event: 'agent_started', agent: 'planner' });
    const { appendFile } = await import('node:fs/promises');
    await appendFile(file, 'not-json\n', 'utf8');

    await expect(log.history()).rejects.toThrow('malformed audit line');
  });

  it('accepts a clock dependency for deterministic timestamps', () => {
    const log = new NodeAuditLog({ file: join(dir, 'a.jsonl'), clock: () => CLOCK });
    expect(log).toBeInstanceOf(NodeAuditLog);
  });
});

describe('summarizeRun', () => {
  it('counts the observable metrics from the spec', () => {
    const summary = summarizeRun([
      event('RUN-001', 'agent_started', { agent: 'planner' }),
      event('RUN-001', 'agent_started', { agent: 'developer' }),
      event('RUN-001', 'tool_called', { tool: 'shell.run' }),
      event('RUN-001', 'tool_denied', { tool: 'shell.run' }),
      event('RUN-001', 'human_approval'),
      event('RUN-001', 'human_rejection'),
      event('RUN-001', 'test_started'),
      event('RUN-001', 'test_finished', { result: 'success' }),
      event('RUN-001', 'git_commit'),
      event('RUN-001', 'git_push'),
      event('RUN-001', 'pr_created'),
    ]);

    expect(summary).toEqual({
      runId: 'RUN-001',
      totalEvents: 11,
      toolCalls: 1,
      deniedCalls: 1,
      humanApprovals: 1,
      humanRejections: 1,
      testsFinished: 1,
      gitCommits: 1,
      gitPushes: 1,
      pullRequestsCreated: 1,
    });
  });

  it('ignores unrelated events when computing metrics', () => {
    const summary = summarizeRun([
      event('RUN-002', 'file_changed', { target: 'src/a.ts' }),
      event('RUN-002', 'review_finished', { result: 'success' }),
    ]);

    expect(summary.totalEvents).toBe(2);
    expect(summary.toolCalls).toBe(0);
    expect(summary.gitCommits).toBe(0);
  });

  it('derives the run id from the events', () => {
    const empty = summarizeRun([event('RUN-003', 'agent_started')]);
    expect(empty.runId).toBe('RUN-003');
  });
});
