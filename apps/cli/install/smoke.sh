#!/usr/bin/env bash
# Lou — end-to-end smoke test for the one-line installer.
# Builds a tarball of the working tree, installs Lou into an isolated HOME/PREFIX,
# then verifies `lou --version`, the upgrade path idempotence and `lou init`.
#   Usage: bash apps/cli/install/smoke.sh
# Colors are disabled when not a TTY or when CI/NO_COLOR is set (installer conventions).

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
INSTALLER="$ROOT/apps/cli/install/install.sh"
VERSION_LABEL="smoke"

if [[ "${CI:-}" == "true" || "${NO_COLOR:-}" != "" ]]; then COLOR=false; else COLOR=true; fi

C_RED='\033[31m'
C_GREEN='\033[32m'
C_RST='\033[0m'
if [[ "$COLOR" != true ]]; then
  C_RED=''
  C_GREEN=''
  C_RST=''
fi

ok() {
  printf '%bOK%b   %s\n' "$C_GREEN" "$C_RST" "$1"
}

step() {
  printf '...   %s\n' "$1"
}

fail() {
  printf '%bKO%b   %s\n' "$C_RED" "$C_RST" "$1" >&2
  exit 1
}

run_step() {
  local label="$1"
  shift
  if ! "$@"; then
    fail "$label"
  fi
  ok "$label"
}

run_installer() {
  HOME="$HOME" LOU_PREFIX="$PREFIX" LOU_ARCHIVE_URL="file://$TARBALL" \
    bash "$INSTALLER" --version "$VERSION_LABEL" --quiet
}

assert_version() {
  local out
  out="$("$PREFIX/bin/lou" --version 2>&1 || true)"
  if ! [[ "$out" =~ ^lou\ [0-9]+\.[0-9]+\.[0-9]+ ]]; then
    fail "lou --version printed: $out"
  fi
  ok "lou --version => $out"
}

assert_path_once() {
  local count
  count="$(grep -cF "$PREFIX/bin" "$HOME/.zshrc" 2>/dev/null || true)"
  if [[ "$count" != "1" ]]; then
    fail "the PATH line appears $count time(s) in ~/.zshrc after the upgrade re-run"
  fi
  ok "the PATH line was added exactly once"
}

main() {
  local home project init_out
  tmp="$(mktemp -d)"
  trap 'rm -rf "$tmp"' EXIT
  HOME="$tmp/home"
  PREFIX="$tmp/prefix"
  TARBALL="$tmp/lou.tar.gz"
  mkdir -p "$HOME" "$PREFIX"
  : >"$HOME/.zshrc"
  : >"$HOME/.bashrc"

  [[ -f "$INSTALLER" ]] || fail "installer not found at $INSTALLER"

  step "Building a tarball of the working tree"
  run_step "tar" tar -czf "$TARBALL" \
    --exclude node_modules \
    --exclude .git \
    --exclude .lou \
    -C "$ROOT" .
  [[ -s "$TARBALL" ]] || fail "the tarball is empty"

  step "Installing Lou into an isolated prefix"
  run_step "installer (fresh)" run_installer
  assert_version

  step "Re-running the installer (upgrade path)"
  run_step "installer (upgrade)" run_installer
  assert_path_once

  step "Running lou init in a fresh git project"
  home="$tmp/home"
  project="$tmp/project"
  mkdir -p "$project"
  (cd "$project" && git init -q)
  init_out="$(cd "$project" && HOME="$home" "$PREFIX/bin/lou" init 2>&1 || true)"
  if ! [[ "$init_out" == *"Project successfully onboarded."* ]]; then
    fail "lou init did not complete: $init_out"
  fi
  ok "lou init onboarded the fresh project"

  printf '\nSmoke test OK.\n'
}

main "$@"