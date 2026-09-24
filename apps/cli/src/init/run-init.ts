import { analyzeProject } from './analyze-project.ts';
import { formatInitReport } from './format-report.ts';
import type { ProjectReader } from './project-reader.ts';

interface RunInitOptions {
  readonly reader: ProjectReader;
  readonly root: string;
}

export async function runInit(options: RunInitOptions): Promise<string> {
  const report = await analyzeProject({ reader: options.reader, root: options.root });
  return formatInitReport(report);
}
