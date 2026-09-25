import { analyzeProject } from './analyze-project.ts';
import { formatInitReport, formatInitReportJson } from './format-report.ts';
import type { ProjectReader } from './project-reader.ts';

const JSON_FLAG = '--json';

interface RunInitOptions {
  readonly reader: ProjectReader;
  readonly root: string;
  readonly json?: boolean;
}

export function parseInitJsonFlag(argv: readonly string[]): boolean | null {
  const rest = argv.slice(1);
  if (rest.length === 0) {
    return false;
  }
  if (rest.length === 1 && rest[0] === JSON_FLAG) {
    return true;
  }
  return null;
}

export async function runInit(options: RunInitOptions): Promise<string> {
  const report = await analyzeProject({ reader: options.reader, root: options.root });
  return options.json === true ? formatInitReportJson(report) : formatInitReport(report);
}
