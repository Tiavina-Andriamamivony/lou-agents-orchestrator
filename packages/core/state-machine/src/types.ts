import type { PHASES } from './phases';
import type { COMMANDS } from './commands';

export type Phase = (typeof PHASES)[keyof typeof PHASES];
export type Command = (typeof COMMANDS)[keyof typeof COMMANDS];
