import type { CommandResult, CommandRunner, CommandRunOptions } from '@lou/command-runner';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { NodeTestRunner } from '../src/node-test-runner.ts';

interface RecordedCall {
  readonly command: string;
  readonly args: readonly string[];
  readonly cwd: string;
}

class RecordingRunner implements CommandRunner {
  readonly calls: RecordedCall[] = [];

  constructor(private readonly result: CommandResult) {}

  run(
    command: string,
    args: readonly string[],
    options: CommandRunOptions,
  ): Promise<CommandResult> {
    this.calls.push({ command, args, cwd: options.cwd });
    return Promise.resolve(this.result);
  }
}

let dir: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'lou-tests-'));
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

describe('NodeTestRunner', () => {
  it('defaults to pnpm test and reports a pass on zero exit', async () => {
    const fake = new RecordingRunner({ exitCode: 0, stdout: '', stderr: '', interrupted: false });
    const adapter = new NodeTestRunner({ runner: fake });

    const result = await adapter.run({ cwd: dir });

    expect(fake.calls).toHaveLength(1);
    expect(fake.calls[0]?.command).toBe('pnpm');
    expect(fake.calls[0]?.args).toEqual(['test']);
    expect(result.passed).toBe(true);
  });

  it('forwards the working directory to the underlying runner', async () => {
    const fake = new RecordingRunner({ exitCode: 0, stdout: '', stderr: '', interrupted: false });
    const adapter = new NodeTestRunner({ runner: fake });

    await adapter.run({ cwd: dir });

    expect(fake.calls[0]?.cwd).toBe(dir);
  });

  it('reports a failure when the run interrupted even on a zero exit code', async () => {
    const fake = new RecordingRunner({ exitCode: 0, stdout: '', stderr: '', interrupted: true });
    const adapter = new NodeTestRunner({ runner: fake });

    const result = await adapter.run({ cwd: dir });

    expect(result.passed).toBe(false);
  });

  it('runs a custom command with extra arguments', async () => {
    const adapter = new NodeTestRunner();

    const result = await adapter.run({
      cwd: dir,
      command: 'node',
      args: ['-e', 'process.exit(0)'],
    });

    expect(result.passed).toBe(true);
  });

  it('reports a failure when tests exit non-zero', async () => {
    const adapter = new NodeTestRunner();

    const result = await adapter.run({
      cwd: dir,
      command: 'node',
      args: ['-e', 'process.stdout.write("boom"); process.exit(3)'],
    });

    expect(result.passed).toBe(false);
    expect(result.exitCode).toBe(3);
    expect(result.stdout).toContain('boom');
  });

  it('captures stdout of a passing run', async () => {
    const adapter = new NodeTestRunner();

    const result = await adapter.run({
      cwd: dir,
      command: 'node',
      args: ['-e', 'process.stdout.write("hello")'],
    });

    expect(result.stdout).toContain('hello');
    expect(result.passed).toBe(true);
  });

  it('marks the run as interrupted when the timeout expires', async () => {
    const adapter = new NodeTestRunner();

    const result = await adapter.run({
      cwd: dir,
      command: 'node',
      args: ['-e', 'setTimeout(() => {}, 10_000)'],
      timeoutMs: 40,
    });

    expect(result.interrupted).toBe(true);
    expect(result.passed).toBe(false);
  });

  it('marks the run as interrupted when aborted', async () => {
    const adapter = new NodeTestRunner();
    const controller = new AbortController();
    const promise = adapter.run({
      cwd: dir,
      command: 'node',
      args: ['-e', 'setTimeout(() => {}, 10_000)'],
      signal: controller.signal,
    });

    setTimeout(() => {
      controller.abort();
    }, 50);

    const result = await promise;
    expect(result.interrupted).toBe(true);
    expect(result.passed).toBe(false);
  });

  it('rejects when the command does not exist', async () => {
    const adapter = new NodeTestRunner();

    await expect(adapter.run({ cwd: dir, command: 'no-such-binary-xyz' })).rejects.toBeInstanceOf(
      Error,
    );
  });

  it('rejects when the working directory does not exist', async () => {
    const adapter = new NodeTestRunner();

    await expect(adapter.run({ cwd: join(dir, 'missing') })).rejects.toBeInstanceOf(Error);
  });
});
