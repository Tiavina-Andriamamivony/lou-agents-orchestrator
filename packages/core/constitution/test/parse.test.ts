import { describe, expect, it } from 'vitest';
import { parseConstitution } from '../src/parse.ts';

const DOCUMENT = `# Project Constitution

1. Never modify production automatically.

Some guidance paragraph that must be ignored.

2. Never bypass required tests.
3. Every feature must have acceptance criteria.

- not a numbered rule
11. A rule without adjacent siblings.
`;

describe('parseConstitution', () => {
  it('extracts numbered rules from a markdown document', () => {
    const articles = parseConstitution(DOCUMENT);

    expect(articles).toEqual([
      { ordinal: 1, statement: 'Never modify production automatically.' },
      { ordinal: 2, statement: 'Never bypass required tests.' },
      { ordinal: 3, statement: 'Every feature must have acceptance criteria.' },
      { ordinal: 11, statement: 'A rule without adjacent siblings.' },
    ]);
  });

  it('returns no rules for a document without numbered lines', () => {
    const articles = parseConstitution('# No rules here\n\nplain text\n- bullet\n');

    expect(articles).toEqual([]);
  });

  it('handles irregular spacing around the ordinal', () => {
    const articles = parseConstitution('1.    one  two\tthree');

    expect(articles).toEqual([{ ordinal: 1, statement: 'one  two\tthree' }]);
  });
});
