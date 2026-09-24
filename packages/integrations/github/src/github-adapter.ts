export interface GitHubIssue {
  readonly number: number;
  readonly title: string;
  readonly body: string;
  readonly state: 'OPEN' | 'CLOSED';
}

export interface PullRequestInput {
  readonly title: string;
  readonly body: string;
}

export interface PullRequest {
  readonly number: number;
  readonly url: string;
  readonly title: string;
}

export interface GitHubAdapter {
  getIssue(number: number): Promise<GitHubIssue>;
  createPullRequest(input: PullRequestInput): Promise<PullRequest>;
}
