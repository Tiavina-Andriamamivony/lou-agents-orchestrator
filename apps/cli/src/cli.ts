import { pathToFileURL } from 'node:url';
import { createNodeProjectReader } from './init/project-reader.ts';
import type { ProjectReader } from './init/project-reader.ts';
import { runInit } from './init/run-init.ts';

const USAGE = `Usage: lou <command>

Commands:
  init   Read-only project onboarding report (no modification).`;

export interface CliEnv {
  readonly reader: ProjectReader;
  readonly cwd: string;
  readonly out: (line: string) => void;
  readonly err: (line: string) => void;
}

export function runCli(argv: readonly string[], env: CliEnv): Promise<number> {
  const command = argv[0] ?? '';
  if (command !== 'init') {
    env.err(command === '' ? USAGE : `Unknown command: ${command}\n\n${USAGE}`);
    return Promise.resolve(1);
  }
  return runInit({ reader: env.reader, root: env.cwd }).then((report) => {
    env.out(report);
    return 0;
  });
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
