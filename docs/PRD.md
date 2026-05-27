# agentabi PRD

Status: in-progress

## Summary

`agentabi` is a local-first CLI that snapshots the operational ABI of terminal coding agents: command paths, versions, environment expectations, permission flags, MCP/tool catalogs, and smoke-command behavior. It gives developers a small, reviewable `agentabi.lock.json` so cron jobs and multi-agent runners can detect when an agent upgrade changed the contract they depend on.

## Source attribution

Inspired by the 2026 shift toward terminal-native coding agents and reports comparing Codex CLI, Claude Code, Gemini CLI, OpenCode, Aider, and Goose. Those sources highlight that harness behavior, permissions, and tool schemas are now part of the developer workflow surface, but the idea here is reframed as an offline ABI checker rather than another agent runner.

## Problem

Developers increasingly automate agents via shell, cron, hooks, and orchestrators. A minor agent update can rename a flag, change default sandboxing, alter MCP tool output, or require a new environment variable. Those changes are usually discovered only after an automation run fails.

## Users

- Developers running local coding-agent automations.
- Agentic workflow maintainers who pin behavior across laptops and CI.
- OSS maintainers who want reproducible setup notes for agent contributors.

## V1 Goals

- Capture a deterministic ABI snapshot from a YAML config.
- Probe local commands with safe `--version`/`--help` commands only.
- Read optional tool catalog JSON from files or stdin.
- Diff two snapshots with breaking/warning/info severities.
- Provide `init`, `capture`, `diff`, and `check` CLI commands.
- Include fixture-backed tests and smoke scripts.

## Non-Goals

- Running autonomous agents.
- Calling hosted LLM APIs.
- Enforcing security policy beyond reporting changes.

## CLI

```bash
agentabi init
agentabi capture --config agentabi.yaml --output agentabi.lock.json
agentabi diff baseline.json current.json
agentabi check --config agentabi.yaml --lock agentabi.lock.json
```

## Acceptance Criteria

- Works without network access.
- Produces stable JSON output sorted by keys.
- Redacts environment values and records only presence/absence.
- Exits non-zero when `check` finds breaking changes.
- README includes practical cron and multi-agent examples.
