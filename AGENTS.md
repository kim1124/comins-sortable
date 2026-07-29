<!-- comins-reference:managed-start contract=v1.3 -->
# Comins Module AGENTS.md

## Scope

- Treat this as an independent Comins Git boundary. Read closer `AGENTS.md`; load [Governance](https://github.com/kim1124/comins-governance) for API, security, license, or release policy.
- Keep KMSF historical; never commit `AGENTS.override.md`.

## Work Routing

- **Inspection or research:** evidence only; no edits, reports, or product gates.
- **Documentation, guidance, or configuration:** edit directly; run matching reference, instruction, parse, and diff checks.
- **Clear local behavior:** define acceptance/reproduction, add a regression test first when it materially improves confidence, implement, then run focused and baseline checks once.
- **Complex or high-risk:** close decisions, plan if needed, test incrementally, then run the applicable broad gate once.
- **Security, release, external, or destructive:** follow Governance and obtain approval.

## Required Order

- Follow Contract order: repository/instructions, Contract/scope/authority, security, licensing, module rules, implementation, verification, Git/PR, exact-artifact release, closure/reporting. Mark only untriggered gates N/A; otherwise fail closed.

## Change Boundaries

- Preserve public APIs/types/conventions unless authorized; namespace CSS, avoid global resets, and isolate external engines behind adapters.
- Remote writes, publishing, tags, and Releases require explicit approval.

## Sensitive Data

- Adopt Contract v1.3 and `SENSITIVE_DATA_STANDARD.md`. Never track personal names, personal email addresses, local account paths, credentials, tokens, secrets, or value-derived fingerprints except canonical-source third-party legal text only when legally required; omit personal contact details when a project URL suffices.
- Otherwise use only an approved public handle, GitHub noreply identity, service identity, explicit placeholder, or repository-relative path; run required Gitleaks/security CI and, when a package boundary exists, the exact package-artifact gate.
- Redact detector output, fail closed when unavailable, and audit legacy exposure separately.

## Open Source Licensing

- Adopt Contract v1.3 and Governance `OSS_LICENSE_POLICY.md`; classify dependencies, copied/generated code, and assets by exact version and use surface.
- Run affected license gates; fail closed on incomplete or unapproved evidence and include required notices/texts in artifacts.

## Verification

- Match checks to change type; report omissions and classify failures as product, test-contract, or environment before retrying.

## Reporting

- Report meaningful behavior/API/config/security/release/test-contract changes when customary.
- For a public release only, post-publication closure requires Governance evidence, default-branch reconciliation, and remaining branches/worktrees; deletion needs separate approval.
<!-- comins-reference:managed-end -->

## Module Guidance

- This module is planned for sortable interactions in React applications.
- Its public API, runtime dependency, package configuration, and first-release scope are not defined; do not establish those boundaries without an explicit maintainer request.
- Until a package boundary exists, use `node scripts/check-licenses.mjs && node --test test/*.node.mjs` as the repository validation command; do not invent npm package or publish gates.
