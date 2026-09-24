import { readFile, readdir, stat } from 'node:fs/promises';

export interface ProjectReader {
  read(path: string): Promise<string>;
  exists(path: string): Promise<boolean>;
  list(dir: string): Promise<readonly string[]>;
}

export function createNodeProjectReader(): ProjectReader {
  return {
    read: (path: string) => readFile(path, 'utf8'),
    exists: (path: string) =>
      stat(path)
        .then(() => true)
        .catch(() => false),
    list: (dir: string) => readdir(dir).catch(() => []),
  };
}
