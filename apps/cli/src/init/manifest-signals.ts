export interface PackageManifest {
  readonly packageManager: string | null;
  readonly dependencies: readonly string[];
  readonly devDependencies: readonly string[];
  readonly scripts: ReadonlyArray<readonly [string, string]>;
}

type Marker = readonly [string, string];

export const LANGUAGE_MARKERS: readonly Marker[] = [
  ['typescript', 'TypeScript'],
  ['coffeescript', 'CoffeeScript'],
];

export const FRAMEWORK_MARKERS: readonly Marker[] = [
  ['next', 'Next.js'],
  ['react', 'React'],
  ['vue', 'Vue'],
  ['svelte', 'Svelte'],
  ['angular', 'Angular'],
  ['express', 'Express'],
  ['fastify', 'Fastify'],
  ['@nestjs/core', 'NestJS'],
];

export const TESTING_MARKERS: readonly Marker[] = [
  ['vitest', 'vitest'],
  ['jest', 'jest'],
  ['@playwright/test', 'Playwright'],
  ['cypress', 'Cypress'],
];

export function parseManifest(raw: string): PackageManifest | null {
  const json = safeParse(raw);
  if (json === null || !isRecord(json)) {
    return null;
  }
  return {
    packageManager: asString(json['packageManager']),
    dependencies: keysOf(json['dependencies']),
    devDependencies: keysOf(json['devDependencies']),
    scripts: scriptEntries(json['scripts']),
  };
}

export function detectLabels(
  manifest: PackageManifest | null,
  markers: readonly Marker[],
): readonly string[] {
  if (manifest === null) {
    return [];
  }
  return markers.filter(([pkg]) => isReferenced(manifest, pkg)).map(([, label]) => label);
}

function isReferenced(manifest: PackageManifest, pkg: string): boolean {
  if (manifest.dependencies.includes(pkg) || manifest.devDependencies.includes(pkg)) {
    return true;
  }
  return manifest.scripts.some(([name, command]) => name === 'test' && command.includes(pkg));
}

function safeParse(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function asString(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}

function keysOf(value: unknown): readonly string[] {
  if (!isRecord(value)) {
    return [];
  }
  return Object.keys(value);
}

function scriptEntries(value: unknown): ReadonlyArray<readonly [string, string]> {
  if (!isRecord(value)) {
    return [];
  }
  return Object.entries(value).filter(
    (entry): entry is [string, string] => typeof entry[1] === 'string',
  );
}
