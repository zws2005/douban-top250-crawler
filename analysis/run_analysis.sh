#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PY="$ROOT/analysis/run_python.sh"
bash "$PY" "$ROOT/analysis/clean_analyze.py"
bash "$PY" "$ROOT/analysis/advanced_analysis.py"
bash "$PY" "$ROOT/dashboard/generate_dashboard.py"
