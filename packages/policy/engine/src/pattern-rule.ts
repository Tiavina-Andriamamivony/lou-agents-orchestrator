import type { Action } from './action.ts';
import type { Decision } from './decision.ts';
import type { PolicyRule } from './rule.ts';

export class PatternRule implements PolicyRule {
  constructor(
    readonly id: string,
    private readonly verdict: Decision,
    readonly reason: string,
    private readonly pattern: RegExp,
  ) {}

  evaluate(action: Action): Decision | null {
    return this.pattern.test(action.target) ? this.verdict : null;
  }
}
