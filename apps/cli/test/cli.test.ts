import { describe, expect, it } from 'vitest';
import { runCli } from '../src/cli';
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
});
