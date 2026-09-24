import { join } from 'node:path';
import {
  detectLabels,
  FRAMEWORK_MARKERS,
  LANGUAGE_MARKERS,
  parseManifest,
  TESTING_MARKERS,
} from './manifest-signals.ts';
import type { PackageManifest } from './manifest-signals.ts';
import type { ProjectReport } from './project-report.ts';
import type { ProjectReader } from './project-reader.ts';

interface AnalyzeOptions {
  readonly reader: ProjectReader;
  readonly root: string;
}

const LOCKFILE_MANAGERS: ReadonlyArray<readonly [string, string]> = [
  ['pnpm-lock.yaml', 'pnpm'],
  ['pnpm-workspace.yaml', 'pnpm'],
  ['yarn.lock', 'yarn'],
  ['package-lock.json', 'npm'],
  ['bun.lockb', 'bun'],
  ['bun.lock', 'bun'],
];

const DOC_FILES = ['README.md', 'AGENTS.md', 'docs', 'README'];
const COMMITLINT_FILES = [
  'commitlint.config.js',
  'commitlint.config.cjs',
  'commitlint.config.mjs',
  'commitlint.config.ts',
  '.commitlintrc.json',
];
const GITLAB_CI = '.gitlab-ci.yml';
const CONSTITUTION_PATH = '.add/constitution.md';

export async function analyzeProject(options: AnalyzeOptions): Promise<ProjectReport> {
  const { reader, root } = options;
  const manifest = await readManifest(reader, root);
  const docs = await existingFiles(reader, root, DOC_FILES);
  const commitConventions = await existingFiles(reader, root, COMMITLINT_FILES);
  const packageManager = await detectPackageManager(manifest, reader, root);
  return {
    packageManager,
    languages: detectLabels(manifest, LANGUAGE_MARKERS),
    frameworks: detectLabels(manifest, FRAMEWORK_MARKERS),
    testing: detectLabels(manifest, TESTING_MARKERS),
    docs,
    hasCI: await detectCI(reader, root),
    isGitRepository: await reader.exists(join(root, '.git')),
    commitConventions: commitConventions.length > 0 ? ['conventional commits'] : [],
    constitutionPresent: await reader.exists(join(root, CONSTITUTION_PATH)),
  };
}

async function readManifest(reader: ProjectReader, root: string): Promise<PackageManifest | null> {
  try {
    const raw = await reader.read(join(root, 'package.json'));
    return parseManifest(raw);
  } catch {
    return null;
  }
}

async function detectPackageManager(
  manifest: PackageManifest | null,
  reader: ProjectReader,
  root: string,
): Promise<string | null> {
  for (const [lockfile, manager] of LOCKFILE_MANAGERS) {
    if (await reader.exists(join(root, lockfile))) {
      return manager;
    }
  }
  if (manifest !== null && manifest.packageManager !== null) {
    return manifest.packageManager.split('@')[0] ?? null;
  }
  return null;
}

async function detectCI(reader: ProjectReader, root: string): Promise<boolean> {
  if (await reader.exists(join(root, GITLAB_CI))) {
    return true;
  }
  const workflows = await reader.list(join(root, '.github', 'workflows'));
  return workflows.some((file) => file.endsWith('.yml') || file.endsWith('.yaml'));
}

async function existingFiles(
  reader: ProjectReader,
  root: string,
  files: readonly string[],
): Promise<readonly string[]> {
  const found: string[] = [];
  for (const file of files) {
    if (await reader.exists(join(root, file))) {
      found.push(file);
    }
  }
  return found;
}
