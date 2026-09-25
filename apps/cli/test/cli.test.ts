import { describe, expect, it } from 'vitest';
import { runCli } from '../src/cli';
import { parseInitJsonFlag } from '../src/init/run-init';
import { createMemoryReader } from './memory-reader';

interface Collector {
  readonly out: string[];
  readonly err: string[];
}

function createCollector(): Collector {
  return { out: [], err: [] };
}

describe('runCli', () => {
  it('runs init and prints the onboarding report', async () => {
    const collector = createCollector();
    const code = await runCli(['init'], {
      reader: createMemoryReader({ 'package.json': '{}' }),
      cwd: '',
      out: (line: string) => collector.out.push(line),
      err: (line: string) => collector.err.push(line),
    });

    expect(code).toBe(0);
    expect(collector.err).toEqual([]);
    expect(collector.out.join('\n')).toContain('Project successfully onboarded.');
  });

  it('runs init --json and prints parseable, stable JSON', async () => {
    const collector = createCollector();
    const code = await runCli(['init', '--json'], {
      reader: createMemoryReader({ 'package.json': '{}' }),
      cwd: '',
      out: (line: string) => collector.out.push(line),
      err: (line: string) => collector.err.push(line),
    });

    expect(code).toBe(0);
    expect(collector.err).toEqual([]);
    const parsed = JSON.parse(collector.out.join('\n')) as {
      readonly packageManager: string | null;
      readonly gitRepository: boolean;
      readonly commitConventions: readonly string[];
      readonly docs: readonly string[];
      readonly ci: boolean;
      readonly constitution: boolean;
    };
    expect(parsed).toEqual({
      packageManager: null,
      gitRepository: false,
      commitConventions: [],
      docs: [],
      ci: false,
      constitution: false,
    });
  });

  it('rejects unknown init flags and stray arguments', async () => {
    const collector = createCollector();
    const code = await runCli(['init', '--json', 'extra'], {
      reader: createMemoryReader({}),
      cwd: '',
      out: (line: string) => collector.out.push(line),
      err: (line: string) => collector.err.push(line),
    });

    expect(code).toBe(1);
    expect(collector.out).toEqual([]);
    expect(collector.err.join('\n')).toContain('Usage: lou init');
  });

  it('rejects an unknown command', async () => {
    const collector = createCollector();
    const code = await runCli(['nope'], {
      reader: createMemoryReader({}),
      cwd: '',
      out: (line: string) => collector.out.push(line),
      err: (line: string) => collector.err.push(line),
    });

    expect(code).toBe(1);
    expect(collector.out).toEqual([]);
    expect(collector.err.join('\n')).toContain('Unknown command: nope');
  });

  it('prints usage when no command is given', async () => {
    const collector = createCollector();
    const code = await runCli([], {
      reader: createMemoryReader({}),
      cwd: '',
      out: (line: string) => collector.out.push(line),
      err: (line: string) => collector.err.push(line),
    });

    expect(code).toBe(1);
    expect(collector.err.join('\n')).toContain('Usage: lou <command>');
  });

  it('prints the lou version', async () => {
    const collector = createCollector();
    const code = await runCli(['--version'], {
      reader: createMemoryReader({}),
      cwd: '',
      out: (line: string) => collector.out.push(line),
      err: (line: string) => collector.err.push(line),
    });

    expect(code).toBe(0);
    expect(collector.out.join('\n')).toMatch(/^lou \d+\.\d+\.\d+$/);
  });

  it('supports the -v version alias', async () => {
    const collector = createCollector();
    const code = await runCli(['-v'], {
      reader: createMemoryReader({}),
      cwd: '',
      out: (line: string) => collector.out.push(line),
      err: (line: string) => collector.err.push(line),
    });

    expect(code).toBe(0);
    expect(collector.out.join('\n')).toMatch(/^lou \d+\.\d+\.\d+$/);
  });

  it.each(['--help', '-h', 'help'])('prints the usage on %s', async (flag) => {
    const collector = createCollector();
    const code = await runCli([flag], {
      reader: createMemoryReader({}),
      cwd: '',
      out: (line: string) => collector.out.push(line),
      err: (line: string) => collector.err.push(line),
    });

    expect(code).toBe(0);
    expect(collector.out.join('\n')).toContain('Usage: lou <command>');
    expect(collector.err).toEqual([]);
  });
});

describe('parseInitJsonFlag', () => {
  it('is false with no flag', () => {
    expect(parseInitJsonFlag(['init'])).toBe(false);
  });

  it('is true with --json', () => {
    expect(parseInitJsonFlag(['init', '--json'])).toBe(true);
  });

  it('rejects unknown or extra arguments', () => {
    expect(parseInitJsonFlag(['init', '--json', 'extra'])).toBeNull();
    expect(parseInitJsonFlag(['init', '--plain'])).toBeNull();
  });
});
