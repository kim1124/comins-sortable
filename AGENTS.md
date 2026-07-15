# Comins Sortable AGENTS.md

## Ownership

- This repository is one independent Comins npm frontend module.
- Read this file and any closer `AGENTS.md` before changing code, documentation, tests, or release configuration.
- Apply the shared baseline in the Comins governance repository. Keep module-specific rules here.
- Do not use KMSF workspace commands, source synchronization, or release flows unless the maintainer explicitly requests migration-history work.

## Change Boundaries

- Preserve the documented public API, types, and package-local conventions unless the requested change explicitly expands them.
- Keep CSS classes and custom properties namespaced to this module. Do not apply global CSS resets.
- Keep external interaction engines behind module-owned adapters.
- Do not publish, tag, create a GitHub Release, or push a remote branch without an explicit maintainer command.

## Verification

- Define and run this repository's baseline verification command for meaningful changes.
- Run focused browser verification for browser-visible interaction, layout, rendering, or keyboard behavior changes.
- Classify failures as product behavior, test contract, or execution environment before changing code or repeating broad gates.

## Reporting

- For meaningful code, documentation, configuration, or test changes, update the repository's established report location with changed files, commands actually run, results, and residual risks.
- Do not create a worklog for inspection-only tasks unless the maintainer requests a durable report.
