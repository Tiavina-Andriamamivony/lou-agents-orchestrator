import type { Action, ActionKind } from './action';
import type { PolicyRule } from './rule';

export interface RoleCapability {
  readonly role: string;
  readonly kind: ActionKind;
  readonly operations?: readonly string[];
}

export function capabilityRule(capabilities: readonly RoleCapability[]): PolicyRule {
  return {
    id: 'role-capabilities',
    reason: 'the action matches a granted capability',
    evaluate: (action: Action) => {
      const matching = capabilities.find((candidate) => grantsKind(candidate, action));
      if (matching === undefined) {
        return null;
      }
      return allowsOperation(matching, action.target) ? 'ALLOW' : null;
    },
  };
}

function grantsKind(capability: RoleCapability, action: Action): boolean {
  return capability.role === action.role && capability.kind === action.kind;
}

function allowsOperation(capability: RoleCapability, target: string): boolean {
  if (capability.operations === undefined) {
    return true;
  }
  if (capability.operations.length === 0) {
    return false;
  }
  return capability.operations.some(
    (operation) => operation === '*' || target.startsWith(operation),
  );
}
