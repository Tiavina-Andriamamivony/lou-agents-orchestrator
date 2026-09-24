import type { CommandRunner } from '@lou/command-runner';
import { NodeCommandRunner } from '@lou/command-runner';
import type { TestResult, TestRunner, TestRunOptions } from './test-runner.ts';

const DEFAULT_COMMAND = 'pnpm';
const DEFAULT_ARGS: readonly string[] = ['test'];

export interface NodeTestRunnerOptions {
  readonly runner?: CommandRunner;
}

export class NodeTestRunner implements TestRunner {
  private readonly runner: CommandRunner;

  constructor(options: NodeTestRunnerOptions = {}) {
    this.runner = options.runner ?? new NodeCommandRunner();
  }

  async run(options: TestRunOptions): Promise<TestResult> {
    const command = options.command ?? DEFAULT_COMMAND;
    const args = options.args ?? DEFAULT_ARGS;
    const result = await this.runner.run(command, args, {
      cwd: options.cwd,
      ...(options.timeoutMs !== undefined ? { timeoutMs: options.timeoutMs } : {}),
      ...(options.signal !== undefined ? { signal: options.signal } : {}),
    });
    return {
      passed: result.exitCode === 0 && !result.interrupted,
      exitCode: result.exitCode,
      stdout: result.stdout,
      stderr: result.stderr,
      interrupted: result.interrupted,
    };
  }
}
