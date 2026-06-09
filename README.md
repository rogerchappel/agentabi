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
`-h` arguments.

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

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for contribution expectations. Changes
should be small, reviewable, and verified before review.

## Security

See [SECURITY.md](SECURITY.md) for vulnerability reporting guidance.

## License

MIT
