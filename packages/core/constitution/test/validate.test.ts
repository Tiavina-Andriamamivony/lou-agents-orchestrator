import { describe, expect, it } from 'vitest';
import type { Article } from '../src/article.ts';
import { validateArticles } from '../src/validate.ts';

describe('validateArticles', () => {
  it('reports no problems for a clean, ordered set', () => {
    const problems = validateArticles([
      { ordinal: 1, statement: 'First.' },
      { ordinal: 2, statement: 'Second.' },
    ]);

    expect(problems).toEqual([]);
  });

  it('flags empty statements', () => {
    const problems = validateArticles([{ ordinal: 1, statement: '' }]);

    expect(problems[0]).toContain('empty statement');
  });

  it('flags duplicate statements', () => {
    const problems = validateArticles([
      { ordinal: 1, statement: 'Same.' },
      { ordinal: 2, statement: 'Same.' },
    ]);

    expect(problems.join('\n')).toContain('duplicate statement');
  });

  it('flags duplicate ordinals', () => {
    const articles: readonly Article[] = [
      { ordinal: 1, statement: 'First.' },
      { ordinal: 1, statement: 'Duplicated.' },
    ];

    const problems = validateArticles(articles);

    expect(problems.join('\n')).toContain('duplicate ordinal 1');
  });

  it('flags a numbering gap', () => {
    const problems = validateArticles([
      { ordinal: 1, statement: 'First.' },
      { ordinal: 3, statement: 'Skipped two.' },
    ]);

    expect(problems.join('\n')).toContain('ordinal 3');
  });
});
