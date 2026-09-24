import type { Action } from './action.ts';
import { PatternRule } from './pattern-rule.ts';
import type { PolicyRule } from './rule.ts';

const DEFAULT_RISKY_PATTERNS: readonly RegExp[] = [
  /chmod|chown/,
  /(^|\s)(curl|wget|ssh|scp|telnet)(\s|$)/,
  /(ALTER\s+TABLE|DELETE\s+FROM)/i,
  /git\s+push/,
  /(npm|yarn|pnpm)\s+publish/,
  /\.env|AWS_|API_KEY|SECRET|PASSWORD/i,
];

export function riskRules(
  patterns: readonly RegExp[] = DEFAULT_RISKY_PATTERNS,
): readonly PolicyRule[] {
  return patterns.map(
    (pattern, index) => new PatternRule(`risk-${index}`, 'ASK_HUMAN', 'risky operation', pattern),
  );
}

export function productionRule(): PolicyRule {
  return {
    id: 'production-guard',
    reason: 'production environment requires explicit human approval',
    evaluate: (action: Action) => (action.environment === 'production' ? 'ASK_HUMAN' : null),
  };
}

export function secretRule(): PolicyRule {
  return {
    id: 'secret-guard',
    reason: 'secret access requires explicit human approval',
    evaluate: (action: Action) => (action.kind === 'secret' ? 'ASK_HUMAN' : null),
  };
}

export function configRule(): PolicyRule {
  return {
    id: 'config-guard',
    reason: 'configuration change requires explicit human approval',
    evaluate: (action: Action) => (action.kind === 'config' ? 'ASK_HUMAN' : null),
  };
}
