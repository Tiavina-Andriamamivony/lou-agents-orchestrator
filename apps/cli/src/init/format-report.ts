import type { ProjectReport } from './project-report.ts';

export function formatInitReport(report: ProjectReport): string {
  const block: string[] = ['Project successfully onboarded.', ''];
  const detected = [
    report.packageManager,
    ...report.languages,
    ...report.frameworks,
    ...report.testing,
  ].filter((entry): entry is string => entry !== null);
  if (detected.length > 0) {
    block.push('Detected:');
    block.push(...detected.map((entry) => `- ${entry}`));
    block.push('');
  }
  block.push(`Package manager: ${report.packageManager ?? 'not detected'}`);
  block.push(`Git repository: ${yesNo(report.isGitRepository)}`);
  block.push(
    report.commitConventions.length > 0
      ? `Commit conventions: ${report.commitConventions.join(', ')}`
      : 'Commit conventions: not detected',
  );
  block.push(`Docs: ${report.docs.length > 0 ? report.docs.join(', ') : 'none'}`);
  block.push(`CI: ${yesNo(report.hasCI)}`);
  block.push(
    `Constitution: ${report.constitutionPresent ? 'found (.add/constitution.md)' : 'not found'}`,
  );
  return `${block.join('\n')}\n`;
}

function yesNo(value: boolean): string {
  return value ? 'yes' : 'no';
}
