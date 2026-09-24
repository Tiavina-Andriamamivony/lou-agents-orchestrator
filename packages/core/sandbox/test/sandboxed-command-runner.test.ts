import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { SandboxedCommandRunner } from '../src/sandboxed-command-runner';
import { allowed, askHuman, denied, RecordingPolicyEngine } from './policy-engine-recorder';
import { RecordingRunner } from './runner-recorder';

let root: string;

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'lou-sandbox-'));
});

afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});

describe('SandboxedCommandRunner', () => {
  it('runs the command when the policy allows it', async () => {
    const inner = new RecordingRunner({
      exitCode: 0,
      stdout: 'out',
      stderr: '',
      interrupted: false,
    });
    const policy = new RecordingPolicyEngine(allowed());
    const sandbox = new SandboxedCommandRunner({ root, runner: inner, policyEngine: policy });

    const result = await sandbox.run('node', ['-e', '1'], { cwd: root });

    expect(result.stdout).toBe('out');
    expect(inner.calls).toHaveLength(1);
    expect(inner.calls[0]?.cwd).toBe(root);
  });

  it('refuses to run outside the sandbox root', async () => {
    const inner = new RecordingRunner({ exitCode: 0, stdout: '', stderr: '', interrupted: false });
    const sandbox = new SandboxedCommandRunner({
      root,
      runner: inner,
      policyEngine: new RecordingPolicyEngine(allowed()),
    });

    await expect(sandbox.run('node', [], { cwd: join(root, '..', 'elsewhere') })).rejects.toThrow(
      'outside the sandbox',
    );
    expect(inner.calls).toHaveLength(0);
  });

  it('rejects a sibling directory of the root', async () => {
    const inner = new RecordingRunner({ exitCode: 0, stdout: '', stderr: '', interrupted: false });
    const sandbox = new SandboxedCommandRunner({
      root,
      runner: inner,
      policyEngine: new RecordingPolicyEngine(allowed()),
    });

    const sibling = mkdtempSync(join(root, '..', 'lou-sandbox-sibling'));
    try {
      await expect(sandbox.run('node', [], { cwd: sibling })).rejects.toThrow(
        'outside the sandbox',
      );
    } finally {
      rmSync(sibling, { recursive: true, force: true });
    }
  });

  it('blocks a denied command without running it', async () => {
    const inner = new RecordingRunner({ exitCode: 0, stdout: '', stderr: '', interrupted: false });
    const policy = new RecordingPolicyEngine(denied());
    const sandbox = new SandboxedCommandRunner({ root, runner: inner, policyEngine: policy });

    await expect(sandbox.run('rm', ['-rf', root], { cwd: root })).rejects.toThrow(
      'denied by policy: destructive operation',
    );
    expect(inner.calls).toHaveLength(0);
  });

  it('blocks a risky command that needs human approval', async () => {
    const inner = new RecordingRunner({ exitCode: 0, stdout: '', stderr: '', interrupted: false });
    const sandbox = new SandboxedCommandRunner({
      root,
      runner: inner,
      policyEngine: new RecordingPolicyEngine(askHuman()),
    });

    await expect(sandbox.run('git', ['push'], { cwd: root })).rejects.toThrow(
      'human approval: risky operation',
    );
    expect(inner.calls).toHaveLength(0);
  });

  it('evaluates the full command line against the policy', async () => {
    const inner = new RecordingRunner({ exitCode: 0, stdout: '', stderr: '', interrupted: false });
    const policy = new RecordingPolicyEngine(allowed());
    const sandbox = new SandboxedCommandRunner({ root, runner: inner, policyEngine: policy });

    await sandbox.run('rm', ['-rf', root], { cwd: root });

    expect(policy.actions).toHaveLength(1);
    expect(policy.actions[0]).toEqual({
      kind: 'shell',
      role: 'agent',
      target: `rm -rf ${root}`,
    });
  });

  it('uses the configured role in the policy action', async () => {
    const inner = new RecordingRunner({ exitCode: 0, stdout: '', stderr: '', interrupted: false });
    const policy = new RecordingPolicyEngine(allowed());
    const sandbox = new SandboxedCommandRunner({
      root,
      role: 'developer',
      runner: inner,
      policyEngine: policy,
    });

    await sandbox.run('node', [], { cwd: root });

    expect(policy.actions[0]?.role).toBe('developer');
  });

  it('asks for human approval on risky commands with the default policy', async () => {
    const sandbox = new SandboxedCommandRunner({ root });

    await expect(
      sandbox.run('git', ['push', '-u', 'origin', 'HEAD'], { cwd: root }),
    ).rejects.toThrow('human approval');
  });

  it('denies destructive commands with the default policy', async () => {
    const sandbox = new SandboxedCommandRunner({ root });

    await expect(sandbox.run('rm', ['-rf', root], { cwd: root })).rejects.toThrow('denied');
  });

  it('allows safe commands with the default policy', async () => {
    const sandbox = new SandboxedCommandRunner({ root });

    const result = await sandbox.run('node', ['-e', 'process.exit(0)'], { cwd: root });

    expect(result.exitCode).toBe(0);
  });
});
