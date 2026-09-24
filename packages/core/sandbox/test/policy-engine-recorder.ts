import type { Action, PolicyDecision, PolicyEngine } from '@lou/policy-engine';

export const allowed = (): PolicyDecision => ({ decision: 'ALLOW', ruleId: 'cap', reason: 'ok' });
export const denied = (): PolicyDecision => ({
  decision: 'DENY',
  ruleId: 'destructive-0',
  reason: 'destructive operation',
});
export const askHuman = (): PolicyDecision => ({
  decision: 'ASK_HUMAN',
  ruleId: 'risk-3',
  reason: 'risky operation',
});

export class RecordingPolicyEngine implements PolicyEngine {
  readonly actions: Action[] = [];

  constructor(private readonly decision: PolicyDecision) {}

  evaluate(action: Action): Promise<PolicyDecision> {
    this.actions.push(action);
    return Promise.resolve(this.decision);
  }
}
