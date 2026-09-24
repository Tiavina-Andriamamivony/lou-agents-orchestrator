import type { GitAdapter } from '@lou/git';

interface GitSpy {
  readonly git: GitAdapter;
  readonly branches: readonly string[];
  readonly commits: readonly string[];
  readonly pushes: number;
}

export function createGitSpy(): GitSpy {
  const branches: string[] = [];
  const commits: string[] = [];
  let pushes = 0;
  const git: GitAdapter = {
    createBranch(name: string): Promise<void> {
      branches.push(name);
      return Promise.resolve();
    },
    commit(message: string): Promise<void> {
      commits.push(message);
      return Promise.resolve();
    },
    push(): Promise<void> {
      pushes += 1;
      return Promise.resolve();
    },
    getCurrentBranch(): Promise<string> {
      return Promise.resolve(branches[0] ?? 'main');
    },
    isClean(): Promise<boolean> {
      return Promise.resolve(true);
    },
  };
  return {
    git,
    branches,
    commits,
    get pushes(): number {
      return pushes;
    },
  };
}
