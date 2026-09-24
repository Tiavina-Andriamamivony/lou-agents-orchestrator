import { pathToFileURL } from 'node:url';
import { createNodeProjectReader } from './init/project-reader.ts';
import type { ProjectReader } from './init/project-reader.ts';
import { runInit } from './init/run-init.ts';
import { readIssueNumber, runProduction } from './run/run-command.ts';

const USAGE = `Usage: lou <command> [args]

Commands:
  init   Read-only project onboarding report (no modification).
  run    Drive a GitHub issue to a pull request: lou run <issue-number>.`;

export interface CliEnv {
  readonly reader: ProjectReader;
  readonly cwd: string;
  readonly out: (line: string) => void;
  readonly err: (line: string) => void;
}

export function runCli(argv: readonly string[], env: CliEnv): Promise<number> {
  const command = argv[0] ?? '';
  if (command === 'init') {
    return runInit({ reader: env.reader, root: env.cwd }).then((report) => {
      env.out(report);
      return 0;
    });
  }
  if (command === 'run') {
    const issueNumber = readIssueNumber(argv[1]);
    if (issueNumber === null) {
      env.err('Usage: lou run <issue-number>');
      return Promise.resolve(1);
    }
    return runProduction({ issueNumber, cwd: env.cwd, out: env.out }).catch((error: unknown) => {
      env.err(`lou run failed: ${errorMessage(error)}`);
      return 1;
    });
  }
  env.err(command === '' ? USAGE : `Unknown command: ${command}\n\n${USAGE}`);
  return Promise.resolve(1);
}

export function main(argv?: readonly string[]): Promise<number> {
  return runCli(argv ?? process.argv.slice(2), {
    reader: createNodeProjectReader(),
    cwd: process.cwd(),
    out: (line: string) => process.stdout.write(`${line}\n`),
    err: (line: string) => process.stderr.write(`${line}\n`),
  });
}

const isDirectRun =
  process.argv[1] !== undefined && pathToFileURL(process.argv[1]).href === import.meta.url;
if (isDirectRun) {
  main().then(
    (code) => process.exit(code),
    () => process.exit(1),
  );
}

function errorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return 'unknown error';
}
