<!-- comins-reference:managed-start contract=v1.6 -->
# Comins Module AGENTS.md

## Scope

- Keep the module Git boundary; use
  [Governance](https://github.com/kim1124/comins-governance) for common rules.

## Required Order

- Resolve the Git root and instructions. Follow Contract v1.6: license compliance; security and sensitive data; Comins common rules;
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
- Run final review or a broad gate only when the selected route requires it.
- On failure, preserve same-commit evidence and successful checks; classify and
  rerun only affected jobs or tests. A retry does not restart prior work.

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
<!-- comins-reference:managed-end -->

## Module Guidance

- The approved v1 scope provides sortable interactions for Vanilla JavaScript,
  React, Vue, and Svelte over one Vanilla TypeScript Core.
- The approved private development boundary has zero runtime dependencies;
  optional React, React DOM, Vue, and Svelte peers; and exact ESM exports `.`,
  `./core`, `./react`, `./vue`, `./svelte`, and `./styles.css`. Publishing,
  release versions, tags, and Releases remain separately maintainer-gated.
- The implemented private package boundary must validate with `npm run verify`.
  Browser and artifact gates apply only when their corresponding implementation
  tasks add them; do not invent publish gates.
