import type { Action } from './action';
import type { Decision } from './decision';

export interface PolicyRule {
  readonly id: string;
  readonly reason: string;
  evaluate(action: Action): Decision | null;
}
