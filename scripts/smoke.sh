#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$repo_root"

tmpdir="$(mktemp -d)"
trap 'rm -rf "$tmpdir"' EXIT

node dist/cli.js capture --config examples/agentabi.yaml --output "$tmpdir/agentabi.lock.json"
node dist/cli.js check --config examples/agentabi.yaml --lock "$tmpdir/agentabi.lock.json"
node dist/cli.js diff "$tmpdir/agentabi.lock.json" "$tmpdir/agentabi.lock.json" --json > "$tmpdir/report.json"

node -e "const report=require(process.argv[1]); if (!report.ok) process.exit(1)" "$tmpdir/report.json"

printf 'smoke passed\n'
