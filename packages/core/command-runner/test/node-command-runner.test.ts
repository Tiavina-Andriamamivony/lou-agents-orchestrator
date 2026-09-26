import { describe, expect, it } from 'vitest';
import { NodeCommandRunner } from '../src/node-command-runner.ts';

const runner = new NodeCommandRunner();
const cwd = process.cwd();

describe('NodeCommandRunner', () => {
  it('captures stdout of a successful command', async () => {
    const result = await runner.run('node', ['-e', 'process.stdout.write("hi")'], { cwd });

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toBe('hi');
    expect(result.interrupted).toBe(false);
  });

  it('captures stderr and a non-zero exit code', async () => {
    const result = await runner.run(
      'node',
      ['-e', 'process.stderr.write("boom"); process.exit(3)'],
      { cwd },
    );

    expect(result.exitCode).toBe(3);
    expect(result.stderr).toContain('boom');
  });

  it('marks the run as interrupted when the timeout expires', async () => {
    const result = await runner.run('node', ['-e', 'setTimeout(() => {}, 10_000)'], {
      cwd,
      timeoutMs: 40,
    });

    expect(result.interrupted).toBe(true);
    expect(result.exitCode).not.toBe(0);
  });

  it('rejects when the binary does not exist', async () => {
    await expect(runner.run('no-such-binary-xyz', [], { cwd })).rejects.toBeInstanceOf(Error);
  });

  it('passes extra environment variables to the child process', async () => {
    const result = await runner.run(
      'node',
      ['-e', 'process.stdout.write(process.env.LOU_SMOKE_ENV ?? "absent")'],
      { cwd, env: { LOU_SMOKE_ENV: 'present' } },
    );

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toBe('present');
  });
});
