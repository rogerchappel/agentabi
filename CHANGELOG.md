# Changelog

All notable changes to this project will be documented in this file.

This project follows the [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)
format and uses semantic versioning when versioned releases are published.

## [Unreleased]

### Added

- Initial project setup.
- `npm run check:ci-runtime` now fails when the README-documented runtime
  matrix drifts from the CI matrix or when a workflow pins a Node version the
  README does not document.

### Fixed

- CI runtime documentation aligned with the nodejs.org release schedule:
  the verify matrix covers Node 26 (Current), the README no longer calls
  Node 24 the current runtime, and the macOS lifecycle probe uses
  actions/checkout v7 like every other workflow.
- Validate snapshot JSON structure before checks and diffs, with stable
  source-qualified diagnostics for malformed fields.
- Reject explicitly configured probes with empty arguments so agent commands
  cannot run without a version or help flag.
- Enforce probe deadlines across descendant process trees, including escalation
  for SIGTERM-resistant commands and bounded handling of inherited output pipes.

## Release Links

- Unreleased:
  `https://github.com/rogerchappel/agentabi/compare/...HEAD`
- Latest release:
  `https://github.com/rogerchappel/agentabi/releases/latest`

Replace placeholder links once the first release tag exists.
