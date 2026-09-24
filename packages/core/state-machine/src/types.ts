import type { PHASES } from './phases.ts';
import type { COMMANDS } from './commands.ts';

export type Phase = (typeof PHASES)[keyof typeof PHASES];
export type Command = (typeof COMMANDS)[keyof typeof COMMANDS];
