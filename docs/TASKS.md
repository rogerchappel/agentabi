# agentabi Task Breakdown

## Completed MVP Scope

- Capture local command help, version, required environment presence, and tool catalog fingerprints.
- Compare snapshots and classify breaking, warning, and informational ABI changes.
- Provide CLI flows for `init`, `capture`, `check`, and `diff`.
- Keep verification local with tests, smoke checks, package dry-run checks, and release-candidate guidance.

## Current Release Readiness

- Keep snapshot schema changes covered by fixture-backed tests.
- Keep README command examples synchronized with package scripts.
- Include `README.md`, `LICENSE`, and `SECURITY.md` in npm package contents.
- Run `npm run release:check` before release PRs.

## Follow-up Candidates

- Add more fixture catalogs for common MCP and terminal-agent setups.
- Add a JSON schema for `agentabi.yaml` once the config shape stabilizes.
- Document upgrade guidance for lockfile format changes.
- Extend tool catalog normalization fixtures when new MCP schema shapes appear.
- Document known limitations for commands that do not expose stable help/version output.
