import type { AuditEvent, AuditEventPayload, AuditLog } from '@lou/audit';

const CLOCK = '2026-09-23T20:00:00.000Z';

interface AuditSpy {
  readonly log: AuditLog;
  events(): readonly AuditEvent[];
  types(): readonly AuditEventTypeSnapshot[];
}

type AuditEventTypeSnapshot = AuditEvent['event'];

export function createAuditSpy(): AuditSpy {
  const events: AuditEvent[] = [];
  const log: AuditLog = {
    record(payload: AuditEventPayload): Promise<void> {
      events.push({ ...payload, timestamp: CLOCK });
      return Promise.resolve();
    },
    history(): Promise<readonly AuditEvent[]> {
      return Promise.resolve(events.slice());
    },
  };
  return {
    log,
    events: () => events.slice(),
    types: () => events.map((entry) => entry.event),
  };
}
