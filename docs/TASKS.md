# agentabi Release Tasks

Use this checklist for every release candidate. Keep each item small enough to
verify locally before tagging.

## Required Checks

- Run `npm install` or `npm ci` from a clean checkout.
- Run `npm run release:check`.
- Run `releasebox check .` when `releasebox.config.json` is present.
- Regenerate `RELEASE_NOTES.md` with `releasebox notes .`.
- Review `npm pack --dry-run` output for accidental omissions or extra files.

## Manual Review

- Confirm the README install, capture, check, and diff examples still match the
  CLI.
- Confirm `examples/agentabi.yaml` uses only safe probe arguments.
- Confirm no required environment variable values are written to fixtures,
  docs, snapshots, or logs.
- Confirm breaking diff severities are intentional and documented in the
  changelog or release notes.

## Tagging

- Do not tag until all required checks pass.
- Push the release branch for review before creating a GitHub release.
- Let the release workflow create the GitHub release artifact from the tag.
