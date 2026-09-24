import { describe, expect, it } from 'vitest';
import { parseConstitution } from '../src/parse.ts';
import { serializeConstitution } from '../src/serialize.ts';
import { defaultArticles } from '../src/template.ts';

describe('serializeConstitution', () => {
  it('round-trips through parseConstitution', () => {
    const source = defaultArticles();

    const serialized = serializeConstitution(source);
    const parsed = parseConstitution(serialized);

    expect(parsed).toEqual(source);
  });

  it('emits a heading and one numbered line per rule', () => {
    const serialized = serializeConstitution([
      { ordinal: 1, statement: 'First.' },
      { ordinal: 2, statement: 'Second.' },
    ]);

    expect(serialized).toBe('# Project Constitution\n\n1. First.\n2. Second.\n');
    expect(serialized.startsWith('# Project Constitution')).toBe(true);
  });
});
