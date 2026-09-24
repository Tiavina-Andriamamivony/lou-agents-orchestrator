# Agentic-Driven Development (ADD)

**The engineering control plane for AI coding agents.**

Add governance, verification and human control to autonomous coding agents — without
sacrificing their velocity. OpenCode executes. ADD governs and orchestrates.

---

## Philosophy

Vibe coding is fast, but it follows the agent — not the engineer. ADD closes the loop on
autonomous development by giving an agent an explicit, auditable engineering process:

```text
Ticket
  │
  ▼
Understand
  │
  ▼
Plan
  │
  ▼
Human approval        ← the engineer stays in charge
  │
  ▼
Test design           ← tests before implementation
  │
  ▼
Implementation        ← executed by the agent runtime
  │
  ▼
Verification          ← ADD runs the checks itself, trust is verified
  │
  ▼
Review
  │
  ▼
Human approval
  │
  ▼
Pull request
```

ADD does not replace the developer. It lets a developer delegate more work without
relinquishing control over what is built, why, and how.

## Non-goals

- Not an IDE and not a replacement for OpenCode.
- Not a LLM wrapper — no single locked-in model.
- Not a CRUD generator.
- Not a system that deploys to production automatically.

## Core principles

| Principle               | Commitment                                                           |
| ----------------------- | -------------------------------------------------------------------- |
| Human-in-the-loop       | A human is the final authority on high-impact decisions.             |
| Least privilege         | Each agent receives only the permissions its task requires.          |
| Test first              | Expected behaviour is specified and testable before business code.   |
| Small blast radius      | Changes stay small, isolated and reversible.                         |
| Verification over trust | An agent asserting "tests pass" is not proof. ADD runs them.         |
| Fail closed             | When a critical operation cannot be assessed, stop — do not execute. |
| Model agnostic          | Different models can be orchestrated for different tasks.            |
| Reproducible            | Every run can be traced and, as far as possible, replayed.           |

## Safety model

- **Bounded workflows** — the state machine caps every retry loop; when a run exceeds its
  iteration budget it stops and asks for a human.
- **Policy engine** — every sensitive action is classified (`ALLOW / DENY / ASK_HUMAN`)
  before execution; destructive commands require approval.
- **Capability-based permissions** — each agent role gets an explicit capability set.
- **Audit trail** — every tool call, approval and command is recorded and replayable.

### NASA Power of Ten as the default engineering policy

ADD ships a configurable baseline policy inspired by the JPL/NASA Power of Ten rules,
tuned for TypeScript/Node: bounded control flow, small functions, minimal scope,
explicit error handling, strict compilation and zero-warning static analysis.
The same rules are enforced — non-negotiably — on ADD's own codebase through the linter
and CI so the product dogfoods the policy it governs with.

## Repository layout

```text
add/
├── apps/
│   └── cli/                      # the `add` CLI (roadmap)
├── packages/
│   ├── core/
│   │   └── state-machine/        # deterministic, bounded workflow engine
│   ├── policy/                   # policy engine and capability model (roadmap)
│   ├── git/                      # git workflow adapter (roadmap)
│   ├── runtimes/
│   │   └── opencode/             # OpenCode adapter (roadmap)
│   ├── storage/                  # runs, artefacts, audit trail (roadmap)
│   └── shared/
├── docs/
│   └── cahier-des-charges.md     # product specification (FR)
└── .github/
```

## Getting started (contributors)

Requirements: Node.js >= 22, pnpm >= 10.

```bash
pnpm install
pnpm check      # lint → typecheck → knip → tests
pnpm test       # unit tests (Vitest)
```

The `packageManager` field pins pnpm; enable Corepack with `corepack enable` if your
environment requires it.

## Development workflow

- Conventional commits (`feat:`, `fix:`, `refactor:`, `test:`, `docs:`, `ci:`, `chore:`).
- TDD: write the failing test, watch it fail, then make it pass.
- One file, one role. One class per file. One responsibility per function.
- TypeScript strict with zero warnings — the CI pipeline is the gate.

## Roadmap

| Phase | Focus                                                                                    |
| ----- | ---------------------------------------------------------------------------------------- |
| 0     | Proof of concept: CLI + agent runtime + git + manual ticket + plan + tests + review loop |
| 1     | MVP: GitHub issues/PRs, policy engine, project constitution, human gates, audit, sandbox |
| 2     | Agent platform: multiple agents/models, MCP, model routing, cost control                 |
| 3     | Team/enterprise: organizational policies, RBAC, shared projects, compliance              |
| 4     | Ecosystem: Linear, Jira, GitLab, cloud environments, plugin marketplace                  |

## Security

Report vulnerabilities privately — see [`SECURITY.md`](SECURITY.md).

## License

[MIT](LICENSE)
