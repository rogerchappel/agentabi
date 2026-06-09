# agentabi Orchestration Plan

`agentabi` is intended to run as a local preflight before agent workflows that
depend on terminal commands, environment contracts, and MCP tool catalogs.

## Recommended Flow

1. Commit an `agentabi.yaml` config and a known-good ABI lockfile.
2. Run `agentabi check --config agentabi.yaml --lock agentabi.lock.json` before
   starting multi-agent or CI automation.
3. Review any breaking changes before updating the lockfile.

## Release Checks

Run these checks before opening a release PR:

```sh
npm run release:check
node /path/to/releasebox/bin/releasebox.js check .
```
