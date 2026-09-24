import type { Action } from './action.ts';
import type { PolicyDecision } from './decision.ts';

export interface PolicyEngine {
  evaluate(action: Action): Promise<PolicyDecision>;
}
