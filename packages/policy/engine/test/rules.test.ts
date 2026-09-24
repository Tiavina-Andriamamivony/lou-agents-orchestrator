import { describe, expect, it } from 'vitest';
import type { Action } from '../src/action';
import type { PolicyDecision } from '../src/decision';
import type { RoleCapability } from '../src/capability-rule';
import type { PolicyRule } from '../src/rule';
import { defaultRules } from '../src/defaults';
import { DefaultPolicyEngine } from '../src/default-policy-engine';
import { destructiveRules } from '../src/destructive-rules';
import { configRule, productionRule, riskRules, secretRule } from '../src/human-rules';

function evaluate(rules: readonly PolicyRule[], action: Action): Promise<PolicyDecision> {
  return new DefaultPolicyEngine(rules).evaluate(action);
}

const developerRules = () => defaultRules(DEVELOPER_CAPABILITIES);

const DEVELOPER_CAPABILITIES: readonly RoleCapability[] = [
  {
    role: 'developer',
    kind: 'shell',
    operations: ['npm test', 'npm run lint', 'ls', 'git status', 'git diff'],
  },
  { role: 'developer', kind: 'filesystem' },
];

const shell = (target: string, environment?: 'local' | 'preprod' | 'production'): Action => ({
  kind: 'shell',
  role: 'developer',
  target,
  ...(environment === undefined ? {} : { environment }),
});

describe('destructive rules', () => {
  it.each([
    'rm -rf node_modules',
    'rm -f config.json',
    'git push --force origin main',
    'git reset --hard HEAD',
  ])('denies destructive command: %s', async (target) => {
    const decision = await evaluate(destructiveRules(), shell(target));

    expect(decision.decision).toBe('DENY');
  });

  it('leaves benign commands untouched at the rule level', () => {
    const action = shell('echo "hello"');

    for (const rule of destructiveRules()) {
      expect(rule.evaluate(action)).toBeNull();
    }
  });
});

describe('human-approval rules', () => {
  it.each(['chmod 777 script.sh', 'curl -s https://example.com', 'git push origin feature/x'])(
    'asks a human for risky command: %s',
    async (target) => {
      const decision = await evaluate(riskRules(), shell(target));

      expect(decision.decision).toBe('ASK_HUMAN');
    },
  );

  it('asks a human for production actions', async () => {
    const rules = [...riskRules(), productionRule()];

    const decision = await evaluate(rules, shell('npm run migrate', 'production'));

    expect(decision.decision).toBe('ASK_HUMAN');
  });

  it('asks a human when the action touches secrets', async () => {
    const decision = await evaluate([secretRule()], {
      kind: 'secret',
      role: 'developer',
      target: 'AWS_SECRET_KEY',
    });

    expect(decision.decision).toBe('ASK_HUMAN');
  });

  it('asks a human when the action changes configuration', async () => {
    const decision = await evaluate([configRule()], {
      kind: 'config',
      role: 'developer',
      target: 'tsconfig.json',
    });

    expect(decision.decision).toBe('ASK_HUMAN');
  });
});

describe('capabilities', () => {
  it('allows a granted shell command', async () => {
    const decision = await evaluate(developerRules(), shell('npm test -- --watch'));

    expect(decision.decision).toBe('ALLOW');
  });

  it('denies a shell command outside the allowlist', async () => {
    const decision = await evaluate(developerRules(), shell('cat /etc/passwd'));

    expect(decision.decision).toBe('DENY');
  });

  it('intercepts destructive commands before capabilities can allow them', async () => {
    const rules = defaultRules([{ role: 'developer', kind: 'shell', operations: ['rm'] }]);

    const decision = await evaluate(rules, shell('rm -rf node_modules'));

    expect(decision.decision).toBe('DENY');
  });

  it('frames filesystem access by an explicit target allowlist', async () => {
    const reviewer = defaultRules([
      { role: 'reviewer', kind: 'filesystem', operations: ['/repo/src'] },
    ]);

    const allowed = await evaluate(reviewer, {
      kind: 'filesystem',
      role: 'reviewer',
      target: '/repo/src/index.ts',
    });
    const denied = await evaluate(reviewer, {
      kind: 'filesystem',
      role: 'reviewer',
      target: '/etc/passwd',
    });

    expect(allowed.decision).toBe('ALLOW');
    expect(denied.decision).toBe('DENY');
  });

  it('denies actions from an unknown role', async () => {
    const decision = await evaluate(developerRules(), {
      kind: 'shell',
      role: 'ghost',
      target: 'ls',
    });

    expect(decision.decision).toBe('DENY');
  });
});

describe('default rule set', () => {
  it('supports the happy path for configured commands', async () => {
    const decision = await evaluate(developerRules(), shell('npm run lint'));

    expect(decision.decision).toBe('ALLOW');
  });
});
