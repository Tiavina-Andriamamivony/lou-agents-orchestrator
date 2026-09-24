export type ActionKind =
  'shell' | 'filesystem' | 'git' | 'network' | 'config' | 'database' | 'secret';

export type Environment = 'local' | 'preprod' | 'production';

export interface Action {
  readonly kind: ActionKind;
  readonly role: string;
  readonly target: string;
  readonly environment?: Environment;
}
