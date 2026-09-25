export interface DoctorCheck {
  readonly label: string;
  readonly ok: boolean;
  readonly detail: string;
}

export interface DoctorProbes {
  node(): Promise<DoctorCheck>;
  pnpm(): Promise<DoctorCheck>;
  gitHubCli(): Promise<DoctorCheck>;
  opencode(): Promise<DoctorCheck>;
  gitRepository(): Promise<DoctorCheck>;
}

interface DoctorReport {
  readonly checks: readonly DoctorCheck[];
  readonly code: number;
}

export async function runDoctor(probes: DoctorProbes): Promise<DoctorReport> {
  const checks = await Promise.all([
    probes.node(),
    probes.pnpm(),
    probes.gitHubCli(),
    probes.opencode(),
    probes.gitRepository(),
  ]);
  return { checks, code: checks.every((check) => check.ok) ? 0 : 1 };
}

export function formatDoctorReport(report: DoctorReport): string {
  const lines = report.checks.map(formatCheck);
  const passed = report.checks.filter((check) => check.ok).length;
  lines.push('', `${passed}/${report.checks.length} checks passed.`);
  return `${lines.join('\n')}\n`;
}

function formatCheck(check: DoctorCheck): string {
  const status = check.ok ? 'OK' : 'KO';
  const detail = check.detail.length > 0 ? ` — ${check.detail}` : '';
  return `${status}  ${check.label}${detail}`;
}
