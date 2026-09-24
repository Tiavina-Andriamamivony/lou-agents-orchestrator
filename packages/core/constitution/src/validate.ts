import type { Article } from './article.ts';

export function validateArticles(articles: readonly Article[]): readonly string[] {
  const problems: string[] = [];
  let previousOrdinal = 0;
  const seenStatements = new Set<string>();
  const seenOrdinals = new Set<number>();
  for (const article of articles) {
    if (article.statement.length === 0) {
      problems.push(`article ${article.ordinal} has an empty statement`);
    }
    if (seenOrdinals.has(article.ordinal)) {
      problems.push(`duplicate ordinal ${article.ordinal}`);
    }
    if (seenStatements.has(article.statement)) {
      problems.push(`duplicate statement "${article.statement}"`);
    }
    if (article.ordinal !== previousOrdinal + 1) {
      problems.push(`ordinal ${article.ordinal} does not follow ${previousOrdinal}`);
    }
    seenOrdinals.add(article.ordinal);
    seenStatements.add(article.statement);
    previousOrdinal = article.ordinal;
  }
  return problems;
}
