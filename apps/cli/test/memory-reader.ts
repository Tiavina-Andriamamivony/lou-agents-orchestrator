import type { ProjectReader } from '../src/init/project-reader';

export type MemoryFileSystem = Readonly<Record<string, string>>;

export function createMemoryReader(files: MemoryFileSystem): ProjectReader {
  return {
    read: (path: string) => {
      const content = files[path];
      if (content === undefined) {
        return Promise.reject(new Error(`ENOENT: ${path}`));
      }
      return Promise.resolve(content);
    },
    exists: (path: string) => Promise.resolve(files[path] !== undefined),
    list: (dir: string) => {
      const prefix = dir.endsWith('/') ? dir : `${dir}/`;
      return Promise.resolve(
        Object.keys(files)
          .filter((path) => path.startsWith(prefix))
          .filter((path) => !path.slice(prefix.length).includes('/'))
          .map((path) => path.slice(prefix.length)),
      );
    },
  };
}
