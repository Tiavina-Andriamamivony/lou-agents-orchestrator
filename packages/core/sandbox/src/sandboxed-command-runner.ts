import type { CommandResult, CommandRunner, CommandRunOptions } from '@lou/command-runner';
import { NodeCommandRunner } from '@lou/command-runner';
import type { Action, Decision, PolicyEngine } from '@lou/policy-engine';
import { DefaultPolicyEngine, defaultRules } from '@lou/policy-engine';
import { resolve, sep } from 'node:path';

const DEFAULT_ROLE = 'agent';

export interface SandboxedCommandRunnerOptions {
  readonly root: string;
  readonly role?: string;
  readonly runner?: CommandRunner;
  readonly policyEngine?: PolicyEngine;
}

export class SandboxedCommandRunner implements CommandRunner {
  private readonly root: string;
  private readonly role: string;
  private readonly inner: CommandRunner;
  private readonly policyEngine: PolicyEngine;

  constructor(options: SandboxedCommandRunnerOptions) {
    this.root = options.root;
    this.role = options.role ?? DEFAULT_ROLE;
    this.inner = options.runner ?? new NodeCommandRunner();
    this.policyEngine =
      options.policyEngine ??
      new DefaultPolicyEngine(defaultRules([{ role: this.role, kind: 'shell' }]));
  }

  run(
    command: string,
    args: readonly string[],
    options: CommandRunOptions,
  ): Promise<CommandResult> {
    return this.policyEngine.evaluate(this.policyAction(command, args)).then((decision) => {
      this.ensureAllowed(decision.decision, decision.reason);
      assertWithinRoot(this.root, options.cwd);
      return this.inner.run(command, args, options);
    });
  }

  private policyAction(command: string, args: readonly string[]): Action {
    return {
      kind: 'shell',
      role: this.role,
      target: [command, ...args].join(' '),
    };
  }

  private ensureAllowed(decision: Decision, reason: string): void {
    if (decision === 'DENY') {
      throw new Error(`command denied by policy: ${reason}`);
    }
    if (decision === 'ASK_HUMAN') {
      throw new Error(`command requires human approval: ${reason}`);
    }
  }
}

export function assertWithinRoot(root: string, cwd: string): void {
  const resolvedRoot = resolve(root);
  const resolvedCwd = resolve(cwd);
  const within = resolvedCwd === resolvedRoot || resolvedCwd.startsWith(`${resolvedRoot}${sep}`);
  if (!within) {
    throw new Error(`refusing to run outside the sandbox root: ${resolvedCwd}`);
  }
}
