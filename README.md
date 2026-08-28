# Comins Sortable

Comins Sortable is an independent npm frontend module that provides sortable
interaction for Vanilla JavaScript, React, Vue, and Svelte over one Vanilla
TypeScript Core.

`TypeScript` · `Vanilla JS` · `React` · `Vue` · `Svelte` · `Vite` ·
`Playwright` · `Zero runtime dependencies`

![Comins Sortable Playground moving a controlled item between React lists](https://raw.githubusercontent.com/kim1124/comins-sortable/main/docs/assets/sortable-playground.gif)

The animation is captured from the real Comins Sortable Playground.

## Status

The next public candidate is `comins-sortable@0.1.1`. Its
Vanilla TypeScript Core and Vanilla, React, Vue, and Svelte adapters implement
reorder, transfer, and copy interactions with commit verification and rollback.
The Playground currently provides 20 routes. Seventeen implement the planned
Vue.Draggable parity contracts, including animation, custom hosts, non-item
siblings, and nested sortable areas. Empty Destination, Accept/Reject, and Auto
Scroll are additional Comins examples. Runtime dependencies are not allowed.
React, React DOM, Vue, and Svelte are optional peers.

Version `0.1.0` was withdrawn on 2026-08-28 after a public identity metadata
incident and cannot be reused. No version is currently available from npm.
Publishing `0.1.1`, tags, and GitHub Releases remain separately maintainer-gated.

## Installation

```sh
npm install comins-sortable
```

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

## Browser evidence

The automated browser gate covers Chromium, Firefox, and Playwright WebKit.
Playwright WebKit is engine-compatibility evidence, not Safari certification.
Actual Safari remains uncertified until it is verified in Safari. Physical
touch or pen certification is intentionally deferred and is not implied by the
automated Pointer Events coverage.
