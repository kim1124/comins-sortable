# PR maintenance — 2026-10-11

## Scope and decisions

- PR #27: merged the reviewed development minor/patch lockfile updates after its required CI passed. Merge commit: `e5396b814682ccecddc7c900e93f2a439a8d73dc`. The package manifest, public exports and optional peer contract remain unchanged.
- PR #21: retain `actions/setup-node` v7.0.0 at the exact reviewed commit `820762786026740c76f36085b0efc47a31fe5020` in the Verify workflow. Align the deterministic sensitive-data contract test with that pin; no permissions, events or credential handling change.
- PR #23: closed without merging the conflicting Vite 8 major upgrade. A future migration must explicitly validate the Rolldown/Oxc toolchain transition, fixture builds, Playground and browser/performance checks. See the [official Vite migration guide](https://vite.dev/guide/migration.html).
- These three remote operations were explicitly approved by the maintainer. No version change, npm publication or deployment is included.

## Changed files

- `.github/workflows/verify.yml`: four exact setup-node pins supplied by PR #21.
- `test/sensitive-data-gates.node.mjs`: expected setup-node pin.
- This maintenance report.

## Verification

- Reproduced PR #21's failing pin-contract check in an isolated source archive before changing the expectation (RED); changing only the expected SHA passed the same check (GREEN).
- License and sensitive-data contract tests: 28 passed.
- Candidate `6b79ab2ec890509afb647ebb36ae0fa6e996b3e9` was cloned into a separate checkout without generated output or shared `node_modules`. `npm ci --ignore-scripts` and `npm run verify` passed: 57 policy tests, 292 unit tests, typecheck, build, public type tests and Vue SFC positive/negative checks.
- Public Git identity range check and diff whitespace check passed. The identity checker requires full commit SHAs; an initial invocation with abbreviated SHAs was rejected and corrected without changing source.
- Codex Security diff scan of `e5396b814682ccecddc7c900e93f2a439a8d73dc..6b79ab2ec890509afb647ebb36ae0fa6e996b3e9` completed with both changed files reviewed and zero reportable findings. External Action internals and GitHub host settings are outside this bounded review. Scan ID: `98ae3568-e9a8-4dd9-95f9-f450af75d425`. An initial coverage-schema submission was rejected; the corrected draft was accepted and sealed. Tool-reported usage is 1,886,516 total tokens (including cached rollout context), not a dedicated two-file-only billing estimate.
- PR #21's remote CI and integration result are recorded by its checks and merge status.

## Remaining scope

Vite 8 adoption is deferred to a separate migration. Browser and performance suites are not repeated locally for the CI-pin/test-only change; PR #27's dependency update had already passed its full CI. Runtime source, API and package version remain at the existing 0.1.5 release.
