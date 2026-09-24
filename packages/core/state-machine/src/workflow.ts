import type { Phase, Command } from './types';
import { PHASES, TERMINAL_PHASES } from './phases';
import { findTransitionRule } from './transitions';
import type { WorkflowResult } from './result';
import { rejected } from './result';

const DEFAULT_ITERATION_LIMIT = 5;

export class Workflow {
  private currentPhase: Phase = PHASES.TICKET_RECEIVED;
  private readonly iterationsUsed = new Map<Phase, number>();
  private readonly history: Phase[] = [PHASES.TICKET_RECEIVED];

  get phase(): Phase {
    return this.currentPhase;
  }

  get isTerminal(): boolean {
    return TERMINAL_PHASES.has(this.currentPhase);
  }

  get transitionHistory(): readonly Phase[] {
    return this.history.slice();
  }

  apply(command: Command): WorkflowResult {
    if (this.isTerminal) {
      return rejected(this.currentPhase, `workflow is terminal at ${this.currentPhase}`);
    }

    const rule = findTransitionRule(this.currentPhase, command);
    if (rule === undefined) {
      return rejected(this.currentPhase, `no transition from ${this.currentPhase} on ${command}`);
    }

    if (
      rule.consumesIteration &&
      rule.loopRegion !== null &&
      !this.reserveIteration(rule.loopRegion)
    ) {
      this.moveTo(PHASES.HUMAN_INTERVENTION_REQUIRED);
      return {
        status: 'intervention-required',
        phase: this.currentPhase,
        event: 'control:human-intervention-required',
        reason: `iteration budget exhausted for ${rule.loopRegion}`,
      };
    }

    this.moveTo(rule.to);
    return { status: 'accepted', phase: this.currentPhase, event: `${rule.from}->${rule.to}` };
  }

  private reserveIteration(region: Phase): boolean {
    const used = this.iterationsUsed.get(region) ?? 0;
    if (used >= DEFAULT_ITERATION_LIMIT) {
      return false;
    }
    this.iterationsUsed.set(region, used + 1);
    return true;
  }

  private moveTo(next: Phase): void {
    this.currentPhase = next;
    this.history.push(next);
  }
}
