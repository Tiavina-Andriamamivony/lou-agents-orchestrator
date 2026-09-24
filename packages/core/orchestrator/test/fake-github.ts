import type { GitHubAdapter, GitHubIssue, PullRequest, PullRequestInput } from '@lou/github';

interface GitHubSpy {
  readonly github: GitHubAdapter;
  readonly created: readonly PullRequestInput[];
  readonly issue: GitHubIssue;
}

export function createGitHubSpy(issue: GitHubIssue): GitHubSpy {
  const created: PullRequestInput[] = [];
  const github: GitHubAdapter = {
    getIssue(): Promise<GitHubIssue> {
      return Promise.resolve(issue);
    },
    createPullRequest(input: PullRequestInput): Promise<PullRequest> {
      created.push(input);
      return Promise.resolve({
        number: 42,
        url: `https://hub.example/pr/${created.length}`,
        title: input.title,
      });
    },
  };
  return { github, created, issue };
}
