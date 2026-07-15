# Comins Sortable AGENTS.md

## Scope

- This repository is one independent Comins npm frontend module.
- Read this file and any closer `AGENTS.md`; adopt Comins Contract v1.1 and read the governance source explicitly for policy, security, release, or public API work.
- Do not use KMSF workspace commands, source synchronization, or release flows without a migration-history request; keep `AGENTS.override.md` uncommitted and temporary.
- Use `gpt-5.6-sol` with `xhigh` reasoning as the default for all Comins work.
- For vulnerability investigation, runtime memory leaks, retention, out-of-memory failures, or security work, use `gpt-5.6-sol` with at least `xhigh`.
- For instruction planning, Plan mode, or authoring or updating an implementation plan, use `gpt-5.6-sol` with at least `max`.

## Change Boundaries

- Preserve documented APIs, types, and package-local conventions unless the request explicitly expands them.
- Namespace CSS and custom properties, avoid global resets, and keep external engines behind module-owned adapters.
- Do not publish, tag, create a GitHub Release, or push a remote branch without an explicit maintainer command.

## Verification

- Define and run the baseline verification command for meaningful changes, plus focused browser verification for interaction, layout, rendering, or keyboard behavior.
- Classify failures as product behavior, test contract, or execution environment before changing code or repeating broad gates.

## Reporting

- For behavior, public API, configuration, security, release, or test-contract changes, update the established report with changed files, commands, results, and residual risks; do not create one for inspection-only work without a maintainer request.
