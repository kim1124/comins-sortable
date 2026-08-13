<!-- comins-reference:managed-start contract=v1.5 -->
# Comins Module AGENTS.md

## Scope

- Comins Git boundary. Read `AGENTS.md`; use
  [Governance](https://github.com/kim1124/comins-governance) for rules.
- Keep KMSF historical; never commit `AGENTS.override.md`.

## Required Order

- Resolve the Git root and instructions. Follow Contract v1.5: license compliance; security and sensitive data; Comins common rules;
  module rules; smallest change and affected checks; Git, pull request, and CI; release checks only when publishing.

## Work Routing

- **Inspection or research:** report evidence only.
- **Documentation or configuration:** direct edit and matching checks.
- **Product behavior:** acceptance, smallest change, affected checks.
- Plan only for high-risk ambiguity.
- General-purpose skills and historical plans must not expand the selected route
  or trigger unrelated checks.
- Subagents require explicit maintainer delegation or approved independent
  parallel work. Never pass full history; use bounded briefs and paths.
- Default: one final review and one required broad gate after the final change.
  Recheck affected failures; reuse unchanged evidence.

## Common Boundaries

- Preserve public APIs and types; keep CSS and external engines module-scoped.
- Apply Governance `OSS_LICENSE_POLICY.md` and `SENSITIVE_DATA_STANDARD.md`; the
  module owns its checker commands and CI implementation.
- Remote writes, publishing, tags, Releases, policy exceptions, and destructive
  operations require explicit approval.
- Name new Codex development branches `codex-<short-feature-name>`; append `-2`,
  `-3`, and so on for additional work under the same feature.
  Existing and provider-managed branches are exempt.

## Verification

- Run affected checks only. A failed required gate blocks the workflow;
  unrelated gates are not substitutes.
- Report changes, checks, omissions, and blockers. Release closure applies only
  to publication.
<!-- comins-reference:managed-end -->

## Module Guidance

- This module is planned for sortable interactions in React applications.
- Its public API, runtime dependency, package configuration, and first-release scope are not defined; do not establish those boundaries without an explicit maintainer request.
- Until a package boundary exists, use `node scripts/check-licenses.mjs && node --test test/*.node.mjs` as the repository validation command; do not invent npm package or publish gates.
