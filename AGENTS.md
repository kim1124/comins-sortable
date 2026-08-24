<!-- comins-reference:managed-start contract=v1.7 -->
# Comins Module AGENTS.md

## Common Policy

- Before changing this repository, read the canonical
  [Comins Contract v1.7](https://github.com/kim1124/comins-governance/blob/main/COMINS_CONTRACT.md)
  once per run. For inspection-only work, load it only when a Contract stage
  is relevant. Stop if it is unavailable or its heading does not match this
  block's version. Governance is the only common-policy owner.
- Load the Contract's license, sensitive-data, or release policy only when its
  corresponding stage is triggered.
- Keep module API, implementation, performance, browser, and checker commands
  in `Module Guidance`; the module owns their CI implementation.
<!-- comins-reference:managed-end -->

## Module Guidance

- This module is planned for sortable interactions in React applications.
- Its public API, runtime dependency, package configuration, and first-release scope are not defined; do not establish those boundaries without an explicit maintainer request.
- Until a package boundary exists, use `node scripts/check-licenses.mjs && node --test test/*.node.mjs` as the repository validation command; do not invent npm package or publish gates.
