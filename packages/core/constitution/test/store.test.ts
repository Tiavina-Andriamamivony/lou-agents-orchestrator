import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { NodeConstitutionStore } from '../src/store';
import { defaultArticles } from '../src/template';

describe('NodeConstitutionStore', () => {
  let root: string;

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'add-constitution-'));
  });

  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
  });

  it('reports an absent constitution without failing', async () => {
    const store = new NodeConstitutionStore(root);

    const file = await store.load();

    expect(file.exists).toBe(false);
    expect(file.articles).toEqual([]);
  });

  it('persists the constitution under .add/constitution.md', async () => {
    const store = new NodeConstitutionStore(root);

    const savedPath = await store.save(defaultArticles());

    expect(savedPath).toBe(join(root, '.add', 'constitution.md'));
  });

  it('loads back what it saved', async () => {
    const store = new NodeConstitutionStore(root);
    await store.save(defaultArticles());

    const file = await store.load();

    expect(file.exists).toBe(true);
    expect(file.articles).toEqual(defaultArticles());
  });
});
