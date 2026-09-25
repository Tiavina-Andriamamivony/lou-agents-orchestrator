import { readFileSync, realpathSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { createNodeProjectReader } from './init/project-reader.ts';
import type { ProjectReader } from './init/project-reader.ts';
import { parseRunArguments, runProduction } from './run/run-command.ts';
import { parseInitJsonFlag, runInit } from './init/run-init.ts';

const USAGE = `Usage: lou <command> [args]

Commands:
  init   Read-only project onboarding report: lou init [--json].
  run    Drive a GitHub issue to a pull request: lou run <issue-number> [--dry-run].`;

const HELP_COMMANDS = new Set(['--help', '-h', 'help']);
const VERSION_COMMANDS = new Set(['--version', '-v']);

export interface CliEnv {
  readonly reader: ProjectReader;
  readonly cwd: string;
  readonly out: (line: string) => void;
  readonly err: (line: string) => void;
}

type CommandHandler = (argv: readonly string[], env: CliEnv) => Promise<number>;

const COMMANDS: Record<string, CommandHandler> = {
  init: handleInit,
  run: handleRun,
};

function handleInit(argv: readonly string[], env: CliEnv): Promise<number> {
  const json = parseInitJsonFlag(argv);
  if (json === null) {
    env.err('Usage: lou init [--json]');
    return Promise.resolve(1);
  }
  return runInit({ reader: env.reader, root: env.cwd, json }).then((report) => {
    env.out(report);
    return 0;
  });
}

function handleRun(argv: readonly string[], env: CliEnv): Promise<number> {
  const parsed = parseRunArguments(argv);
  if (parsed === null) {
    env.err('Usage: lou run <issue-number> [--dry-run]');
    return Promise.resolve(1);
  }
  return runProduction({
    issueNumber: parsed.issueNumber,
    dryRun: parsed.dryRun,
    cwd: env.cwd,
    out: env.out,
  }).catch((error: unknown) => {
    env.err(`lou run failed: ${errorMessage(error)}`);
    return 1;
  });
}

export function runCli(argv: readonly string[], env: CliEnv): Promise<number> {
  const command = argv[0] ?? '';
  if (HELP_COMMANDS.has(command)) {
    env.out(USAGE);
    return Promise.resolve(0);
  }
  if (VERSION_COMMANDS.has(command)) {
    env.out(`lou ${readVersion()}`);
    return Promise.resolve(0);
  }
  const handler = COMMANDS[command];
  if (handler !== undefined) {
    return handler(argv, env);
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

const entryPath = process.argv[1];
const isDirectRun =
  entryPath !== undefined && pathToFileURL(realpathSync(entryPath)).href === import.meta.url;
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

function readVersion(): string {
  const packageJson = JSON.parse(
    readFileSync(new URL('../package.json', import.meta.url), 'utf8'),
  ) as { readonly version?: string };
  return packageJson.version ?? '0.0.0';
}
