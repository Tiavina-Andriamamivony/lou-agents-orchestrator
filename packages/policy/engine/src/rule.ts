import type { Action } from './action.ts';
import type { Decision } from './decision.ts';

export interface PolicyRule {
  readonly id: string;
  readonly reason: string;
  evaluate(action: Action): Decision | null;
}
