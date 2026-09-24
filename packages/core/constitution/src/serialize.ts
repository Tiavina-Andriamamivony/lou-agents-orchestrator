import type { Article } from './article.ts';

export const CONSTITUTION_HEADING = '# Project Constitution';

export function serializeConstitution(articles: readonly Article[]): string {
  const lines = articles.map((article) => `${article.ordinal}. ${article.statement}`);
  return [CONSTITUTION_HEADING, '', ...lines, ''].join('\n');
}
