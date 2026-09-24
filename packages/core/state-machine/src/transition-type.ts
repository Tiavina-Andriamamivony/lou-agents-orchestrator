import type { Phase, Command } from './types';

export interface TransitionRule {
  readonly from: Phase;
  readonly command: Command;
  readonly to: Phase;
  readonly consumesIteration: boolean;
  readonly loopRegion: Phase | null;
}
