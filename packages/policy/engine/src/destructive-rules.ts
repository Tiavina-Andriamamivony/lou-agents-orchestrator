import { PatternRule } from './pattern-rule';
import type { PolicyRule } from './rule';

const DEFAULT_DESTRUCTIVE_PATTERNS: readonly RegExp[] = [
  /rm\s+-[a-z]*[rf][a-z]*/,
  /git\s+push\s+[^\n|]*--force/,
  /git\s+reset\s+--hard/,
  /mkfs\.[a-z0-9]+/,
  /dd\s+if=[^\s]+.*\sof=/,
  /(^|\s)(shutdown|reboot|halt)(\s|$)/,
  /(DROP\s+TABLE|TRUNCATE\s+TABLE)/i,
];

export function destructiveRules(
  patterns: readonly RegExp[] = DEFAULT_DESTRUCTIVE_PATTERNS,
): readonly PolicyRule[] {
  return patterns.map(
    (pattern, index) =>
      new PatternRule(`destructive-${index}`, 'DENY', 'destructive operation', pattern),
  );
}
