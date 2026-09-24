import type { RoleCapability } from './capability-rule';
import { capabilityRule } from './capability-rule';
import { destructiveRules } from './destructive-rules';
import { configRule, productionRule, riskRules, secretRule } from './human-rules';
import type { PolicyRule } from './rule';

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
