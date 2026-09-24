# Contributing

Thank you for contributing. This project enforces engineering discipline through tooling,
not goodwill. Keep the following in mind.

## Development environment

Requirements: Node.js >= 22 and pnpm >= 10.

```bash
pnpm install     # install all workspace dependencies
pnpm check       # lint → format → typecheck → dead code analysis → tests
```

## Commit convention

All commits must follow the [Conventional Commits](https://www.conventionalcommits.org)
specification in English. The commit message hook and CI reject non-conforming commits.

Allowed types: `feat`, `fix`, `refactor`, `test`, `docs`, `build`, `ci`, `chore`, `revert`.

```text
feat(state-machine): bound review rework iterations

cap the review loop at five iterations before requiring a human
```

- Body lines wrap at 100 characters.
- Subject uses the imperative mood, lowercase.

## Code conventions

- The code reads by itself. Do not add explanatory comments — if a comment seems
  necessary, extract a named function or constant instead. Only non-obvious invariants
  may carry a comment.
- One role per file, one class per file, one responsibility per function.
- TypeScript strict mode, zero warnings. ESLint, `tsc`, and `knip` are part of every
  quality gate and are not negotiable.
- Follow the NASA Power of Ten adaptation defined in the ESLint configuration.

## Testing (TDD)

Write the failing test first, watch it fail, then implement. Tests are the specification.

- Unit tests: pure logic, no I/O (`vitest`).
- Integration tests: real, throwaway resources (temporary git repositories, filesystem).
- E2E: black-box runs of the built CLI against a fixture repository.

Every behaviour change ships with tests. `pnpm test` must pass locally before pushing.

## Branch and pull request workflow

- Branch name: `feature/<ticket-id>-<short-slug>` (example: `feature/DEV-142-password-reset`).
- Open a pull request against `main`. CI runs lint → format → typecheck → dead code analysis →
  tests, and a conventional-commits job checks every commit.
- `main` is protected: nothing merges without a green pipeline and a human review.

## Pull request checklist

- Read this document and the [pull request template](.github/pull_request_template.md).
- Keep the change small and isolated.
- Update documentation when behaviour changes.

## Reporting issues

Describe the expected behaviour, the actual behaviour, and the smallest reproduction you
can provide. Supply the failing test where possible.
