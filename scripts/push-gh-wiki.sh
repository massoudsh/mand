#!/usr/bin/env bash
# Sync docs/gh-wiki/*.md into the GitHub wiki (massoudsh/mand.wiki.git).
# Requires: git push access to the repo (SSH key or HTTPS credential helper
# already configured — this script does NOT handle auth).
#
# Usage: ./scripts/push-gh-wiki.sh

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
WIKI_URL="https://github.com/massoudsh/mand.wiki.git"
TMP_DIR="$(mktemp -d)"

trap 'rm -rf "$TMP_DIR"' EXIT

echo "==> Cloning wiki repo..."
git clone --depth 1 "$WIKI_URL" "$TMP_DIR"

echo "==> Copying docs/gh-wiki/*.md -> wiki repo..."
cp "$REPO_ROOT"/docs/gh-wiki/*.md "$TMP_DIR"/

cd "$TMP_DIR"
git add -A

if git diff --cached --quiet; then
  echo "==> No changes to push. Wiki already up to date."
  exit 0
fi

git commit -m "docs: sync wiki from docs/gh-wiki/ (engines, roadmap phase 2, explainability)"
git push origin main 2>/dev/null || git push origin master

echo "==> Done. See https://github.com/massoudsh/mand/wiki"
