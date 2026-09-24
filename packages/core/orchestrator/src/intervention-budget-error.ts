export class InterventionBudgetError extends Error {
  constructor(reason: string) {
    super(reason);
    this.name = 'InterventionBudgetError';
  }
}
