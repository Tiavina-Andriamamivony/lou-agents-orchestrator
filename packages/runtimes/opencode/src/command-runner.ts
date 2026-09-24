export interface CommandResult {
  readonly exitCode: number;
  readonly stdout: string;
  readonly stderr: string;
  readonly interrupted: boolean;
}

export interface CommandRunOptions {
  readonly cwd: string;
  readonly signal?: AbortSignal;
  readonly timeoutMs?: number;
}

export interface CommandRunner {
  run(command: string, args: readonly string[], options: CommandRunOptions): Promise<CommandResult>;
}
