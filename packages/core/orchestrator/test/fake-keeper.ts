import type { ApprovalRequest, HumanKeeper } from '../src/types';

interface KeeperOptions {
  readonly plan: readonly boolean[];
  readonly review: readonly boolean[];
  readonly answers: readonly string[];
}

interface KeeperState {
  readonly planRequests: readonly ApprovalRequest[];
  readonly reviewRequests: readonly ApprovalRequest[];
  readonly questionsAsked: readonly string[];
}

interface KeeperSpy {
  readonly keeper: HumanKeeper;
  readonly state: KeeperState;
}

export function createKeeper(options: KeeperOptions): KeeperSpy {
  const planDecisions = [...options.plan];
  const reviewDecisions = [...options.review];
  const answers = options.answers;
  const planRequests: ApprovalRequest[] = [];
  const reviewRequests: ApprovalRequest[] = [];
  const questionsAsked: string[] = [];
  const keeper: HumanKeeper = {
    askClarifications(questions: readonly string[]): Promise<readonly string[]> {
      questionsAsked.push(...questions);
      return Promise.resolve(answers.slice());
    },
    decide(request: ApprovalRequest): Promise<{ approved: boolean; comment?: string }> {
      if (request.kind === 'plan') {
        planRequests.push(request);
      } else {
        reviewRequests.push(request);
      }
      const approved =
        request.kind === 'plan' ? popDefault(planDecisions) : popDefault(reviewDecisions);
      return Promise.resolve({ approved });
    },
  };
  return {
    keeper,
    state: { planRequests, reviewRequests, questionsAsked },
  };
}

function popDefault(values: boolean[]): boolean {
  return values.shift() ?? true;
}
