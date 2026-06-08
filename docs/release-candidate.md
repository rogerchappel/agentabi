# Release Candidate Checklist

Use this checklist before publishing an AgentABI package or tagging a release.

## Verification

- Run `npm run release:check`.
- Confirm `npm run smoke` still exercises the configured ABI capture and comparison path.
- Inspect `npm pack --dry-run` output and confirm it includes `dist`, `examples`, `README.md`, `LICENSE`, and `SECURITY.md`.

## Evidence

- Save the config and lockfile shape when capture output changes.
- Include any probe, diff, or check exit-code changes in release notes.
- Note whether command receipt redaction behavior changed.

## Support Notes

- Probes should remain local and limited to safe help/version commands.
- Do not publish environment variable values or private tool catalogs.
