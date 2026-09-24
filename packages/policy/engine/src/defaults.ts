import type { RoleCapability } from './capability-rule.ts';
import { capabilityRule } from './capability-rule.ts';
import { destructiveRules } from './destructive-rules.ts';
import { configRule, productionRule, riskRules, secretRule } from './human-rules.ts';
import type { PolicyRule } from './rule.ts';

export function defaultRules(capabilities: readonly RoleCapability[]): readonly PolicyRule[] {
  return [
    ...destructiveRules(),
    ...riskRules(),
    productionRule(),
    secretRule(),
    configRule(),
    capabilityRule(capabilities),
  ];
}
