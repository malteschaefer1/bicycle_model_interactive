#!/usr/bin/env bash
set -euo pipefail

node --test tests/bicycle_dynamics.test.js tests/reference_cases.test.js tests/model_validation.test.js tests/ui_render_bootstrap.test.js
node scripts/model_validation.js --samples 50000
