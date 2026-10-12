# Vite 8 / Lightning CSS license review for 0.1.6

## Proposed scope — approval pending

- Component: Lightning CSS 1.33.0 and 11 platform-specific optional binary packages,
  each locked at 1.33.0 with exact npm integrity values.
- License: MPL-2.0. Installed root package metadata and canonical LICENSE agree.
- Use: unmodified development-only tooling brought in by Vite 8.3.4 for Playground
  CSS minification. No runtime package dependency or optional peer boundary change.
- Conditions: do not copy, modify, bundle or distribute the tool code/binaries in
  comins-sortable. Retain upstream files in development installations.
- Invalidation: any component/version/integrity/license/use/distribution change
  requires another scoped maintainer review. Other MPL components are not covered.
- Approver role: maintainer; approval is pending and must not be inferred from
  the earlier authorization to investigate Vite 8.

## Evidence

The exact PR #39 checkout installed with scripts disabled and passed the existing
TypeScript package build and Vite 8 Playground build without configuration edits.
The package builder uses tsc and copies only first-party CSS; the Vite Playground
output is not included by package.json files. A text inspection found no
lightningcss/MPL references in the emitted library or Playground output. This
supports the reviewed usage boundary, not a legal-compliance certification.

The exact 12 package metadata/integrity records are retained under ignored local
evidence. The final canonical release workflow must still pack and verify the
exact 0.1.6 artifact against the approved boundary before staging.

[MPL FAQ](https://www.mozilla.org/en-US/MPL/2.0/FAQ/) explains that use is allowed
and obligations apply when covered software is distributed. Applying that to
this unmodified, non-distributed build-tool boundary is the scoped review
rationale. New distribution or modification changes that assessment.

[Vite migration guide](https://vite.dev/guide/migration.html) documents the
Rolldown/Oxc and default Lightning CSS changes. This repository retains its
explicit es2020 Playground target and separate TypeScript package builder.
Full consumer/browser/resource gates remain required after final integration.

## Enforcement proposal

The current checker rejects all non-routine licenses and has no approved
non-distributed development-tool record path. Add an exact recorded approval
for this component group; require the locked paths, version, license, integrity
and development-only metadata to match. Reject missing, pending, stale or
expanded records. Keep copied/bundled/distributed material outside this approval.
No general MPL routine-license allowance is proposed.

## Exact reviewed package records

The following proposed records are **not approved yet**. Each is development-only.
An integrity value identifies the reviewed registry artifact; it is not a credential.

```json
[
  {
    "path": "node_modules/lightningcss",
    "version": "1.33.0",
    "license": "MPL-2.0",
    "integrity": "sha512-WkUDrojuJs0xkgGf2udWxa3yGBRxPtxUkB79i6aCZLRgc7PM8fZe9TosfPDcvEpQZbuFASnHYmRLBLUbmLOIIA==",
    "dev": true
  },
  {
    "path": "node_modules/lightningcss-android-arm64",
    "version": "1.33.0",
    "license": "MPL-2.0",
    "integrity": "sha512-gEpRTalKdosp4Bb8qWtc2iOgE5SeIHlpS1up9bFq2wAyYhl1UdTObYiHe98zEM9SQvSoqQZ1IQD0JNpg3Ml5pg==",
    "dev": true
  },
  {
    "path": "node_modules/lightningcss-darwin-arm64",
    "version": "1.33.0",
    "license": "MPL-2.0",
    "integrity": "sha512-Sciaz8eenNTKn9b3t7+xr0ipTp9YxKQY4npwQ3mrRuL0BAVHBLyZxofhaKBAVtzmtRZ/zTyo0/to4B1uWG/Djg==",
    "dev": true
  },
  {
    "path": "node_modules/lightningcss-darwin-x64",
    "version": "1.33.0",
    "license": "MPL-2.0",
    "integrity": "sha512-Z5UPAxzrjlWNNyGy6i65cJzzvgJ5D3T6wMvs+gWpY9d7qRhANrxqAp6LhxIgZhWEw18RfJTGcRxjuLIBr+m8XQ==",
    "dev": true
  },
  {
    "path": "node_modules/lightningcss-freebsd-x64",
    "version": "1.33.0",
    "license": "MPL-2.0",
    "integrity": "sha512-QQM/Ti/hQajJwCY+RiWuCZ9sdtI/XQk7nDK5vC8kkdwixezOlDgvDx7+RT+QjK6FcFT4MpsuoBnHIo/O3StRRg==",
    "dev": true
  },
  {
    "path": "node_modules/lightningcss-linux-arm-gnueabihf",
    "version": "1.33.0",
    "license": "MPL-2.0",
    "integrity": "sha512-N7FVBe6iS24MlM6R/4RBTxGhQheZGs7tiQ9U32UtF75NzP5Q7xWPRqLBCKxlRQRk3rY1jCIPLzx7WzOhuUIRLQ==",
    "dev": true
  },
  {
    "path": "node_modules/lightningcss-linux-arm64-gnu",
    "version": "1.33.0",
    "license": "MPL-2.0",
    "integrity": "sha512-j2v/itmy4HlNxlc6voKXYgBqNi0Ng2LShg4z7GufpEgs05P+2suBVyi9I6YHq5uoVFx9ETin3eCEhLVyXGQnKg==",
    "dev": true
  },
  {
    "path": "node_modules/lightningcss-linux-arm64-musl",
    "version": "1.33.0",
    "license": "MPL-2.0",
    "integrity": "sha512-yiO5ROMuYQgXbC60yjZU5CYSFZGKXL0HFATXt9mHJn1+zW55oCtMI9NfcVhYLMFDL7gV7oBPon/EmMMGg2OvtQ==",
    "dev": true
  },
  {
    "path": "node_modules/lightningcss-linux-x64-gnu",
    "version": "1.33.0",
    "license": "MPL-2.0",
    "integrity": "sha512-ar+Ju7LmcN0Jo4FpL4hpFybwNG9/3A/Br5KW2n2jyODg3MEZXaDYADdemoNS+BDNfMgKvylJLj4S5tyRActuAg==",
    "dev": true
  },
  {
    "path": "node_modules/lightningcss-linux-x64-musl",
    "version": "1.33.0",
    "license": "MPL-2.0",
    "integrity": "sha512-RYiYbkokw0trfKqqzfF55lginwEPrD3OJDfTuJzFs1MK6iFnDenaz1fqLLtX4ITG3OktJQXOeTaw1awrBAlZPw==",
    "dev": true
  },
  {
    "path": "node_modules/lightningcss-win32-arm64-msvc",
    "version": "1.33.0",
    "license": "MPL-2.0",
    "integrity": "sha512-1K+MPfLSFVpphzpdbfkhlWk6wBrTObBzS2T6db10PNOZgR9GoVsAWzwNyuhUYYbTp23j+4RrncfujZ4uAzXvwA==",
    "dev": true
  },
  {
    "path": "node_modules/lightningcss-win32-x64-msvc",
    "version": "1.33.0",
    "license": "MPL-2.0",
    "integrity": "sha512-OlEICDx/Xl0FqSp4bry8zFnCvGpig3Gl4gCquvYwHuqJKEC1+n9NgDniFvqHGmMv1ZkqDJrDqKKSykTDX+ehuA==",
    "dev": true
  }
]
```
