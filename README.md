# agentabi

Local-first CLI for snapshotting terminal coding-agent operational ABIs.

## Status

This repository is early-stage. Confirm the current support, release, and
security posture before using it in production.

## Install

From a checkout:

```sh
npm install
npm run build
npm link
```

## Use

Create a starter config:

```sh
agentabi init
```

Capture a deterministic local ABI snapshot:

```sh
agentabi capture --config agentabi.yaml --output agentabi.lock.json
```

Check the current machine against a committed lockfile:

```sh
agentabi check --config agentabi.yaml --lock agentabi.lock.json
```

Compare two snapshots:

```sh
agentabi diff baseline.json current.json --json
```

`check` exits non-zero when breaking changes are found.

## Config

```yaml
agents:
  - id: codex
    command: codex
    version:
      args: ["--version"]
    help:
      args: ["--help"]
    requiredEnv:
      - OPENAI_API_KEY
    permissionFlags:
      - "--sandbox"
toolCatalogs:
  - id: mcp
    path: tools.json
```

`agentabi` records only whether required environment variables are present, not
their values. Probes are restricted to safe `--version`, `-v`, `--help`, and
`-h` arguments. When a probe is configured, `args` must contain at least one of
those arguments; omit `version` or `help` entirely to use its default probe.

Agent IDs and tool-catalog IDs must be unique within the config. Snapshot
comparisons also reject duplicate agent IDs, catalog IDs, or tool names with
entry locations, rather than silently discarding one of the conflicting entries.

### Probe timeouts

Each probe has a 5-second deadline by default; set `timeoutMs` on that probe to
use a different positive duration. On POSIX systems, a probe runs in its own
process group. At the deadline, `agentabi` sends `SIGTERM` to the group, allows
a 250 ms cleanup grace period, and then sends `SIGKILL` to any remaining group
members. This prevents descendants that inherited stdout or stderr from keeping
the probe open.

On Windows, `agentabi` uses `taskkill /T /F` to terminate the process tree and
falls back to terminating the direct child if `taskkill` is unavailable. After
the same bounded grace period, inherited output pipes are closed so the probe
cannot wait indefinitely.

Timed-out results always set `timedOut` to `true` and `exitCode` to `null`.
`signal` is `SIGTERM` when a POSIX tree exits during the grace period and
`SIGKILL` when escalation (or the Windows forced tree fallback) is used. Output
captured before pipe closure is retained.

## Automation Examples

Cron:

```cron
0 8 * * * cd /path/to/repo && agentabi check --config agentabi.yaml --lock agentabi.lock.json
```

Multi-agent runner preflight:

```sh
agentabi check --config agentabi.yaml --lock agentabi.lock.json
your-agent-workflow-command
```

## Verify

Run the local validation script before opening a pull request:

```sh
npm test
npm run check
npm run build
npm run smoke
npm run package:smoke
npm run release:check
bash scripts/validate.sh
```

`scripts/validate.sh` runs typecheck, tests, build, smoke, packaging checks, and
`agent-qc ready` when `agent-qc` is installed. Missing `agent-qc` is treated as
a skip, not a failure.

The CI release gate runs on Node 20, the minimum version declared by
`engines.node`, and Node 24, the current supported runtime. The macOS lifecycle
stress job and release workflows use Node 24. `npm run check:ci-runtime` keeps
the CI matrix aligned with the declared minimum.

## Limitations

- `agentabi` captures configured command, help, version, environment-presence,
  and tool-catalog signals; it does not prove an agent's runtime behavior is
  compatible.
- Probes are intentionally limited to safe help and version style arguments.
  Workflows that need deeper integration checks should add separate project
  tests.
- Lockfiles can expose local command names, configured tool IDs, and whether
  required environment variables were present. Review snapshots before sharing
  them outside a trusted repository.

## Verification

Run the local quality gates before opening a pull request:

```sh
npm run lint
npm test
npm run smoke
```

`npm run lint` is an alias for the repository static check so contributors can use the common npm workflow without guessing the project-specific command.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for contribution expectations. Changes
should be small, reviewable, and verified before review.

## Security

See [SECURITY.md](SECURITY.md) for vulnerability reporting guidance.

## License

MIT
