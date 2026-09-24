import type { Article } from './article';

const DEFAULT_STATEMENTS: readonly string[] = [
  'Never modify production automatically.',
  'Never execute destructive database operations without approval.',
  'Never bypass required tests.',
  'Every feature must have acceptance criteria.',
  'Every business rule must be testable.',
  'Follow existing architecture unless an approved decision changes it.',
  'Prefer KISS.',
  'Apply YAGNI.',
  'Apply SOLID where appropriate.',
  'Minimize blast radius.',
  'Avoid unnecessary dependencies.',
  'Every architectural decision must be explainable.',
];

export function defaultArticles(): readonly Article[] {
  return DEFAULT_STATEMENTS.map((statement, index) => ({ ordinal: index + 1, statement }));
}
