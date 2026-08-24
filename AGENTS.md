<!-- comins-reference:managed-start contract=v1.7 -->
# Comins Module AGENTS.md

## Common Policy

- Apply the canonical
  [Comins Contract v1.7](https://github.com/kim1124/comins-governance/blob/main/COMINS_CONTRACT.md)
  before the repository-owned `Module Guidance` below. Governance is the only
  common-policy owner; this managed block only routes to it.
- Load the Contract's license, sensitive-data, or release policy only when its
  corresponding stage is triggered.
- Keep module API, implementation, performance, browser, and checker commands
  in `Module Guidance`; the module owns their CI implementation.
<!-- comins-reference:managed-end -->

## Module Guidance

- This module is planned for sortable interactions in React applications.
- Its public API, runtime dependency, package configuration, and first-release scope are not defined; do not establish those boundaries without an explicit maintainer request.
- Until a package boundary exists, use `node scripts/check-licenses.mjs && node --test test/*.node.mjs` as the repository validation command; do not invent npm package or publish gates.
