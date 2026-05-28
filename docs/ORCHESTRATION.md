# agentabi Orchestration Plan

`agentabi` is intentionally local-first. Release and automation flows should
avoid hosted services except for source control, package registry publishing,
and GitHub release creation.

## Local Maintainer Flow

1. Install dependencies with `npm install`.
2. Make focused changes and keep commits atomic.
3. Run `npm run release:check`.
4. Run `releasebox check .`.
5. Refresh `RELEASE_NOTES.md` with `releasebox notes .`.
6. Push the branch for review.

## CI Flow

- `CI` validates repository hygiene and Node build/test coverage on pull
  requests and `main`.
- `Release dry run` installs ReleaseBox, runs readiness checks, runs
  `npm run release:check`, and previews release notes.
- `Release` runs on version tags, builds the npm package, generates release
  notes, and creates the GitHub release artifact.

## Cron And Runner Usage

- Capture a lockfile after reviewing intentional agent or tool changes.
- Run `agentabi check --config agentabi.yaml --lock agentabi.lock.json` before
  scheduled agent jobs.
- Treat a non-zero `check` exit as a stop signal for the downstream agent run.
- Review warning and info findings before accepting a refreshed lockfile.
