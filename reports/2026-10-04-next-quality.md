# Next quality implementation — 2026-10-04

## Scope and baseline

- Completed local verification and documentation: 2026-10-04 17:08 KST.
- Base source: `21713d9`, package version remains `0.1.4`.
- Excluded: keyboard sorting, Galaxy/physical-device validation, website repository work, remote writes and publication.
- Plan: `docs/superpowers/plans/2026-10-04-sortable-next-quality.md`.
- README optimization was added by the maintainer to the approved implementation scope.
- Baseline `npm run verify`: PASS before implementation.

## Decisions

- Worktree file writes were blocked by the environment. The unused managed worktree was archived; implementation uses branch `codex-next-quality` in the permitted checkout, preserving the existing local commit.
- Evidence/ledger remain under ignored `.local/next-quality/`.
- Vue tooling requires the JavaScript TypeScript compiler API. Keep the package's TypeScript 7 and use pinned development-only `typescript-sfc` alias 6.0.3 with vue-tsc 3.3.12; their licenses are Apache-2.0 and MIT.
- Browser touch checks use the existing Playground handle/empty/auto-scroll routes, avoiding test-only controls in product fixture adapters.
- README now prioritizes consumer quick start and adapter/guide navigation. Local Playground instructions include a fresh package build.

## Changes

- Core: disabled/zero-duration animation no longer measures or retains item rectangles; registry validation shares collected IDs within one synchronous read.
- Vanilla: registration seeds the DOM transaction footer boundary, matching the Core preview after external list clearing.
- Vue: SFC inference uses a props-aware generic constructor without the unknown-valued runtime constructor. Component statics, normal instance properties and attributes remain typed. Emits use writable copies, including frozen rollback inputs.
- Tooling: devalue 5.9.4; pinned vue-tsc 3.3.12/TypeScript 6.0.3 alias for SFC checks; explicit TypeScript 7 path for package typecheck/build.
- Tests: real Chromium touch scenarios, expanded text-selection end states, true SFC positive/negative consumers, CI route contract, benchmark fixture and runner.
- README: installation/consumer example first; adapter table and focused links replace detailed API repetition and release-operation links. GIF retained because its demonstrated UI remains current.

## Verification

- Baseline package verification passed before changes.
- Final package verification: 57 policy tests, 292 unit tests, TS7 typecheck/build, existing TS/TSX checks and positive/negative Vue SFC compilation passed.
- Core browser verification: 289 tests passed after the footer fix.
- Same final tgz: package allow-list/license check and consumer import/CSS checks passed; Vue SFC positive/negative checks passed for Vue 3.5.0 and 3.5.41.
- Gitleaks scan of changed/new source and extracted package: passed. Raw detector output discarded.
- Final expanded Playground: 491 passed (Chromium/Firefox/WebKit plus Chromium touch).
- Existing Playground resource gate: passed; heap 5.01 → 5.26 MiB, DOM nodes 506 → 506, listeners 380 → 380, documents 2 → 2, live nodes 154 → 154.
- Final documentation/routing checks: 14 passed; local document links and `git diff --check` passed.
- Comparative latency: all six runs passed their timing assertions (12 conditions × 90 samples per source). Final empty-transfer preflight passed. Extended 500-cycle and destroy resource checks passed. Detailed results: [performance verification](../docs/verification/next-quality-performance.md#measured-comparison--2026-10-04).

## Review and corrections

- Fresh read-only review identified the TypeScript alias bin collision and incomplete release timing. Package checks now invoke TS7 explicitly. The harness uses native settling and timer polling outside instrumented RAF; synchronous pointer event dispatch, including pointerup commit, is measured separately.
- Review coverage gaps were addressed with mode-specific drop/Escape/pointercancel checks, auto-scroll cancellation model/DOM assertions, and an empty transfer preflight.
- The preflight reproduced a pre-existing Vanilla footer mismatch. A new public-adapter regression failed before registration-boundary initialization and passed afterward; 16 related Vanilla unit tests passed.
- One initial browser run used a results directory that Playwright reset, so its detailed failure log was unavailable. A subsequent isolated nested check passed 4/4 and the full suite passed 289/289. The original failure cause remains unclassified; it is not counted as successful evidence.
- Local benchmark evidence is stored outside Playwright's cleared test-results directory. Original-source runs record the known footer regression while continuing timing; they do not claim that old source passes the new behavior assertion.

## Changed surfaces and evidence

| Surface | Files |
| --- | --- |
| Core and Vanilla | `src/core/animation.ts`, `src/core/registry.ts`, `src/vanilla/create-sortable.ts`, `src/vanilla/dom-transaction.ts`, corresponding unit tests |
| Vue | `src/vue/SortableArea.ts`, `src/vue/lifecycle.ts`, `test/types/vue.test.ts`, `test/types/vue-sfc/`, `test/unit/vue/adapter.test.ts` |
| Verification | `scripts/benchmark-sortable.mjs`, `test/performance/`, `scripts/check-vue-sfc-types.mjs`, `scripts/run-vue-sfc-compiler.cjs`, `scripts/consumer-smoke.mjs` |
| Browser and CI | `test/playground/touch.spec.ts`, `test/playwright/helpers/touch.ts`, `test/playground/playground.spec.ts`, `playwright.playground.config.ts`, `.github/workflows/verify.yml`, `test/verification-routing.node.mjs` |
| Package and docs | `package.json`, `package-lock.json`, README, CHANGELOG, documentation index, English/Korean Vue and handle guides, performance guide, plan and this report; package-foundation/user-doc policy expectations |

Final commands and local evidence:

- `npm run verify` → `.local/next-quality/verify.log`.
- `npm run test:e2e -- --workers=4` → `e2e-final.log`.
- `npm run test:playground -- --workers=4` → `playground-final.log`; the final build was prepared before these direct test commands.
- `npm run verify:performance` → `performance-final.log`.
- `npm run verify:package-artifact`, followed by `npm run test:consumer -- <checker-produced tgz>` → `artifact.log`, `consumer-final.log`. The checked archive is preserved as `.local/next-quality/comins-sortable-0.1.4.tgz`.
- Three sequential baseline/final latency pairs use `node scripts/benchmark-sortable.mjs --suite latency --batches 1 --output <path>` against separately built original/final sources. Logs and raw JSON are `baseline-1` through `baseline-3` and `final-1` through `final-3` under `.local/next-quality/`.
- The extended resource run uses `node scripts/benchmark-sortable.mjs --suite memory --trace .local/next-quality/trace.json --output .local/next-quality/memory.json`.

## Remaining

Target 5,000-item / 4× / animation-off activation median improved 37.0 → 27.7 ms (25.1%); p95 improved 44.4 → 36.3 ms. Pooled synchronous drop p95 rose 38.7 → 43.1 ms with overlapping batch ranges; uniform drop-latency improvement is not claimed. The 500-cycle heap delta was +0.445 MiB with constant listener/live-node counts. Destroy rounds stayed within +0.005 MiB and unchanged DOM/listener counts. No resource bound failed. These bounded results do not prove absence of all long-lived leaks.

Keyboard sorting and Galaxy/physical-device tests remain excluded. Native Safari
has not been revalidated. No remote write, version change, release or publication
has been performed; implementation is retained on the local `codex-next-quality` branch.

## Local commit preparation

- Re-ran `npm run verify` before staging: passed (57 policy tests, 292 unit tests, typecheck, build and Vue SFC checks). Log: `.local/next-quality/precommit-verify.log`.
- Existing browser, artifact/consumer and performance evidence above remains applicable; no implementation change was made during commit preparation.
- Local Gitleaks 8.30.1 and the configured `.githooks` path were confirmed. Staged content is checked by the pre-commit hook before creating the local commit.
- Remote push, PR creation, integration and publication remain unperformed. The local commit preserves the implementation, tests and documentation together.

## PR CI follow-up

- PR #33's first Package job failed before the build: the new performance fixture imports `dist/index.js`, but root typecheck included it while a clean checkout had no `dist`. Browser and Performance were skipped because their prerequisite failed. This is a verification-order defect; the previous local build output had hidden it.
- Reproduced the same missing-module and contextual-type errors in a source archive without `dist`. Moved `test/performance` from pre-build root typecheck to the existing post-build `test:types` project, preserving strict compilation against the built public package.
- The clean archive then passed typecheck, build and type tests. An intentional temporary type error in its performance fixture was detected by the post-build compiler; the probe was removed afterward.
- Final local `npm run verify` passed: 57 policy tests, 292 unit tests, typecheck, build and Vue SFC checks. Evidence: `.local/next-quality/ci-fix-verify.log`. No runtime code, dependency or public API changed in this follow-up. Remote CI completion is recorded by the PR checks.
