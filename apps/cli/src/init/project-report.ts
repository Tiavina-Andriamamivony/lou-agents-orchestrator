export interface ProjectReport {
  readonly packageManager: string | null;
  readonly languages: readonly string[];
  readonly frameworks: readonly string[];
  readonly testing: readonly string[];
  readonly docs: readonly string[];
  readonly hasCI: boolean;
  readonly isGitRepository: boolean;
  readonly commitConventions: readonly string[];
  readonly constitutionPresent: boolean;
}
