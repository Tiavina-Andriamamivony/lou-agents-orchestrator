import { describe, expect, it } from 'vitest';
import { analyzeProject } from '../src/init/analyze-project';
import { createMemoryReader, MemoryFileSystem } from './memory-reader';

const FULL_PROJECT: MemoryFileSystem = {
  'package.json': JSON.stringify({
    name: 'demo',
    packageManager: 'pnpm@10.0.0',
    dependencies: { next: '14.0.0', react: '18.0.0' },
    devDependencies: { typescript: '5.6.0', vitest: '2.1.0', '@playwright/test': '1.0.0' },
  }),
  'pnpm-lock.yaml': '',
  'README.md': '# Demo',
  '.github/workflows/ci.yml': 'name: CI',
  '.git': '',
  '.add/constitution.md': '# Constitution',
  'commitlint.config.js': 'module.exports = {}',
};

describe('analyzeProject', () => {
  it('detects the full stack of a typed pnpm project', async () => {
    const report = await analyzeProject({ reader: createMemoryReader(FULL_PROJECT), root: '' });

    expect(report.packageManager).toBe('pnpm');
    expect(report.languages).toEqual(['TypeScript']);
    expect(report.frameworks).toEqual(['Next.js', 'React']);
    expect(report.testing).toEqual(['vitest', 'Playwright']);
    expect(report.docs).toEqual(['README.md']);
    expect(report.hasCI).toBe(true);
    expect(report.isGitRepository).toBe(true);
    expect(report.commitConventions).toEqual(['conventional commits']);
    expect(report.constitutionPresent).toBe(true);
  });

  it('reports empty defaults for an empty directory', async () => {
    const report = await analyzeProject({ reader: createMemoryReader({}), root: '' });

    expect(report.packageManager).toBeNull();
    expect(report.languages).toEqual([]);
    expect(report.frameworks).toEqual([]);
    expect(report.testing).toEqual([]);
    expect(report.docs).toEqual([]);
    expect(report.hasCI).toBe(false);
    expect(report.isGitRepository).toBe(false);
    expect(report.commitConventions).toEqual([]);
    expect(report.constitutionPresent).toBe(false);
  });

  it('tolerates an unparsable package.json', async () => {
    const report = await analyzeProject({
      reader: createMemoryReader({ 'package.json': '{oops' }),
      root: '',
    });

    expect(report.packageManager).toBeNull();
    expect(report.frameworks).toEqual([]);
  });

  it('infers the package manager from a lockfile over the manifest field', async () => {
    const report = await analyzeProject({
      reader: createMemoryReader({
        'package.json': JSON.stringify({ packageManager: 'npm@9.0.0' }),
        'yarn.lock': '',
      }),
      root: '',
    });

    expect(report.packageManager).toBe('yarn');
  });

  it('infers the package manager from the manifest when no lockfile exists', async () => {
    const report = await analyzeProject({
      reader: createMemoryReader({
        'package.json': JSON.stringify({ packageManager: 'pnpm@10.0.0' }),
      }),
      root: '',
    });

    expect(report.packageManager).toBe('pnpm');
  });

  it('detects testing tools referenced only from a test script', async () => {
    const report = await analyzeProject({
      reader: createMemoryReader({
        'package.json': JSON.stringify({ scripts: { test: 'vitest run' } }),
      }),
      root: '',
    });

    expect(report.testing).toEqual(['vitest']);
  });

  it('detects GitLab CI alongside GitHub Actions', async () => {
    const report = await analyzeProject({
      reader: createMemoryReader({ '.gitlab-ci.yml': 'image: node' }),
      root: '',
    });

    expect(report.hasCI).toBe(true);
  });
});
