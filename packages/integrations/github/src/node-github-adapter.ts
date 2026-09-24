import type { CommandResult, CommandRunner } from '@lou/command-runner';
import { NodeCommandRunner } from '@lou/command-runner';
import type {
  GitHubAdapter,
  GitHubIssue,
  PullRequest,
  PullRequestInput,
} from './github-adapter.ts';

export interface NodeGitHubAdapterOptions {
  readonly root: string;
  readonly runner?: CommandRunner;
}

export class NodeGitHubAdapter implements GitHubAdapter {
  private readonly root: string;
  private readonly runner: CommandRunner;

  constructor(options: NodeGitHubAdapterOptions) {
    this.root = options.root;
    this.runner = options.runner ?? new NodeCommandRunner();
  }

  async getIssue(number: number): Promise<GitHubIssue> {
    if (!Number.isInteger(number) || number <= 0) {
      throw new Error(`issue number must be a positive integer, got ${number}`);
    }
    const result = await this.gh([
      'issue',
      'view',
      String(number),
      '--json',
      'number,title,body,state',
    ]);
    return parseIssue(result.stdout);
  }

  async createPullRequest(input: PullRequestInput): Promise<PullRequest> {
    assertNonEmpty(input.title, 'pull request title');
    assertNonEmpty(input.body, 'pull request body');
    const result = await this.gh(['pr', 'create', '--title', input.title, '--body', input.body]);
    return parsePullRequest(result.stdout, input.title);
  }

  private async gh(args: readonly string[]): Promise<CommandResult> {
    const result = await this.runner.run('gh', args, { cwd: this.root });
    if (result.exitCode !== 0) {
      throw new Error(`gh ${args[0] ?? 'command'} failed: ${result.stderr.trim()}`);
    }
    return result;
  }
}

function parseIssue(stdout: string): GitHubIssue {
  let parsed: unknown;
  try {
    parsed = JSON.parse(stdout);
  } catch (error) {
    throw new Error('gh issue view returned unparseable output', { cause: error });
  }
  if (!isIssueLike(parsed)) {
    throw new Error('gh issue view returned an unexpected payload');
  }
  return {
    number: parsed.number,
    title: parsed.title,
    body: parsed.body,
    state: parsed.state,
  };
}

function parsePullRequest(stdout: string, title: string): PullRequest {
  const url = stdout.trim();
  const match = /\/pull\/(\d+)\s*$/.exec(url);
  const number = match?.[1] === undefined ? Number.NaN : Number(match[1]);
  if (match === null || match[1] === undefined || !Number.isInteger(number) || number <= 0) {
    throw new Error(`unable to parse pull request url from gh pr create output: ${url}`);
  }
  return { number, url, title };
}

function isIssueLike(value: unknown): value is GitHubIssue {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const candidate = value as Partial<GitHubIssue>;
  return (
    typeof candidate.number === 'number' &&
    typeof candidate.title === 'string' &&
    typeof candidate.body === 'string' &&
    (candidate.state === 'OPEN' || candidate.state === 'CLOSED')
  );
}

function assertNonEmpty(value: string, what: string): void {
  if (value.trim().length === 0) {
    throw new Error(`${what} must not be empty`);
  }
}
