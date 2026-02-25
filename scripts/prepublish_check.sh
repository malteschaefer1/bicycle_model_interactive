#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

echo "[1/4] Running tests and validation..."
./scripts/run_checks.sh

echo "[2/4] Checking required public files..."
required_files=(
  "README.md"
  "GETTING_STARTED.md"
  "PUBLISHING.md"
  "LICENSE"
  "CONTRIBUTING.md"
  "CODE_OF_CONDUCT.md"
  "SECURITY.md"
  "docs/model/README.md"
  "docs/model/BACKGROUND.md"
  "docs/model/VALIDATION.md"
  ".github/workflows/ci.yml"
  ".github/ISSUE_TEMPLATE/bug_report.md"
  ".github/ISSUE_TEMPLATE/feature_request.md"
  ".github/pull_request_template.md"
)

for file in "${required_files[@]}"; do
  if [[ ! -f "$file" ]]; then
    echo "Missing required file: $file"
    exit 1
  fi
done

echo "[3/4] Checking local-only paths are not tracked..."
local_only_paths=(
  ".codex"
  "docs/ai"
  "docs/codex"
  ".github/codex-workflows"
  "AGENTS.md"
  "scripts/update_state.py"
  "scripts/init_template.py"
)

if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  for path in "${local_only_paths[@]}"; do
    if git ls-files --error-unmatch "$path" >/dev/null 2>&1; then
      echo "Local-only path is tracked (should not be): $path"
      exit 1
    fi
  done
else
  echo "Warning: not a git repository yet; skipping tracked-path check."
fi

echo "[4/4] Quick tree sanity check..."
for dir in model scripts tests docs .github; do
  if [[ ! -d "$dir" ]]; then
    echo "Missing expected directory: $dir"
    exit 1
  fi
done

echo "Prepublish checks passed."
