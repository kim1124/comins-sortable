# Comins Sortable

Comins Sortable is a planned independent npm frontend module for sortable interaction in React applications.

## Status

This repository currently establishes project ownership, security reporting, and release policy. Its public API, runtime dependency choice, package configuration, and first release scope have not been defined.

## Governance

- Shared operating policy: [Comins Contract v1.4](https://github.com/kim1124/comins-governance/blob/main/COMINS_CONTRACT.md)
- Open-source policy: [Comins OSS License Policy](https://github.com/kim1124/comins-governance/blob/main/OSS_LICENSE_POLICY.md)
- License: [MIT](./LICENSE)
- Security reports: [SECURITY.md](./SECURITY.md)

## Verification

Run the repository baseline with:

```sh
node scripts/check-licenses.mjs
node --test test/*.node.mjs
```

`LICENSE_SCOPE.json` records the reviewed pre-package state. The license checker
compares it with Git-tracked dependency manifests, copied or generated code
paths, and repository assets. The current inventory is empty, so any newly
detected material fails closed until an evidence-aware change records its exact
source, version or revision, SPDX classification, use surface, obligations,
notices, and any required scoped approval.

Sortable still has no approved package boundary. Do not add `package.json`, npm
commands, package archives, or publish automation; package and exact-artifact
gates remain not applicable until that boundary is separately approved.
