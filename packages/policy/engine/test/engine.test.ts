import { describe, expect, it } from 'vitest';
import type { Action } from '../src/action';
import type { Decision, PolicyDecision } from '../src/decision';
import type { PolicyRule } from '../src/rule';
import { DefaultPolicyEngine } from '../src/default-policy-engine';

function directRule(decision: Decision): PolicyRule {
  return {
    id: `direct-${decision}`,
    reason: `direct rule ${decision}`,
    evaluate: (action) => (action.kind === 'shell' ? decision : null),
  };
}

const SHELL_ACTION: Action = { kind: 'shell', role: 'developer', target: 'npm test' };

describe('DefaultPolicyEngine', () => {
  it('returns the decision of the first matching rule', async () => {
    const engine = new DefaultPolicyEngine([directRule('ASK_HUMAN'), directRule('ALLOW')]);

    const decision = await engine.evaluate(SHELL_ACTION);

    expect(decision.decision).toBe('ASK_HUMAN');
    expect(decision.ruleId).toBe('direct-ASK_HUMAN');
  });

  it('returns a full decision with rule id and reason', async () => {
    const engine = new DefaultPolicyEngine([directRule('ALLOW')]);

    const decision: PolicyDecision = await engine.evaluate(SHELL_ACTION);

    expect(decision).toEqual({
      decision: 'ALLOW',
      ruleId: 'direct-ALLOW',
      reason: 'direct rule ALLOW',
    });
  });

  it('fails closed when no rule matches', async () => {
    const engine = new DefaultPolicyEngine([directRule('ALLOW')]);
    const fsAction: Action = { kind: 'filesystem', role: 'developer', target: '/repo/src' };

    const decision = await engine.evaluate(fsAction);

    expect(decision.decision).toBe('DENY');
    expect(decision.ruleId).toBe('default-fail-closed');
  });

  it('rejects an action with an empty target', async () => {
    const engine = new DefaultPolicyEngine([]);

    await expect(engine.evaluate({ ...SHELL_ACTION, target: '' })).rejects.toThrow('target');
  });

  it('rejects an action with an empty role', async () => {
    const engine = new DefaultPolicyEngine([]);

    await expect(engine.evaluate({ ...SHELL_ACTION, role: '' })).rejects.toThrow('role');
  });
});
