import type { ApprovalDecision, ApprovalRequest, HumanKeeper } from '@lou/orchestrator';

interface TerminalKeeperOptions {
  readonly ask: (question: string) => Promise<string>;
  readonly out: (line: string) => void;
}

export function createTerminalKeeper(options: TerminalKeeperOptions): HumanKeeper {
  return {
    async askClarifications(questions: readonly string[]): Promise<readonly string[]> {
      const answers: string[] = [];
      for (const question of questions) {
        answers.push(await options.ask(`${question} `));
      }
      return answers;
    },
    async decide(request: ApprovalRequest): Promise<ApprovalDecision> {
      options.out('');
      options.out(`${request.kind === 'plan' ? 'Plan' : 'Review'} gate`);
      options.out(request.subject);
      options.out(request.details);
      const answer = await options.ask(`Approve ${request.kind}? [y/N] `);
      return { approved: isApproval(answer) };
    },
  };
}

function isApproval(answer: string): boolean {
  return /^y(?:es)?$/i.test(answer.trim());
}
