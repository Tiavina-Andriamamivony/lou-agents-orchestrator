import { appendFile, mkdir, readFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import type { AuditEvent, AuditEventPayload, AuditEventType } from './types.ts';

export const EVENT_TYPES: readonly AuditEventType[] = [
  'agent_started',
  'agent_finished',
  'tool_called',
  'tool_denied',
  'permission_requested',
  'human_approval',
  'human_rejection',
  'file_changed',
  'command_executed',
  'test_started',
  'test_finished',
  'review_started',
  'review_finished',
  'git_commit',
  'git_push',
  'pr_created',
];

export interface AuditLog {
  record(payload: AuditEventPayload): Promise<void>;
  history(): Promise<readonly AuditEvent[]>;
}

export interface NodeAuditLogOptions {
  readonly file: string;
  readonly clock?: () => string;
}

export class NodeAuditLog implements AuditLog {
  private readonly file: string;
  private readonly clock: () => string;

  constructor(options: NodeAuditLogOptions) {
    this.file = options.file;
    this.clock = options.clock ?? defaultClock;
  }

  async record(payload: AuditEventPayload): Promise<void> {
    const event: AuditEvent = { timestamp: this.clock(), ...payload };
    await mkdir(dirname(this.file), { recursive: true });
    await appendFile(this.file, `${JSON.stringify(event)}\n`, 'utf8');
  }

  async history(): Promise<readonly AuditEvent[]> {
    let content: string;
    try {
      content = await readFile(this.file, 'utf8');
    } catch {
      return [];
    }
    return content
      .split('\n')
      .filter((line) => line.length > 0)
      .map((line) => parseLine(line));
  }
}

function parseLine(line: string): AuditEvent {
  try {
    return JSON.parse(line) as AuditEvent;
  } catch {
    throw new Error(`malformed audit line: ${line}`);
  }
}

function defaultClock(): string {
  return new Date().toISOString();
}
