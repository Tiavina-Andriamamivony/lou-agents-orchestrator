import { describe, expect, it } from 'vitest';
import { defaultArticles } from '../src/template.ts';

describe('defaultArticles', () => {
  it('ships the twelve rules from the spec', () => {
    const articles = defaultArticles();

    expect(articles).toHaveLength(12);
    expect(articles[0]).toEqual({
      ordinal: 1,
      statement: 'Never modify production automatically.',
    });
    expect(articles[11]?.statement).toBe('Every architectural decision must be explainable.');
  });

  it('numbers rules consecutively', () => {
    const ordinals = defaultArticles().map((article) => article.ordinal);

    expect(ordinals).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
  });
});
