# Comins Sortable

Comins Sortable is an independent npm frontend module that will provide sortable
interaction for Vanilla JavaScript, React, Vue, and Svelte over one Vanilla
TypeScript Core.

## Status

The repository has an approved private development package boundary. Its
Vanilla TypeScript Core and Vanilla, React, Vue, and Svelte adapters implement
reorder, transfer, and copy interactions with commit verification and rollback.
The Playground currently provides 9 of 17 planned parity routes. Runtime
dependencies are not allowed. React, React DOM, Vue, and Svelte are optional
peers.

The development package is `private` and uses version
`0.0.0-development`. Publishing, release versions, tags, and GitHub Releases
require separate maintainer approval.

## Governance

- Shared operating policy: [Comins Contract v1.7](https://github.com/kim1124/comins-governance/blob/main/COMINS_CONTRACT.md)
- Open-source policy: [Comins OSS License Policy](https://github.com/kim1124/comins-governance/blob/main/OSS_LICENSE_POLICY.md)
- License: [MIT](./LICENSE)
- Security reports: [SECURITY.md](./SECURITY.md)

## Verification

Install the reviewed lockfile without lifecycle scripts and run the package
gate:

```sh
npm ci --ignore-scripts
npm run verify
```

`npm run verify` checks the package-aware license scope, security policy tests,
TypeScript, unit tests, the ES2020 ESM build, and public type fixtures.

`LICENSE_SCOPE.json` records the reviewed runtime, peer, copied/generated, and
asset surfaces. The license checker verifies the manifest and lockfile root,
requires every lock entry to have a routine SPDX classification, and fails
closed for missing or unreviewed material. A manual-review result exposes only
the package name, SPDX expression, and use surface.
