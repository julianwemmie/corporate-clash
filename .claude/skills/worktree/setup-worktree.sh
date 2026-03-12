#!/usr/bin/env bash
set -euo pipefail

if [ $# -lt 1 ]; then
  echo "Usage: setup-worktree.sh <branch-name>"
  exit 1
fi

BRANCH="$1"
REPO_ROOT="$(git rev-parse --show-toplevel)"
REPO_DIRNAME="$(basename "$REPO_ROOT")"
WORKTREE_PATH="$(dirname "$REPO_ROOT")/${REPO_DIRNAME}-${BRANCH}"

# Create the worktree
if git show-ref --verify --quiet "refs/heads/${BRANCH}"; then
  echo "Branch '${BRANCH}' exists, checking it out in worktree..."
  git worktree add "$WORKTREE_PATH" "$BRANCH"
else
  echo "Creating new branch '${BRANCH}' and worktree..."
  git worktree add -b "$BRANCH" "$WORKTREE_PATH"
fi

# Install dependencies
echo ""
echo "Installing dependencies..."
cd "$WORKTREE_PATH"
bun install

# Summary
echo ""
echo "=== Worktree ready ==="
echo "Path:    ${WORKTREE_PATH}"
echo "Branch:  ${BRANCH}"
echo ""
echo "To start working:"
echo "  cd \"${WORKTREE_PATH}\""
echo "  bun run dev"
