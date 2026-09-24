import { describe, expect, it } from 'vitest';
import { formatInitReport } from '../src/init/format-report';
import type { ProjectReport } from '../src/init/project-report';

const FULL_REPORT: ProjectReport = {
  packageManager: 'pnpm',
  languages: ['TypeScript'],
  frameworks: ['Next.js', 'React'],
  testing: ['vitest', 'Playwright'],
  docs: ['README.md'],
  hasCI: true,
  isGitRepository: true,
  commitConventions: ['conventional commits'],
  constitutionPresent: true,
};

const EMPTY_REPORT: ProjectReport = {
  packageManager: null,
  languages: [],
  frameworks: [],
  testing: [],
  docs: [],
  hasCI: false,
  isGitRepository: false,
  commitConventions: [],
  constitutionPresent: false,
};

describe('formatInitReport', () => {
  it('prints a full onboarding report', () => {
    expect(formatInitReport(FULL_REPORT)).toBe(
      [
        'Project successfully onboarded.',
        '',
        'Detected:',
        '- pnpm',
        '- TypeScript',
        '- Next.js',
        '- React',
        '- vitest',
        '- Playwright',
        '',
        'Package manager: pnpm',
        'Git repository: yes',
        'Commit conventions: conventional commits',
        'Docs: README.md',
        'CI: yes',
        'Constitution: found (.add/constitution.md)',
      ].join('\n') + '\n',
    );
  });

  it('prints not-detected markers for a bare repository', () => {
    expect(formatInitReport(EMPTY_REPORT)).toBe(
      [
        'Project successfully onboarded.',
        '',
        'Package manager: not detected',
        'Git repository: no',
        'Commit conventions: not detected',
        'Docs: none',
        'CI: no',
        'Constitution: not found',
      ].join('\n') + '\n',
    );
  });
});
