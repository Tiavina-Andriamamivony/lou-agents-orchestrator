export const DECISIONS = ['ALLOW', 'DENY', 'ASK_HUMAN'] as const;

export type Decision = (typeof DECISIONS)[number];

export interface PolicyDecision {
  readonly decision: Decision;
  readonly ruleId: string;
  readonly reason: string;
}
