# agentabi Orchestration Plan

`agentabi` is intended to run as a local preflight before agent workflows that
depend on terminal commands, environment contracts, and MCP tool catalogs.

## Safe Automation Boundary

- Run only local `agentabi` commands and configured help/version probes.
- Do not send captured snapshots or tool catalogs to external services by default.
- Treat environment variables as presence checks only; never record their values.

## Recommended Flow

1. Commit an `agentabi.yaml` config and a known-good ABI lockfile.
2. Run `agentabi check --config agentabi.yaml --lock agentabi.lock.json` before
   starting multi-agent or CI automation.
3. Review any breaking changes before updating the lockfile or continuing to the downstream workflow command.

## Release Checks

Run these checks before opening a release PR:

```sh
npm run release:check
node /path/to/releasebox/bin/releasebox.js check .
```

Also review `docs/release-candidate.md` and include changed probe, diff, or redaction behavior in release notes.
