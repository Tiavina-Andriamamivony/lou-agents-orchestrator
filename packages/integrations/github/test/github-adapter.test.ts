import type { CommandResult, CommandRunner, CommandRunOptions } from '@lou/command-runner';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { NodeGitHubAdapter } from '../src/node-github-adapter.ts';

interface RecordedCall {
  readonly command: string;
  readonly args: readonly string[];
  readonly cwd: string;
}

const issueJson = (number: number, state: 'OPEN' | 'CLOSED'): string =>
  JSON.stringify({
    number,
    title: `Issue ${number}`,
    body: 'body',
    state,
  });

class RecordingRunner implements CommandRunner {
  readonly calls: RecordedCall[] = [];
  results: CommandResult[] = [];

  constructor(...results: CommandResult[]) {
    this.results = results;
  }

  run(
    command: string,
    args: readonly string[],
    options: CommandRunOptions,
  ): Promise<CommandResult> {
    this.calls.push({ command, args, cwd: options.cwd });
    const result = this.results.shift();
    if (result === undefined) {
      return Promise.resolve({ exitCode: 0, stdout: '', stderr: '', interrupted: false });
    }
    return Promise.resolve(result);
  }
}

const ok = (stdout: string): CommandResult => ({
  exitCode: 0,
  stdout,
  stderr: '',
  interrupted: false,
});

const failed = (stderr = 'boom'): CommandResult => ({
  exitCode: 1,
  stdout: '',
  stderr,
  interrupted: false,
});

let dir: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'lou-gh-'));
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

describe('NodeGitHubAdapter', () => {
  it('fetches an issue through gh', async () => {
    const fake = new RecordingRunner(ok(issueJson(42, 'OPEN')));
    const adapter = new NodeGitHubAdapter({ root: dir, runner: fake });

    const issue = await adapter.getIssue(42);

    expect(issue).toEqual({ number: 42, title: 'Issue 42', body: 'body', state: 'OPEN' });
    expect(fake.calls[0]?.command).toBe('gh');
    expect(fake.calls[0]?.args).toEqual([
      'issue',
      'view',
      '42',
      '--json',
      'number,title,body,state',
    ]);
    expect(fake.calls[0]?.cwd).toBe(dir);
  });

  it('maps a closed issue state', async () => {
    const fake = new RecordingRunner(ok(issueJson(7, 'CLOSED')));
    const adapter = new NodeGitHubAdapter({ root: dir, runner: fake });

    const issue = await adapter.getIssue(7);

    expect(issue.state).toBe('CLOSED');
  });

  it('rejects a non-positive issue number', async () => {
    const fake = new RecordingRunner();
    const adapter = new NodeGitHubAdapter({ root: dir, runner: fake });

    await expect(adapter.getIssue(0)).rejects.toThrow('issue number');
    await expect(adapter.getIssue(-1)).rejects.toThrow('issue number');
    expect(fake.calls).toHaveLength(0);
  });

  it('throws with the gh error when gh fails', async () => {
    const fake = new RecordingRunner(failed('caught'));
    const adapter = new NodeGitHubAdapter({ root: dir, runner: fake });

    await expect(adapter.getIssue(1)).rejects.toThrow('caught');
  });

  it('throws when gh returns unparseable output', async () => {
    const fake = new RecordingRunner(ok('not json'));
    const adapter = new NodeGitHubAdapter({ root: dir, runner: fake });

    await expect(adapter.getIssue(1)).rejects.toThrow();
  });

  it('creates a pull request and parses its url', async () => {
    const url = 'https://github.com/acme/app/pull/123';
    const fake = new RecordingRunner(ok(url));
    const adapter = new NodeGitHubAdapter({ root: dir, runner: fake });

    const pr = await adapter.createPullRequest({ title: 'feat: x', body: 'body' });

    expect(pr.url).toBe(url);
    expect(pr.number).toBe(123);
    expect(pr.title).toBe('feat: x');
    expect(fake.calls[0]?.command).toBe('gh');
    expect(fake.calls[0]?.args).toEqual(['pr', 'create', '--title', 'feat: x', '--body', 'body']);
  });

  it('rejects creating a pull request with an empty title', async () => {
    const fake = new RecordingRunner();
    const adapter = new NodeGitHubAdapter({ root: dir, runner: fake });

    await expect(adapter.createPullRequest({ title: '  ', body: 'body' })).rejects.toThrow('title');
    expect(fake.calls).toHaveLength(0);
  });

  it('rejects creating a pull request with an empty body', async () => {
    const fake = new RecordingRunner();
    const adapter = new NodeGitHubAdapter({ root: dir, runner: fake });

    await expect(adapter.createPullRequest({ title: 'feat: x', body: '' })).rejects.toThrow('body');
    expect(fake.calls).toHaveLength(0);
  });

  it('throws when the pull request url cannot be parsed', async () => {
    const fake = new RecordingRunner(ok('unexpected output'));
    const adapter = new NodeGitHubAdapter({ root: dir, runner: fake });

    await expect(adapter.createPullRequest({ title: 'feat: x', body: 'body' })).rejects.toThrow(
      'url',
    );
  });

  it('throws with the gh error when pr creation fails', async () => {
    const fake = new RecordingRunner(failed('branch already exists'));
    const adapter = new NodeGitHubAdapter({ root: dir, runner: fake });

    await expect(adapter.createPullRequest({ title: 'feat: x', body: 'body' })).rejects.toThrow(
      'branch already exists',
    );
  });
});
