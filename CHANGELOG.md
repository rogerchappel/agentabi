# Changelog

All notable changes to this project will be documented in this file.

This project follows the [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)
format and uses semantic versioning when versioned releases are published.

## [Unreleased]

### Added

- Initial project setup.

### Fixed

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
