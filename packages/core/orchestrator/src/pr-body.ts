import type { GitHubIssue } from '@lou/github';
import type { PlanDraft, ReviewNote } from './types';

export interface PullRequestBodyInput {
  readonly issue: GitHubIssue;
  readonly plan: PlanDraft;
  readonly implementationSummary: string;
  readonly testReport: string;
  readonly review: ReviewNote | null;
}

export function buildPullRequestBody(input: PullRequestBodyInput): string {
  const steps = input.plan.steps.map((step, index) => `${index + 1}. ${step}`);
  const review =
    input.review === null ? '(no review)' : `${input.review.verdict}: ${input.review.reason}`;
  const summary =
    input.implementationSummary.length > 0 ? input.implementationSummary : '(no summary)';
  return [
    '## Ticket',
    `#${input.issue.number} — ${input.issue.title}`,
    '',
    '## Summary',
    summary,
    '',
    '## Plan',
    ...(steps.length > 0 ? steps : ['(no steps)']),
    '',
    '## Tests',
    input.testReport,
    '',
    '## Review',
    review,
  ].join('\n');
}
