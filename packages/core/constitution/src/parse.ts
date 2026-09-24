import type { Article } from './article.ts';

const ARTICLE_PATTERN = /^(\d+)\.\s+(.+)$/;

export function parseConstitution(markdown: string): readonly Article[] {
  const articles: Article[] = [];
  for (const line of markdown.split('\n')) {
    const match = ARTICLE_PATTERN.exec(line);
    if (match !== null && match[1] !== undefined && match[2] !== undefined) {
      articles.push({ ordinal: Number.parseInt(match[1], 10), statement: match[2].trim() });
    }
  }
  return articles;
}
