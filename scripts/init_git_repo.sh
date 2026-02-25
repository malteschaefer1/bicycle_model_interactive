#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

if [[ -d .git ]]; then
  echo "Git repository already initialized."
  exit 0
fi

git init -b main

echo "Initialized git repository on branch 'main'."
echo "Next steps:"
echo "  1) ./scripts/prepublish_check.sh"
echo "  2) git add -A"
echo "  3) git commit -m 'Initial public release prep'"
