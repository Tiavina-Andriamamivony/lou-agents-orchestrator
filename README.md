# Agentic-Driven Development (ADD)

**The control plane for AI coding agents.**

OpenCode executes. ADD governs and orchestrates. Coding agents are fast, but speed
without process is chaos: unverified changes, ignored tests, unbounded scope, surprise
merges. ADD sits _above_ the agent runtime and gives every change the same engineering
process a senior team would — plan, test, verify, review, human approval — while letting
the agent keep its velocity.

The detailed product specification is in French: `docs/cahier-des-charges.md`.

---

## The problem ADD solves

Vibe coding is fast and uncontrollable. One agent "says" the tests pass; nobody checked.
Another refactors half the codebase because a ticket said "improve performance".
A third merges without a review. The bottleneck of AI development is no longer writing
code — it is **trust and control**.

ADD is not an IDE, not a chat wrapper, not a CRUD generator. It is the governance layer
between an autonomous agent and a production-grade repository. The same way git made
collaboration governable, ADD makes autonomous development governable.

## Who it is for

### Development teams

An agent becomes a disciplined team member instead of a cowboy:

- **Test-first by construction** — the expected behaviour is specified as failing tests
  before any business code is written.
- **Verification over trust** — an agent asserting "tests pass" is not proof. ADD runs
  the checks itself and only advances when they are green.
- **Small blast radius** — changes stay small, isolated and reversible.
- **Human gates at every decision that matters** — plan approval, review, merge. You
  delegate execution, never authority.
- **Bounded loops** — every retry is capped; a run that exhausts its budget stops and
  escalates to a human instead of improvising.

### Teams building without dedicated coders

For product teams, founders and citizen builders who describe intent instead of writing
code:

- Describe the goal in plain language. ADD plans the work, writes the tests, implements,
  verifies and opens a pull request.
- You supervise outcomes instead of writing syntax: you review the plan, review the
  result, approve or reject — in natural language.
- No codebase hostage: the result is a normal repository your team can read, review and
  take back at any time. The human is the final authority.

### Engineering leaders and business

Agent adoption is a governance decision, not a tool choice:

- **Least privilege** — every agent role receives only the permissions its task requires.
  No agent gets blanket access to your production or your secrets.
- **Audit trail** — every call, approval and command is recorded and replayable. If
  something shipped, you can show exactly how, when and who approved it.
- **Fail closed** — when a critical operation cannot be assessed, the run stops. It never
  executes by default.
- **Model agnostic** — different models can be orchestrated for different tasks. No single
  vendor lock-in, cost or provider dictated by default.
- **Reproducible** — a run is a documented, bounded process, not a black box.
- **Policy at the platform level** — rules live in enforced policy and lint/CI gates, not
  in individual prompts that anyone can forget.

## How it works: the loop

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
relinquishing control over **what** is built, **why**, and **how**.

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
tuned for TypeScript/Node: bounded control flow, small functions, minimal scope, explicit
error handling, strict compilation and zero-warning static analysis. The same rules are
enforced — non-negotiably — on ADD's own codebase through the linter and CI, so the
product dogfoods the policy it governs with.

## Current state and roadmap

**Implemented today:** the deterministic, bounded workflow engine (`@add/state-machine`)
and the OpenCode adapter (`@add/opencode-runtime`) — an `AgentRuntime` port that runs
agents through the `opencode run` CLI with timeout, abort and status, behind one
interface. 26 tests, strict lint, typecheck and dead-code analysis, all enforced by CI on
Node 22 and 24; `main` is protected.

**Next up (doc §57 priority):** the policy engine, git adapter, `/init` + project
constitution, then the orchestrator loop, the CLI with human approval gates, and GitHub
integration. MVP scope is fixed in `docs/cahier-des-charges.md` (§47); phases are:

| Phase | Focus                                                                                    |
| ----- | ---------------------------------------------------------------------------------------- |
| 0     | Proof of concept: CLI + agent runtime + git + manual ticket + plan + tests + review loop |
| 1     | MVP: GitHub issues/PRs, policy engine, project constitution, human gates, audit, sandbox |
| 2     | Agent platform: multiple agents/models, MCP, model routing, cost control                 |
| 3     | Team/enterprise: organizational policies, RBAC, shared projects, compliance              |
| 4     | Ecosystem: Linear, Jira, GitLab, cloud environments, plugin marketplace                  |

## Repository layout

```text
add/
├── apps/
│   └── cli/                      # the `add` CLI (roadmap)
├── packages/
│   ├── core/
│   │   ├── state-machine/        # deterministic, bounded workflow engine
│   │   └── constitution/         # persistent project rules model + store
│   ├── policy/                   # policy engine and capability model
│   │   └── engine/               # rules, risk classification, permissions
│   ├── git/                      # git workflow adapter (roadmap)
│   ├── runtimes/
│   │   └── opencode/             # AgentRuntime port + OpenCode adapter
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
- One feature per branch, PR per feature, merge once green. See
  [`CONTRIBUTING.md`](CONTRIBUTING.md).

## Non-goals

- Not an IDE and not a replacement for OpenCode.
- Not an LLM wrapper — no single locked-in model.
- Not a CRUD generator.
- Not a system that deploys to production automatically.

## Security

Report vulnerabilities privately — see [`SECURITY.md`](SECURITY.md).

## License

[MIT](LICENSE)
