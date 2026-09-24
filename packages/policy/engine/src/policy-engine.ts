import type { Action } from './action';
import type { PolicyDecision } from './decision';

export interface PolicyEngine {
  evaluate(action: Action): Promise<PolicyDecision>;
}
