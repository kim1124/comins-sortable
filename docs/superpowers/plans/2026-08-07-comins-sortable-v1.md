# Comins Sortable v1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build `comins-sortable` as one ESM package whose Vanilla TypeScript Core powers list reorder and cross-area transfer in Vanilla JS, React, Vue, and Svelte with a required Placeholder and zero runtime dependencies.

**Architecture:** A Scope-local DOM engine owns only the active pointer session, geometry, Placeholder, feedback, and cleanup. The package root commits successful drops to Vanilla DOM; controlled framework adapters translate the same atomic `SortableChange` into framework-owned arrays and verify the rendered ID order on the next animation frame. Internal registry, collision, pointer, feedback, auto-scroll, and transaction modules remain unexported.

**Tech Stack:** Node.js 24, npm 11, TypeScript 7.0, Node test runner with `tsx`, esbuild 0.28 for browser fixtures only, Playwright 1.62, React 19 development fixtures with React and React DOM `>=18.2 <20` peer support, Vue 3.5, and Svelte 5.

## Global Constraints

- Source of truth: `docs/superpowers/specs/2026-08-07-comins-sortable-design.md`.
- Package output is ESM targeting ES2020; no CommonJS, UMD, IIFE, or global build.
- Final exports are exactly `.`, `./core`, `./react`, `./vue`, `./svelte`, and `./styles.css`. Do not add `./vanilla` or internal subpaths.
- Runtime `dependencies` remain absent. React `>=18.2 <20`, React DOM `>=18.2 <20`, Vue `>=3.5 <4`, and Svelte `>=5 <6` are optional peers.
- Use `version: "0.0.0-development"` and `private: true`. Version selection, removal of `private`, publish configuration, tag, Release, and npm publication require separate maintainer approval.
- Core and Vanilla code must not import React, React DOM, Vue, or Svelte. Every JavaScript entry must be SSR-safe at module evaluation time.
- The persistent data model is ID order. The engine does not store x/y layout coordinates and does not provide clone, multidrag, tree, virtualization, keyboard sorting, or plugin systems.
- Pointer Events are primary. Escape cancellation and focus restoration are required; a keyboard sorting sensor and live region are not part of v1.
- Placeholder is one empty, same-tag element per session with no copied children, text, ID, or form values.
- Do not use `innerHTML`, `eval`, `new Function`, network calls, storage, cookies, telemetry, raw event retention, or default `MutationObserver`.
- Use only namespace selectors beginning with `comins-sortable` or `data-comins-sortable`; do not add global resets.
- Do not add Vite, Vitest, jsdom, Testing Library, jQuery, SortableJS, or another drag-and-drop runtime. The reviewed minimal lockfile uses only routine-license SPDX identifiers; any future missing, restrictive, compound, or non-routine license stops execution for scoped review.
- Preserve the current managed `AGENTS.md` block. Update only Module Guidance when the package boundary becomes real.
- Execute product work in an isolated worktree based on the commit containing this plan. Do not stage, copy, delete, or rewrite the primary worktree's user-owned `reports/2026-07-27.md`.
- Local commits are allowed task-by-task. Do not push, open a pull request, publish, tag, or create a Release without a new explicit command.
- Playwright WebKit is engine-compatibility evidence, not Safari certification. Do not run `safaridriver` or change persistent Safari settings.
- Run focused RED/GREEN checks inside each task. Run broad gates only at the checkpoints named below and once more before completion.

## Dependency Decision

The 2026-08-07 npm lockfile preflight compared two development stacks.
The Vite/Vitest candidate resolved `lightningcss@1.33.0` and its platform
packages under MPL-2.0, which is a manual-review trigger in the adopted Comins
policy. The selected TypeScript/tsx/esbuild/Playwright candidate resolved only
routine MIT, ISC, BSD, and Apache-2.0 metadata and reported no audit finding.
The checked lockfile, not this observation, remains the implementation gate;
any resolution drift is re-evaluated by Task 1.

## Why This Is One Ordered Plan

Core, Vanilla, the three controlled adapters, and artifact verification are not independent release units: they share one Scope state machine, one change contract, one package export map, and one candidate artifact. The tasks are separated at reviewer-sized boundaries, but their order is mandatory.

## Final File Map

```text
package.json
package-lock.json
package-boundary.mjs
tsconfig.json
tsconfig.build.json
playwright.config.ts

src/
├─ index.ts
├─ core.ts
├─ react.ts
├─ vue.ts
├─ svelte.ts
├─ styles.css
├─ core/
│  ├─ model.ts
│  ├─ errors.ts
│  ├─ operations.ts
│  ├─ registry.ts
│  ├─ geometry.ts
│  ├─ collision.ts
│  ├─ resources.ts
│  ├─ platform.ts
│  ├─ session.ts
│  ├─ pointer.ts
│  ├─ feedback.ts
│  ├─ auto-scroll.ts
│  └─ scope.ts
├─ vanilla/
│  ├─ types.ts
│  ├─ dom-transaction.ts
│  └─ create-sortable.ts
├─ framework/
│  ├─ item-key.ts
│  ├─ bindings.ts
│  └─ controlled-transaction.ts
├─ react/
│  ├─ context.ts
│  ├─ SortableRoot.tsx
│  └─ SortableArea.tsx
├─ vue/
│  ├─ context.ts
│  ├─ SortableRoot.ts
│  └─ SortableArea.ts
└─ svelte/
   ├─ scope.ts
   └─ sortable.ts

example/
├─ index.html
├─ shared.css
├─ vanilla/index.html
├─ vanilla/main.ts
├─ react/index.html
├─ react/main.tsx
├─ vue/index.html
├─ vue/main.ts
├─ svelte/index.html
├─ svelte/main.ts
└─ svelte/App.svelte

scripts/
├─ build-package.mjs
├─ run-unit-tests.mjs
├─ build-browser-fixtures.mjs
├─ serve-browser-fixtures.mjs
├─ check-licenses.mjs
├─ verify-package-artifact.mjs
└─ consumer-smoke.mjs

test/
├─ unit/
│  ├─ helpers/core-fixtures.ts
│  ├─ helpers/framework-fixtures.ts
│  ├─ core/
│  ├─ vanilla/
│  ├─ framework/
│  ├─ react/
│  ├─ vue/
│  └─ svelte/
├─ types/
│  ├─ tsconfig.json
│  ├─ core.test.ts
│  ├─ root.test.ts
│  ├─ react.test.tsx
│  ├─ vue.test.ts
│  └─ svelte.test.ts
├─ ssr/imports.node.mjs
├─ playwright/
│  ├─ helpers/drag.ts
│  ├─ interaction.spec.ts
│  ├─ geometry.spec.ts
│  ├─ rollback.spec.ts
│  ├─ auto-scroll.spec.ts
│  └─ resource-stability.spec.ts
├─ package-foundation.node.mjs
├─ package-artifact-gate.node.mjs
├─ source-security.node.mjs
├─ license-gates.node.mjs
└─ sensitive-data-gates.node.mjs
```

## Spec Coverage Map

| Approved design sections | Implementation tasks |
|---|---|
| 1–4 Background, goals, and non-goals | Global Constraints; Tasks 2–12 positive and negative tests |
| 5 Package surface and SSR-safe imports | Tasks 1, 6, 8, 9, 10, and 12 |
| 6 Architecture and instance isolation | Tasks 3–7 |
| 7 Core data contract and immutable helpers | Tasks 1, 2, and 7 |
| 8 Scope and controlled ownership | Tasks 3, 5, and 7–10 |
| 9 Vanilla facade | Tasks 6 and 11 |
| 10 React, Vue, and Svelte adapters | Tasks 8–11 |
| 11 Options and defaults | Tasks 3–6 and adapter prop/type fixtures |
| 12 Session state | Tasks 4 and 5 |
| 13 Placeholder and feedback | Tasks 5, 6, and 11 |
| 14 Hit testing and insertion index | Tasks 3, 5, and 11 |
| 15 Lifecycle events | Tasks 5, 7, and 11 |
| 16 Commit and rollback | Tasks 5–7 and 11 |
| 17 Error handling and redaction | Tasks 1, 4–6, and 12 |
| 18 CSS customization | Tasks 6, 11, and 12 |
| 19 Pointer-first accessibility boundary | Tasks 5, 6, 11, and README in Task 12 |
| 20 Security and privacy | Tasks 1, 4–6, and 12 |
| 21 Performance and memory | Tasks 3–5 and 11 |
| 22 Support and verification | Tasks 11 and 12 |
| 23 v1 completion conditions | Task 12 full gate |
| 24 Deferred candidates | Global negative constraints, public-export tests, and README boundary |

---

### Task 1: Convert The Approved Package Boundary

**Files:**
- Create: `package.json`
- Create: `package-lock.json`
- Create: `package-boundary.mjs`
- Create: `tsconfig.json`
- Create: `tsconfig.build.json`
- Create: `scripts/build-package.mjs`
- Create: `scripts/run-unit-tests.mjs`
- Create: `src/core.ts`
- Create: `src/core/model.ts`
- Create: `src/core/errors.ts`
- Create: `test/unit/core/errors.test.ts`
- Create: `test/package-foundation.node.mjs`
- Create: `test/types/tsconfig.json`
- Create: `test/types/core.test.ts`
- Modify: `LICENSE_SCOPE.json`
- Modify: `scripts/check-licenses.mjs`
- Modify: `test/license-gates.node.mjs`
- Modify: `test/sensitive-data-gates.node.mjs`
- Modify: `.github/workflows/verify.yml`
- Modify: `.gitignore`
- Modify: `AGENTS.md`
- Modify: `README.md`

**Interfaces:**
- Consumes: approved package name, export boundaries, peer ranges, zero-runtime-dependency rule, Contract v1.4 license and sensitive-data policy.
- Produces: reproducible private development package, Core public types/errors, ES2020 ESM build, Node/TypeScript test commands, and package-aware policy gates.

- [ ] **Step 1: Write failing package and license contract tests**

Add tests that require the new boundary and reject drift:

```js
test("declares the approved private package boundary", () => {
  const manifest = readJson("package.json");
  assert.equal(manifest.name, "comins-sortable");
  assert.equal(manifest.version, "0.0.0-development");
  assert.equal(manifest.private, true);
  assert.equal(manifest.type, "module");
  assert.equal(Object.hasOwn(manifest, "dependencies"), false);
  assert.deepEqual(manifest.peerDependencies, {
    react: ">=18.2 <20",
    "react-dom": ">=18.2 <20",
    svelte: ">=5 <6",
    vue: ">=3.5 <4",
  });
  assert.deepEqual(manifest.peerDependenciesMeta, {
    react: { optional: true },
    "react-dom": { optional: true },
    svelte: { optional: true },
    vue: { optional: true },
  });
});

test("fails closed for runtime dependencies", () => {
  const fixture = packageFixture({
    dependencies: { "drag-runtime": "1.0.0" },
  });
  expectConstantFailure(runLicenseCheck(fixture));
});

test("fails closed for a non-routine transitive license", () => {
  const fixture = packageFixture({
    lockPackages: {
      "node_modules/review-required": {
        version: "1.0.0",
        license: "MPL-2.0",
        dev: true,
      },
    },
  });
  expectReviewRequired(runLicenseCheck(fixture), "review-required", "MPL-2.0");
});

test("SortableError exposes only its stable code", async () => {
  const { SortableError } = await import("../../../src/core.js");
  const error = new SortableError("INVALID_OPTION");
  assert.equal(error.name, "SortableError");
  assert.equal(error.message, "INVALID_OPTION");
  assert.equal(error.code, "INVALID_OPTION");
  assert.equal(Object.hasOwn(error, "context"), false);
});
```

Update existing security tests to require a package-aware README and CI while preserving constant redacted failure output and the pinned Gitleaks workflow.

- [ ] **Step 2: Run the focused policy tests and verify RED**

Run:

```sh
node --test test/package-foundation.node.mjs test/license-gates.node.mjs test/sensitive-data-gates.node.mjs
```

Expected: FAIL because the repository still declares `packageBoundary: false` and has no manifest, lockfile, package build, or npm CI job.

- [ ] **Step 3: Add the manifest, lockfile, compiler, and build runner**

Create the manifest with these exact dependency ranges:

```json
{
  "name": "comins-sortable",
  "version": "0.0.0-development",
  "private": true,
  "type": "module",
  "license": "MIT",
  "repository": {
    "type": "git",
    "url": "git+https://github.com/kim1124/comins-sortable.git"
  },
  "bugs": {
    "url": "https://github.com/kim1124/comins-sortable/issues"
  },
  "homepage": "https://github.com/kim1124/comins-sortable#readme",
  "files": [
    "dist",
    "README.md",
    "LICENSE"
  ],
  "sideEffects": false,
  "exports": {
    "./core": {
      "types": "./dist/core.d.ts",
      "import": "./dist/core.js"
    }
  },
  "scripts": {
    "build": "node scripts/build-package.mjs",
    "check:licenses": "node scripts/check-licenses.mjs",
    "lint": "npm run typecheck",
    "typecheck": "tsc --noEmit",
    "test": "node scripts/run-unit-tests.mjs",
    "test:run": "node scripts/run-unit-tests.mjs",
    "test:policy": "node --test test/*.node.mjs",
    "test:types": "tsc -p test/types/tsconfig.json --noEmit",
    "verify": "npm run check:licenses && npm run test:policy && npm run typecheck && npm run test:run && npm run build && npm run test:types"
  },
  "peerDependencies": {
    "react": ">=18.2 <20",
    "react-dom": ">=18.2 <20",
    "svelte": ">=5 <6",
    "vue": ">=3.5 <4"
  },
  "peerDependenciesMeta": {
    "react": { "optional": true },
    "react-dom": { "optional": true },
    "svelte": { "optional": true },
    "vue": { "optional": true }
  },
  "devDependencies": {
    "@playwright/test": "^1.62.1",
    "@types/node": "^26.1.2",
    "@types/react": "^19.2.18",
    "@types/react-dom": "^19.2.4",
    "esbuild": "^0.28.1",
    "react": "^19.2.8",
    "react-dom": "^19.2.8",
    "svelte": "^5.56.8",
    "tsx": "^4.23.10",
    "typescript": "^7.0.2",
    "vue": "^3.5.41"
  }
}
```

`package-boundary.mjs` records the exact final source-module and public-export
sets used by artifact verification:

```js
export const sourceModules = [
  "index",
  "core",
  "react",
  "vue",
  "svelte",
  "core/model",
  "core/errors",
  "core/operations",
  "core/registry",
  "core/geometry",
  "core/collision",
  "core/resources",
  "core/platform",
  "core/session",
  "core/pointer",
  "core/feedback",
  "core/auto-scroll",
  "core/scope",
  "vanilla/types",
  "vanilla/dom-transaction",
  "vanilla/create-sortable",
  "framework/item-key",
  "framework/bindings",
  "framework/controlled-transaction",
  "react/context",
  "react/SortableRoot",
  "react/SortableArea",
  "vue/context",
  "vue/SortableRoot",
  "vue/SortableArea",
  "svelte/scope",
  "svelte/sortable",
];

export const publicExports = {
  ".": "index",
  "./core": "core",
  "./react": "react",
  "./vue": "vue",
  "./svelte": "svelte",
};

export const peerRanges = {
  react: ">=18.2 <20",
  "react-dom": ">=18.2 <20",
  svelte: ">=5 <6",
  vue: ">=3.5 <4",
};
```

Use `module: "NodeNext"`, `moduleResolution: "NodeNext"`, `target: "ES2020"`, strict mode, `noUncheckedIndexedAccess`, DOM libraries, React JSX, and explicit `.js` relative imports. `tsconfig.build.json` sets `rootDir: "src"`, `outDir: "dist"`, `declaration: true`, `declarationMap: false`, `sourceMap: true`, and includes only `src`.

`scripts/build-package.mjs` removes only repository-relative `dist`, runs the local TypeScript compiler, and copies `src/styles.css` only after Task 6 creates it. Until then it compiles `src/core.ts` and `src/core/**`.

```js
import { execFileSync } from "node:child_process";
import { copyFile, mkdir, rm } from "node:fs/promises";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";

const root = fileURLToPath(new URL("..", import.meta.url));
const dist = join(root, "dist");
const compiler = join(root, "node_modules", "typescript", "bin", "tsc");

await rm(dist, { recursive: true, force: true });
execFileSync(process.execPath, [compiler, "-p", "tsconfig.build.json"], {
  cwd: root,
  stdio: "inherit",
});

const styles = join(root, "src", "styles.css");
if (existsSync(styles)) {
  await mkdir(dist, { recursive: true });
  await copyFile(styles, join(dist, "styles.css"));
}
```

`scripts/run-unit-tests.mjs` resolves the complete test list without shell glob
differences:

```js
import { execFileSync } from "node:child_process";
import { globSync } from "node:fs";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const files = globSync("test/unit/**/*.test.ts", { cwd: root }).sort();
if (files.length === 0) throw new Error("unit test files are missing");
execFileSync(process.execPath, ["--import", "tsx", "--test", ...files], {
  cwd: root,
  stdio: "inherit",
});
```

Generate the lockfile using:

```sh
npm install --ignore-scripts
```

Do not use `npm audit fix`. Run `npm audit --audit-level=high` and classify any finding before changing versions.

- [ ] **Step 4: Define the Core types and redacted error contract**

Create these exact public contracts in `src/core/model.ts` and `src/core/errors.ts`:

```ts
export type SortableId = string | number;
export type ItemKey<T> = keyof T | ((item: T) => SortableId);
export type SortableDirection = "vertical" | "horizontal" | "auto";

export interface SortableLocation {
  areaId: string;
  index: number;
}

export interface SortableOrder {
  areaId: string;
  itemIds: readonly SortableId[];
}

export interface SortableChange {
  operation: "reorder" | "transfer";
  itemId: SortableId;
  source: SortableLocation;
  destination: SortableLocation;
  orders: readonly SortableOrder[];
}

export interface SortableAreaUpdate<T> {
  areaId: string;
  items: readonly T[];
}

export interface FrameworkSortableChange<T> extends SortableChange {
  updates: readonly SortableAreaUpdate<T>[];
}

export interface PointerSnapshot {
  type: "mouse" | "touch" | "pen";
  clientX: number;
  clientY: number;
  deltaX: number;
  deltaY: number;
}

export interface DragContext {
  itemId: SortableId;
  source: SortableLocation;
  destination: SortableLocation | null;
  pointer: PointerSnapshot;
}

export interface InsertDragAreaEvent extends DragContext {
  previousDestination: SortableLocation | null;
  destination: SortableLocation;
}

export type AfterDragReason =
  | "drop"
  | "outside"
  | "pointer-cancel"
  | "escape"
  | "blur"
  | "disabled"
  | "not-accepted"
  | "unmounted"
  | "state-not-committed"
  | "destroyed"
  | "error";

export interface AfterDragResult {
  status: "dropped" | "cancelled" | "rejected";
  reason: AfterDragReason;
  change?: SortableChange;
}

export type SortableErrorCode =
  | "INVALID_ELEMENT"
  | "DUPLICATE_AREA_ID"
  | "DUPLICATE_ITEM_ID"
  | "MISSING_ITEM_ID"
  | "INVALID_OPTION";

export class SortableError extends Error {
  readonly code: SortableErrorCode;

  constructor(code: SortableErrorCode) {
    super(code);
    this.name = "SortableError";
    this.code = code;
  }
}
```

`src/core.ts` re-exports only these public types and `SortableError`. It must not export internal file paths.

- [ ] **Step 5: Replace the pre-package license scope and checker**

Use this scope:

```json
{
  "schemaVersion": 2,
  "packageBoundary": true,
  "runtimeDependencies": [],
  "peerDependencies": {
    "react": ">=18.2 <20",
    "react-dom": ">=18.2 <20",
    "svelte": ">=5 <6",
    "vue": ">=3.5 <4"
  },
  "trackedMaterial": {
    "copiedOrGeneratedCode": [],
    "assets": []
  }
}
```

The checker must verify package/lock root equality, lockfile version 3, absent runtime dependencies, exact peer ranges, optional peer metadata, every lock entry's SPDX value, and empty copied/generated and asset inventories. Routine licenses are exactly:

```js
const ROUTINE_LICENSES = new Set([
  "MIT",
  "MIT-0",
  "ISC",
  "0BSD",
  "BSD-2-Clause",
  "BSD-3-Clause",
  "Apache-2.0",
]);
```

Structural failures print only `license-check: failed`. A manual-review trigger may print only package name, SPDX expression, and use surface; it must not print paths, authors, maintainers, email addresses, license bodies, or fingerprints.

Add an npm `verify` job to CI using the existing pinned checkout/setup-node actions:

```yaml
verify:
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1
      with:
        persist-credentials: false
    - uses: actions/setup-node@249970729cb0ef3589644e2896645e5dc5ba9c38
      with:
        node-version: 24
        cache: npm
    - run: npm ci --ignore-scripts
    - run: npm run verify
```

Update only `AGENTS.md` Module Guidance and README status/verification text to replace the pre-package prohibition with the approved private development boundary.

- [ ] **Step 6: Run GREEN package checks**

Run:

```sh
node --test test/package-foundation.node.mjs test/license-gates.node.mjs test/sensitive-data-gates.node.mjs
npm run check:licenses
npm run typecheck
npm run test:run
npm run build
npm run test:types
npm audit --audit-level=high
git diff --check
```

Expected: all tests pass, `dist/core.js` and `dist/core.d.ts` exist, the license check has no manual-review output, audit reports no high-or-greater vulnerability, and `git diff --check` is silent.

- [ ] **Step 7: Commit the package boundary**

```sh
git add package.json package-lock.json package-boundary.mjs tsconfig.json tsconfig.build.json scripts/build-package.mjs scripts/run-unit-tests.mjs src/core.ts src/core/model.ts src/core/errors.ts test/unit/core/errors.test.ts test/package-foundation.node.mjs test/types/tsconfig.json test/types/core.test.ts LICENSE_SCOPE.json scripts/check-licenses.mjs test/license-gates.node.mjs test/sensitive-data-gates.node.mjs .github/workflows/verify.yml .gitignore AGENTS.md README.md
git commit -m "build: establish sortable package boundary"
```

### Task 2: Implement Immutable Orders And Public Helpers

**Files:**
- Create: `src/core/operations.ts`
- Create: `test/unit/core/operations.test.ts`
- Modify: `src/core.ts`
- Modify: `test/types/core.test.ts`

**Interfaces:**
- Consumes: `SortableId`, `SortableLocation`, `SortableOrder`, and `SortableChange`.
- Produces: `reorder<T>()`, `transfer<T>()`, and internal order-to-change helpers used by the engine and framework transaction layer.

- [ ] **Step 1: Write failing immutable-operation tests**

```ts
import assert from "node:assert/strict";
import test from "node:test";
import { reorder, transfer } from "../../../src/core.js";

test("reorder returns a new affected order without mutating input", () => {
  const input = Object.freeze(["a", "b", "c"]);
  const result = reorder(input, 0, 2);
  assert.deepEqual(result, ["b", "c", "a"]);
  assert.deepEqual(input, ["a", "b", "c"]);
  assert.notEqual(result, input);
});

test("reorder preserves the original reference for a no-op", () => {
  const input = ["a", "b"];
  assert.equal(reorder(input, 1, 1), input);
});

test("transfer removes source and inserts at destination index zero", () => {
  const source = ["a", "b"];
  const destination: string[] = [];
  const result = transfer(source, destination, 1, 0);
  assert.deepEqual(result.sourceItems, ["a"]);
  assert.deepEqual(result.destinationItems, ["b"]);
  assert.deepEqual(source, ["a", "b"]);
  assert.deepEqual(destination, []);
});

test("helpers reject non-integer and out-of-range indexes", () => {
  assert.throws(() => reorder(["a"], -1, 0), RangeError);
  assert.throws(() => transfer(["a"], [], 0, 1), RangeError);
});
```

- [ ] **Step 2: Run the focused test and verify RED**

Run:

```sh
node --import tsx --test test/unit/core/operations.test.ts
```

Expected: FAIL because `reorder` and `transfer` are not exported.

- [ ] **Step 3: Implement the minimal helpers**

Use non-mutating array copies and explicit index guards:

```ts
export function reorder<T>(
  items: readonly T[],
  fromIndex: number,
  toIndex: number,
): readonly T[] {
  assertIndex(fromIndex, items.length, false);
  assertIndex(toIndex, items.length, false);
  if (fromIndex === toIndex) return items;
  const next = [...items];
  const [item] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, item as T);
  return next;
}

function assertIndex(
  index: number,
  length: number,
  allowEnd: boolean,
): void {
  const maximum = allowEnd ? length : length - 1;
  if (!Number.isInteger(index) || index < 0 || index > maximum) {
    throw new RangeError("sortable index is out of range");
  }
}

export function transfer<T>(
  sourceItems: readonly T[],
  destinationItems: readonly T[],
  sourceIndex: number,
  destinationIndex: number,
): {
  sourceItems: readonly T[];
  destinationItems: readonly T[];
} {
  assertIndex(sourceIndex, sourceItems.length, false);
  assertIndex(destinationIndex, destinationItems.length, true);
  const source = [...sourceItems];
  const [item] = source.splice(sourceIndex, 1);
  const destination = [...destinationItems];
  destination.splice(destinationIndex, 0, item as T);
  return { sourceItems: source, destinationItems: destination };
}
```

The internal change builder emits one order for reorder and source-then-destination orders for transfer. It suppresses same-area no-op drops before lifecycle `onChange`.

- [ ] **Step 4: Verify helper behavior and types**

Run:

```sh
node --import tsx --test test/unit/core/operations.test.ts
npm run typecheck
npm run build
npm run test:types
```

Expected: PASS with readonly inputs accepted, inferred generic results, and invalid indexes typed as runtime `RangeError` behavior.

- [ ] **Step 5: Commit immutable operations**

```sh
git add src/core/operations.ts src/core.ts test/unit/core/operations.test.ts test/types/core.test.ts
git commit -m "feat: add immutable sortable operations"
```

### Task 3: Implement Scope Registry, Geometry, And Collision

**Files:**
- Create: `src/core/registry.ts`
- Create: `src/core/geometry.ts`
- Create: `src/core/collision.ts`
- Create: `test/unit/helpers/core-fixtures.ts`
- Create: `test/unit/core/registry.test.ts`
- Create: `test/unit/core/geometry.test.ts`
- Create: `test/unit/core/collision.test.ts`

**Interfaces:**
- Consumes: area IDs, item IDs, groups, direction, `Element`, `ownerDocument`, and immutable orders.
- Produces: instance-local `AreaRegistry`, rect snapshots, direction resolution, area hit testing, and insertion-index calculation for the session engine.

- [ ] **Step 1: Write failing registry and collision tests**

Use structural fake elements and rects so Node tests do not require jsdom:

```ts
test("registry isolates identical groups across scopes", () => {
  const first = new AreaRegistry();
  const second = new AreaRegistry();
  first.register(area("todo", "tasks", ["a"]));
  second.register(area("todo", "tasks", ["a"]));
  assert.equal(first.size, 1);
  assert.equal(second.size, 1);
});

test("registry rejects duplicate area and group-wide item IDs", () => {
  const registry = new AreaRegistry();
  registry.register(area("todo", "tasks", ["a"]));
  assert.throws(
    () => registry.register(area("todo", "tasks", ["b"])),
    hasCode("DUPLICATE_AREA_ID"),
  );
  assert.throws(
    () => registry.register(area("done", "tasks", ["a"])),
    hasCode("DUPLICATE_ITEM_ID"),
  );
});

test("collision uses source-excluded midpoints for same-area reorder", () => {
  const index = insertionIndex({
    pointer: { x: 0, y: 35 },
    direction: "vertical",
    items: [
      rectItem("b", 0, 20, 100, 20),
      rectItem("c", 0, 40, 100, 20),
    ],
  });
  assert.equal(index, 1);
});

test("empty-area fallback expands only the primary axis", () => {
  const candidate = findAreaAtPoint({
    point: { x: 50, y: 104 },
    directHits: [],
    emptyAreas: [rectArea("done", 0, 100, 100, 0)],
    emptyInsertThreshold: 8,
  });
  assert.equal(candidate?.areaId, "done");
});
```

Also cover same `ownerDocument` enforcement, idempotent unregister, missing IDs, `vertical`/`horizontal`/`auto`, variable sizes, CSS gap, inner valid area selection, disabled/group/accept filtering, and both-axis-zero rejection.

- [ ] **Step 2: Run focused tests and verify RED**

Run:

```sh
node --import tsx --test test/unit/core/registry.test.ts test/unit/core/geometry.test.ts test/unit/core/collision.test.ts
```

Expected: FAIL because the internal registry and geometry functions do not exist.

- [ ] **Step 3: Implement exact internal records and pure collision functions**

Use these internal shapes:

```ts
export interface Point {
  x: number;
  y: number;
}

export interface RectSnapshot {
  left: number;
  top: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
}

export interface ItemGeometry {
  id: SortableId;
  rect: RectSnapshot;
}

export interface RegisteredArea {
  element: Element;
  areaId: string;
  group: string;
  direction: SortableDirection;
  disabled: boolean;
  itemSelector: string;
  getItemId(element: Element): SortableId;
  accept(context: DragContext): boolean;
}

export function insertionIndex(input: {
  pointer: Point;
  direction: Exclude<SortableDirection, "auto">;
  items: readonly ItemGeometry[];
}): number {
  const coordinate = input.direction === "vertical"
    ? input.pointer.y
    : input.pointer.x;
  let low = 0;
  let high = input.items.length;
  while (low < high) {
    const middle = Math.floor((low + high) / 2);
    const item = input.items[middle] as ItemGeometry;
    const midpoint = input.direction === "vertical"
      ? item.rect.top + item.rect.height / 2
      : item.rect.left + item.rect.width / 2;
    if (coordinate < midpoint) {
      high = middle;
    } else {
      low = middle + 1;
    }
  }
  return low;
}
```

`AreaRegistry` stores areas in a per-instance `Map<string, RegisteredArea>` and element lookup in a `WeakMap<Element, RegisteredArea>`. It rescans direct matching children at activation, validates IDs group-wide, and exposes only internal lookup methods. `createSortableScope` will be the public controller.

Geometry snapshots are created at activation and area entry, cached across
pointer frames, and marked dirty only by scroll, resize, framework binding
updates, or engine-owned Placeholder movement. Pointer callbacks binary-search
the cached ordered midpoints and do not call `getBoundingClientRect()` per raw
pointer event.

`direction: "auto"` compares the absolute x/y deltas between the first two
item centers and selects the larger axis; fewer than two items use vertical.
Same-area calculations remove the source before building midpoint order, and
an accepted empty area always returns index `0`.

`test/unit/helpers/core-fixtures.ts` defines `area`, `rectItem`, `rectArea`,
`fakeElement`, and `hasCode` as structural test builders. Each builder returns a
fresh object, uses only explicit placeholder IDs/text, and never depends on
global DOM constructors.

- [ ] **Step 4: Verify registry and collision GREEN**

Run:

```sh
node --import tsx --test test/unit/core/registry.test.ts test/unit/core/geometry.test.ts test/unit/core/collision.test.ts
npm run typecheck
```

Expected: PASS with no DOM global required at import time and no exported internal path.

- [ ] **Step 5: Commit registry and collision**

```sh
git add src/core/registry.ts src/core/geometry.ts src/core/collision.ts test/unit/helpers/core-fixtures.ts test/unit/core/registry.test.ts test/unit/core/geometry.test.ts test/unit/core/collision.test.ts
git commit -m "feat: add sortable registry and collision"
```

### Task 4: Implement Resources, Session State, And Pointer Activation

**Files:**
- Create: `src/core/resources.ts`
- Create: `src/core/platform.ts`
- Create: `src/core/session.ts`
- Create: `src/core/pointer.ts`
- Create: `test/unit/core/resources.test.ts`
- Create: `test/unit/core/session.test.ts`
- Create: `test/unit/core/pointer.test.ts`
- Modify: `test/unit/helpers/core-fixtures.ts`

**Interfaces:**
- Consumes: registry records, pointer snapshots, cancellation reasons, and an injected browser platform.
- Produces: an idempotent `ResourceBag`, pure session state transitions, a real-browser platform created only after mount, and pointer activation throttled to one animation-frame update.

- [ ] **Step 1: Write failing resource, state, and pointer tests**

```ts
test("resource bag disposes each resource exactly once", () => {
  const calls: string[] = [];
  const resources = new ResourceBag();
  resources.add(() => calls.push("listener"));
  resources.add(() => calls.push("frame"));
  resources.dispose();
  resources.dispose();
  assert.deepEqual(calls, ["frame", "listener"]);
  assert.deepEqual(resources.snapshot(), {
    listeners: 0,
    frames: 0,
    observers: 0,
    cleanups: 0,
  });
});

test("session follows the approved state graph", () => {
  const session = new SessionMachine();
  session.pending(pendingInput());
  session.activate(activeInput());
  session.commit(change());
  session.finish();
  assert.deepEqual(session.history, [
    "idle",
    "pending",
    "dragging",
    "committing",
    "idle",
  ]);
});

test("pointer activates only after four CSS pixels", () => {
  const platform = fakePlatform();
  const events: string[] = [];
  const sensor = createPointerSensor({
    activationDistance: 4,
    platform,
    onActivate: () => events.push("activate"),
    onMove: () => events.push("move"),
    onCancel: () => events.push("cancel"),
    onRelease: () => events.push("release"),
  });
  sensor.pointerDown(pointer({ clientX: 10, clientY: 10, isPrimary: true }));
  sensor.pointerMove(pointer({ clientX: 12, clientY: 12, isPrimary: true }));
  platform.flushFrame();
  assert.deepEqual(events, []);
  sensor.pointerMove(pointer({ clientX: 14, clientY: 10, isPrimary: true }));
  platform.flushFrame();
  assert.deepEqual(events, ["activate"]);
});
```

Add named cases for non-primary pointers, non-left mouse buttons, pointer capture, handle/ignore precedence, one rAF move, `pointerup`, `pointercancel`, Escape, blur, `visibilitychange`, unmount, and destroy.

- [ ] **Step 2: Run focused tests and verify RED**

Run:

```sh
node --import tsx --test test/unit/core/resources.test.ts test/unit/core/session.test.ts test/unit/core/pointer.test.ts
```

Expected: FAIL because the resource, platform, session, and pointer modules are absent.

- [ ] **Step 3: Implement injected platform and idempotent resources**

Define only the browser services used by the engine:

```ts
export interface SortablePlatform {
  readonly document: Document;
  readonly window: Window;
  elementsFromPoint(x: number, y: number): readonly Element[];
  requestFrame(callback: FrameRequestCallback): number;
  cancelFrame(id: number): void;
  report(error: unknown): void;
}

export function createBrowserPlatform(element: Element): SortablePlatform {
  const document = element.ownerDocument;
  const window = document.defaultView;
  if (window === null) throw new SortableError("INVALID_ELEMENT");
  return {
    document,
    window,
    elementsFromPoint: (x, y) => document.elementsFromPoint(x, y),
    requestFrame: (callback) => window.requestAnimationFrame(callback),
    cancelFrame: (id) => window.cancelAnimationFrame(id),
    report: (error) => {
      if (typeof globalThis.reportError === "function") {
        globalThis.reportError(error);
        return;
      }
      queueMicrotask(() => {
        throw error;
      });
    },
  };
}
```

`ResourceBag` stores cleanup callbacks in LIFO order, tracks category counts for internal tests, clears its strong references during disposal, and treats repeated disposal as a no-op. Do not expose its snapshot from a package entry.

- [ ] **Step 4: Implement the state machine and pointer sensor**

Use a discriminated session union rather than unrelated booleans:

```ts
export type SessionState =
  | { status: "idle" }
  | { status: "pending"; value: PendingSession }
  | { status: "dragging"; value: ActiveSession }
  | { status: "committing"; value: ActiveSession; change: SortableChange }
  | { status: "cancelling"; value: ActiveSession; reason: AfterDragReason };
```

The sensor stores only pointer ID, pointer type, origin, latest coordinates, and scheduled frame ID. It never retains a raw `PointerEvent` beyond the current callback. It attaches active listeners with one `AbortController`, calls `setPointerCapture` after activation, and releases capture during cleanup.

Extend `core-fixtures.ts` with `fakePlatform`, `pointer`, `pendingInput`, and
`activeInput`. The fake platform owns an explicit frame queue and event-listener
registry so tests advance time only through `flushFrame()` and can assert exact
active-resource counts.

Distance is Euclidean:

```ts
const distance = Math.hypot(
  current.clientX - origin.clientX,
  current.clientY - origin.clientY,
);
if (distance >= activationDistance) activate(snapshot(current, origin));
```

- [ ] **Step 5: Run GREEN resource and pointer checks**

Run:

```sh
node --import tsx --test test/unit/core/resources.test.ts test/unit/core/session.test.ts test/unit/core/pointer.test.ts
npm run typecheck
```

Expected: PASS with zero resource counts after every cancel/release/destroy case and no module-evaluation access to browser globals.

- [ ] **Step 6: Commit the session foundation**

```sh
git add src/core/resources.ts src/core/platform.ts src/core/session.ts src/core/pointer.ts test/unit/helpers/core-fixtures.ts test/unit/core/resources.test.ts test/unit/core/session.test.ts test/unit/core/pointer.test.ts
git commit -m "feat: add pointer session lifecycle"
```

### Task 5: Implement Feedback, Auto-Scroll, And Sortable Scope

**Files:**
- Create: `src/core/feedback.ts`
- Create: `src/core/auto-scroll.ts`
- Create: `src/core/scope.ts`
- Create: `test/unit/core/feedback.test.ts`
- Create: `test/unit/core/auto-scroll.test.ts`
- Create: `test/unit/core/scope.test.ts`
- Create: `test/unit/core/event-order.test.ts`
- Create: `test/unit/core/resource-lifecycle.test.ts`
- Modify: `test/unit/helpers/core-fixtures.ts`
- Modify: `src/core/model.ts`
- Modify: `src/core.ts`
- Modify: `test/types/core.test.ts`

**Interfaces:**
- Consumes: registry, geometry, collision, session, pointer sensor, browser platform, and consumer `onChange`.
- Produces: public `SortableAreaOptions`, `SortableScopeOptions`, `SortableScope`, and `createSortableScope()` with Placeholder, auto-scroll, commit verification, rollback, and exact lifecycle cardinality.

- [ ] **Step 1: Write failing feedback, scroll, Scope, and event tests**

```ts
test("feedback creates one empty same-tag placeholder", () => {
  const source = fakeElement("LI", {
    id: "fixture-id",
    textContent: "fixture text",
    children: [fakeElement("INPUT", { value: "fixture value" })],
  });
  const feedback = createFeedback(source, fakePlatform());
  assert.equal(feedback.placeholder.tagName, "LI");
  assert.equal(feedback.placeholder.children.length, 0);
  assert.equal(feedback.placeholder.textContent, "");
  assert.equal(feedback.placeholder.id, "");
  assert.equal(feedback.placeholder.getAttribute("aria-hidden"), "true");
});

test("scope emits one atomic transfer in approved order", () => {
  const calls: string[] = [];
  const scope = createSortableScope({
    onBeforeDragStart: () => calls.push("before"),
    onDragStart: () => calls.push("start"),
    onDrag: () => calls.push("drag"),
    onInsertDragArea: () => calls.push("insert"),
    onChange: () => calls.push("change"),
    onAfterDrag: () => calls.push("after"),
  }, fakePlatform());
  performTransfer(scope, "todo", 0, "done", 1);
  assert.deepEqual(calls, [
    "before",
    "start",
    "drag",
    "insert",
    "change",
    "after",
  ]);
});

test("uncommitted framework order is rejected and rolled back", () => {
  const results: AfterDragResult[] = [];
  const fixture = scopeFixture({
    onChange: () => undefined,
    onAfterDrag: (result) => results.push(result),
  });
  fixture.drop("todo", 0, "done", 0);
  fixture.platform.flushFrame();
  assert.deepEqual(results.at(-1), {
    status: "rejected",
    reason: "state-not-committed",
  });
  assertOriginalDom(fixture);
});
```

Add exact cases for `onBeforeDragStart === false`, outside, disabled, not accepted, pointer cancel, Escape, blur, visibility, unmount, destroy, callback errors, idle cancel, idempotent unregister/destroy, source focus restoration, invalid item/handle/ignore selectors, no default `MutationObserver`, and cleanup before `onAfterDrag`. Invalid option selectors throw redacted `INVALID_OPTION`; invalid top-level Vanilla area selectors remain `INVALID_ELEMENT`.

- [ ] **Step 2: Run focused tests and verify RED**

Run:

```sh
node --import tsx --test test/unit/core/feedback.test.ts test/unit/core/auto-scroll.test.ts test/unit/core/scope.test.ts test/unit/core/event-order.test.ts test/unit/core/resource-lifecycle.test.ts
```

Expected: FAIL because feedback, auto-scroll, and the public Scope do not exist.

- [ ] **Step 3: Add the public Scope options**

Add these contracts to `src/core/model.ts`:

```ts
export interface SortableAreaOptions {
  areaId: string;
  group?: string;
  item: string;
  getItemId?: (element: Element) => SortableId;
  direction?: SortableDirection;
  disabled?: boolean;
  handle?: string;
  ignore?: string;
  activationDistance?: number;
  emptyInsertThreshold?: number;
  autoScroll?: boolean;
  accept?: (context: DragContext) => boolean;
}

export type SortableAreaPatch =
  Partial<Omit<SortableAreaOptions, "areaId">>;

export interface SortableScopeOptions {
  onBeforeDragStart?: (context: DragContext) => boolean | void;
  onDragStart?: (context: DragContext) => void;
  onDrag?: (context: DragContext) => void;
  onInsertDragArea?: (event: InsertDragAreaEvent) => void;
  onChange?: (change: SortableChange) => void;
  onAfterDrag?: (result: AfterDragResult) => void;
  onError?: (error: unknown) => void;
}

export interface SortableScope {
  registerArea(element: Element, options: SortableAreaOptions): () => void;
  updateArea(areaId: string, patch: SortableAreaPatch): void;
  cancel(): void;
  destroy(): void;
}
```

Defaults are `direction: "auto"`, `disabled: false`, `activationDistance: 4`, `emptyInsertThreshold: 8`, `autoScroll: true`, always-accept, an instance-private default group, and this ignore selector:

```css
input,
textarea,
select,
button,
a[href],
[contenteditable="true"],
[data-comins-sortable-ignore]
```

- [ ] **Step 4: Implement Placeholder and source feedback**

Create the placeholder with `ownerDocument.createElement(source.tagName)`, copy only source rect width/height into temporary inline styles, mark it `aria-hidden`, and add `comins-sortable__placeholder` plus `data-comins-sortable-placeholder`.

Move source feedback with a transform from the activation origin. Snapshot and restore only inline properties the engine changes:

```ts
const FEEDBACK_PROPERTIES = [
  "boxSizing",
  "height",
  "left",
  "margin",
  "pointerEvents",
  "position",
  "top",
  "transform",
  "transition",
  "width",
  "zIndex",
] as const;
```

Do not clone, reparent, or read source text during drag. The only allowed final reparent is the Vanilla transaction in Task 6.

- [ ] **Step 5: Implement auto-scroll and Scope orchestration**

Auto-scroll finds scrollable ancestors from the direct hit chain, then the window. It calculates an internal signed velocity near each edge, shares the session rAF loop, marks only affected geometry dirty, and becomes a no-op when disabled. Edge distance and maximum velocity remain internal constants.

The internal `createSortableScopeInternal(options, platform)` performs:

```text
pointerdown
→ pending snapshot
→ threshold reached
→ validate current IDs
→ onBeforeDragStart
→ create feedback and Placeholder
→ onDragStart
→ rAF collision / onDrag / onInsertDragArea
→ pointerup
→ compute one reorder or transfer
→ onChange
→ next-rAF rendered ID verification
→ dropped or rollback
→ cleanup
→ onAfterDrag
```

`src/core.ts` exports only `createSortableScope(options?)`. Tests import the
unexported `createSortableScopeInternal(options, platform)` from
`src/core/scope.ts`; the public wrapper lazily creates the browser platform from
the first registered area.

Activation-time ID errors call `onError` without `onAfterDrag`. Active-session errors clean up, emit cancelled/error once, then call `onError`. An `onAfterDrag` error is forwarded without a second cleanup or second `onAfterDrag`.

Status mapping is fixed: `drop` is `dropped`; `disabled`,
`not-accepted`, and `state-not-committed` are `rejected`; every other approved
reason is `cancelled`.

Extend `core-fixtures.ts` with `scopeFixture`, `performTransfer`,
`assertOriginalDom`, and sanitized lifecycle recorders. These helpers use the
fake platform from Task 4 and never bypass public Scope state transitions.

- [ ] **Step 6: Verify Scope GREEN and run the first broad Core gate**

Run:

```sh
node --import tsx --test test/unit/core/feedback.test.ts test/unit/core/auto-scroll.test.ts test/unit/core/scope.test.ts test/unit/core/event-order.test.ts test/unit/core/resource-lifecycle.test.ts
npm run test:run
npm run typecheck
npm run build
npm run test:types
node --test test/*.node.mjs
git diff --check
```

Expected: all Core tests pass; repeated drag/cancel/destroy leaves zero resources; built Core imports without DOM globals.

- [ ] **Step 7: Commit the complete Core**

```sh
git add src/core/feedback.ts src/core/auto-scroll.ts src/core/scope.ts src/core/model.ts src/core.ts test/unit/helpers/core-fixtures.ts test/unit/core/feedback.test.ts test/unit/core/auto-scroll.test.ts test/unit/core/scope.test.ts test/unit/core/event-order.test.ts test/unit/core/resource-lifecycle.test.ts test/types/core.test.ts
git commit -m "feat: complete sortable core scope"
```

### Task 6: Implement The Vanilla Root Facade And Minimal CSS

**Files:**
- Create: `src/index.ts`
- Create: `src/styles.css`
- Create: `src/vanilla/types.ts`
- Create: `src/vanilla/dom-transaction.ts`
- Create: `src/vanilla/create-sortable.ts`
- Create: `test/unit/vanilla/dom-transaction.test.ts`
- Create: `test/unit/vanilla/create-sortable.test.ts`
- Create: `test/types/root.test.ts`
- Modify: `test/unit/helpers/core-fixtures.ts`
- Modify: `package.json`
- Modify: `scripts/build-package.mjs`

**Interfaces:**
- Consumes: `createSortableScope`, rendered ID orders, the active Placeholder, and original DOM snapshots.
- Produces: package-root `createSortable()`, selector-safe area registration, successful DOM commit, rollback, and optional namespace CSS.

- [ ] **Step 1: Write failing Vanilla facade tests**

```ts
test("createSortable resolves selectors only at call time", async () => {
  const module = await import("../../../src/index.js");
  assert.equal(typeof module.createSortable, "function");
  assert.throws(
    () => module.createSortable("[", options()),
    hasCode("INVALID_ELEMENT"),
  );
  assert.throws(
    () => module.createSortable("#missing", options()),
    hasCode("INVALID_ELEMENT"),
  );
});

test("DOM transaction commits source at placeholder position", () => {
  const fixture = domFixture({
    todo: ["a", "b"],
    done: ["c"],
  });
  const transaction = createDomTransaction(fixture.registry);
  transaction.apply(transferChange("b", "todo", 1, "done", 1));
  assert.deepEqual(fixture.ids("todo"), ["a"]);
  assert.deepEqual(fixture.ids("done"), ["c", "b"]);
});

test("DOM transaction restores original parent and sibling", () => {
  const fixture = domFixture({ todo: ["a", "b"], done: ["c"] });
  const transaction = createDomTransaction(fixture.registry);
  transaction.apply(transferChange("b", "todo", 1, "done", 1));
  transaction.rollback();
  assert.deepEqual(fixture.ids("todo"), ["a", "b"]);
  assert.deepEqual(fixture.ids("done"), ["c"]);
});
```

- [ ] **Step 2: Run focused Vanilla tests and verify RED**

Run:

```sh
node --import tsx --test test/unit/vanilla/dom-transaction.test.ts test/unit/vanilla/create-sortable.test.ts
```

Expected: FAIL because the root facade and DOM transaction do not exist.

- [ ] **Step 3: Implement the selector-safe facade**

Public signatures:

```ts
export interface VanillaSortableAreaOptions
  extends Omit<SortableAreaOptions, "getItemId"> {
  getItemId?: (element: Element) => SortableId;
}

export interface VanillaSortableOptions
  extends VanillaSortableAreaOptions, SortableScopeOptions {}

export interface Sortable {
  registerArea(
    element: Element | string,
    options: VanillaSortableAreaOptions,
  ): () => void;
  updateArea(areaId: string, patch: SortableAreaPatch): void;
  cancel(): void;
  destroy(): void;
}

export function createSortable(
  element: Element | string,
  options: VanillaSortableOptions,
): Sortable;
```

`resolveElement` uses `globalThis.document` only inside the function. It catches selector syntax errors and throws only `new SortableError("INVALID_ELEMENT")`. `getItemId` falls back only to `data-sortable-id` and never to index, text, HTML, or DOM `id`.

The facade wraps Core `onChange` in this order:

```ts
const handleChange = (change: SortableChange): void => {
  transaction.apply(change);
  userOptions.onChange?.(change);
};
```

If the user callback throws or the next-frame DOM order does not match, the transaction restores the original parent/index before lifecycle completion.

Extend `core-fixtures.ts` with `domFixture` and selector-document builders used
only by Vanilla tests. They model `parentNode`, `nextSibling`, direct-child
queries, and `data-sortable-id` without reading fixture text.

- [ ] **Step 4: Add minimal optional CSS and final root exports**

```css
.comins-sortable__placeholder {
  box-sizing: border-box;
  pointer-events: none;
}

[data-comins-sortable-dragging] {
  cursor: grabbing;
  pointer-events: none;
}

@media (prefers-reduced-motion: reduce) {
  [data-comins-sortable-dragging] {
    transition: none !important;
  }
}
```

Do not add color, border, background, margin, padding, min-height, typography, or a global cursor rule. Update build to copy this file to `dist/styles.css`.

Add final root and CSS exports while keeping adapter exports absent until their tasks:

```json
{
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js"
    },
    "./core": {
      "types": "./dist/core.d.ts",
      "import": "./dist/core.js"
    },
    "./styles.css": "./dist/styles.css"
  },
  "sideEffects": [
    "./dist/styles.css"
  ]
}
```

- [ ] **Step 5: Verify Vanilla GREEN**

Run:

```sh
node --import tsx --test test/unit/vanilla/dom-transaction.test.ts test/unit/vanilla/create-sortable.test.ts
npm run typecheck
npm run build
npm run test:types
node --input-type=module --eval "await import('./dist/index.js'); await import('./dist/core.js')"
```

Expected: PASS without defining `window` or `document` before imports, and `dist/styles.css` contains only namespaced rules.

- [ ] **Step 6: Commit Vanilla**

```sh
git add src/index.ts src/styles.css src/vanilla/types.ts src/vanilla/dom-transaction.ts src/vanilla/create-sortable.ts test/unit/helpers/core-fixtures.ts test/unit/vanilla/dom-transaction.test.ts test/unit/vanilla/create-sortable.test.ts test/types/root.test.ts package.json scripts/build-package.mjs
git commit -m "feat: add vanilla sortable facade"
```

### Task 7: Implement The Controlled Framework Transaction

**Files:**
- Create: `src/framework/item-key.ts`
- Create: `src/framework/bindings.ts`
- Create: `src/framework/controlled-transaction.ts`
- Create: `test/unit/framework/item-key.test.ts`
- Create: `test/unit/framework/bindings.test.ts`
- Create: `test/unit/framework/controlled-transaction.test.ts`
- Create: `test/unit/helpers/framework-fixtures.ts`

**Interfaces:**
- Consumes: Core `SortableChange`, `reorder`, `transfer`, area IDs, item keys, and adapter-owned current arrays/setters.
- Produces: one `FrameworkSortableChange<T>`, same-stack source/destination updates, render verification support, and restoration of original arrays after partial failure or rejection.

- [ ] **Step 1: Write failing framework transaction tests**

```ts
test("transfer updates both areas once and emits one enhanced change", () => {
  const calls: string[] = [];
  const transaction = controlledFixture<Task>({
    todo: {
      items: [{ id: "a" }, { id: "b" }],
      setItems: (items) => calls.push("todo:" + ids(items).join(",")),
    },
    done: {
      items: [{ id: "c" }],
      setItems: (items) => calls.push("done:" + ids(items).join(",")),
    },
    onChange: (change) => {
      calls.push("root:" + change.operation);
      assert.deepEqual(change.updates.map((entry) => entry.areaId), [
        "todo",
        "done",
      ]);
    },
  });
  transaction.apply(transferChange("b", "todo", 1, "done", 1));
  assert.deepEqual(calls, [
    "todo:a",
    "done:c,b",
    "root:transfer",
  ]);
});

test("partial callback failure restores both original arrays", () => {
  const fixture = throwingControlledFixture();
  assert.throws(() => fixture.transaction.apply(fixture.change));
  assert.deepEqual(fixture.todo, [{ id: "a" }, { id: "b" }]);
  assert.deepEqual(fixture.done, [{ id: "c" }]);
});

test("itemKey never falls back to array index", () => {
  assert.throws(
    () => resolveItemIds([{ title: "missing" }], "id"),
    hasCode("MISSING_ITEM_ID"),
  );
});
```

- [ ] **Step 2: Run focused framework tests and verify RED**

Run:

```sh
node --import tsx --test test/unit/framework/item-key.test.ts test/unit/framework/bindings.test.ts test/unit/framework/controlled-transaction.test.ts
```

Expected: FAIL because the common adapter transaction is absent.

- [ ] **Step 3: Implement bindings and atomic updates**

Use this internal binding:

```ts
export interface FrameworkAreaBinding<T> {
  areaId: string;
  group: string;
  getItems(): readonly T[];
  getItemId(item: T): SortableId;
  setItems(items: readonly T[]): void;
  getElement(): Element | null;
}
```

`BindingRegistry<T>` enforces unique area IDs and group-wide item IDs, stores no item arrays beyond a transaction, and removes all callbacks on unregister.

`ControlledTransaction<T>.apply(change)` reads current arrays once, computes updates with Core helpers, invokes affected area setters in `change.orders` order, calls root `onChange` once with `FrameworkSortableChange<T>`, and retains originals only until `finish()` or `rollback()`.

```ts
export interface ControlledTransaction<T> {
  apply(change: SortableChange): FrameworkSortableChange<T>;
  confirm(change: SortableChange): boolean;
  finish(): void;
  rollback(): void;
  destroy(): void;
}
```

`confirm` compares each affected rendered direct-child ID order with `change.orders`. A rejected/cancelled `onAfterDrag` calls `rollback` before the consumer callback; a dropped result calls `finish`.

`test/unit/helpers/framework-fixtures.ts` defines `controlledFixture`,
`throwingControlledFixture`, `ids`, and sanitized adapter harness factories. It
stores only placeholder task objects such as `{ id: "a" }` and exposes
registration/update call counts without reaching into public package exports.

- [ ] **Step 4: Verify transaction GREEN**

Run:

```sh
node --import tsx --test test/unit/framework/item-key.test.ts test/unit/framework/bindings.test.ts test/unit/framework/controlled-transaction.test.ts
npm run typecheck
```

Expected: PASS with one reorder update, two transfer updates, one root change, rollback after every partial failure, and no retained original arrays after finish/destroy.

- [ ] **Step 5: Commit the common transaction**

```sh
git add src/framework/item-key.ts src/framework/bindings.ts src/framework/controlled-transaction.ts test/unit/helpers/framework-fixtures.ts test/unit/framework/item-key.test.ts test/unit/framework/bindings.test.ts test/unit/framework/controlled-transaction.test.ts
git commit -m "feat: add controlled sortable transactions"
```

### Task 8: Implement The React Adapter

**Files:**
- Create: `src/react.ts`
- Create: `src/react/context.ts`
- Create: `src/react/SortableRoot.tsx`
- Create: `src/react/SortableArea.tsx`
- Create: `test/unit/react/adapter.test.ts`
- Create: `test/types/react.test.tsx`
- Modify: `test/unit/helpers/framework-fixtures.ts`
- Modify: `package.json`

**Interfaces:**
- Consumes: Core Scope, common controlled transaction, React context/effects, item arrays, and stable item keys.
- Produces: `SortableRoot<T>` and `SortableArea<T>` only; no hook, uncontrolled mode, overlay, or render-strategy API.

- [ ] **Step 1: Write failing React contract tests**

Test lifecycle through a small injected adapter harness rather than jsdom:

```ts
test("Strict Mode setup-cleanup-setup leaves one registration", () => {
  const harness = reactAdapterHarness<Task>();
  const firstCleanup = harness.mountArea(areaProps());
  firstCleanup();
  const secondCleanup = harness.mountArea(areaProps());
  assert.equal(harness.registrationCount("todo"), 1);
  secondCleanup();
  assert.equal(harness.registrationCount("todo"), 0);
});

test("a Root transfer batches two controlled setters and one change", () => {
  const harness = reactAdapterHarness<Task>();
  harness.mountRoot();
  harness.mountArea(todoProps());
  harness.mountArea(doneProps());
  harness.transfer("b", "todo", 1, "done", 0);
  assert.deepEqual(harness.calls, [
    "set:todo:a",
    "set:done:b,c",
    "change:transfer",
  ]);
});
```

The type fixture must accept `<SortableRoot<Task>>` and render-prop inference, and reject `defaultItems`, public `useSortable`, index item keys, and non-ID item-key return values.

- [ ] **Step 2: Run React RED checks**

Run:

```sh
node --import tsx --test test/unit/react/adapter.test.ts
npm run test:types
```

Expected: FAIL because `comins-sortable/react` does not exist.

- [ ] **Step 3: Implement Root context and controlled Area**

Public props:

```ts
export interface SortableRootProps<T>
  extends Omit<SortableScopeOptions, "onChange"> {
  children?: React.ReactNode;
  onChange?: (change: FrameworkSortableChange<T>) => void;
}

export interface SortableAreaProps<T> {
  areaId: string;
  group?: string;
  items: readonly T[];
  itemKey: ItemKey<T>;
  onItemsChange(items: readonly T[]): void;
  children(item: T, index: number): React.ReactElement;
  direction?: SortableDirection;
  disabled?: boolean;
  handle?: string;
  ignore?: string;
  activationDistance?: number;
  emptyInsertThreshold?: number;
  autoScroll?: boolean;
  accept?: (context: DragContext) => boolean;
}
```

`SortableRoot` renders only a context provider. `SortableArea` renders one `div` with `data-comins-sortable-area={areaId}` and the item render results as direct children. Do not add an `as` or `tag` prop in v1.

The Area effect registers after mount, updates the binding when props change, and performs idempotent cleanup. Without a Root, it creates a private one-area Scope and transaction. Each render result must correspond to exactly one direct DOM child; activation rejects a count mismatch with `INVALID_ELEMENT`. Extend `framework-fixtures.ts` with `reactAdapterHarness` and fixed `todoProps`/`doneProps` builders that exercise the same binding lifecycle without a DOM emulator.

- [ ] **Step 4: Add the React export and verify GREEN**

Add:

```json
"./react": {
  "types": "./dist/react.d.ts",
  "import": "./dist/react.js"
}
```

Run:

```sh
node --import tsx --test test/unit/react/adapter.test.ts
npm run typecheck
npm run build
npm run test:types
node --input-type=module --eval "await import('./dist/react.js')"
```

Expected: PASS in Node without DOM globals; Strict Mode simulation has no duplicate registration.

- [ ] **Step 5: Commit React**

```sh
git add src/react.ts src/react/context.ts src/react/SortableRoot.tsx src/react/SortableArea.tsx test/unit/helpers/framework-fixtures.ts test/unit/react/adapter.test.ts test/types/react.test.tsx package.json
git commit -m "feat: add react sortable adapter"
```

### Task 9: Implement The Vue Adapter

**Files:**
- Create: `src/vue.ts`
- Create: `src/vue/context.ts`
- Create: `src/vue/SortableRoot.ts`
- Create: `src/vue/SortableArea.ts`
- Create: `test/unit/vue/adapter.test.ts`
- Create: `test/types/vue.test.ts`
- Modify: `test/unit/helpers/framework-fixtures.ts`
- Modify: `package.json`

**Interfaces:**
- Consumes: Core Scope, common controlled transaction, Vue provide/inject, `modelValue`, and stable item keys.
- Produces: `SortableRoot` and generic-typed `SortableArea` with `update:modelValue` and `item` slot only; no composable or directive.

- [ ] **Step 1: Write failing Vue contract tests**

```ts
test("transfer emits both model updates before one Root change", () => {
  const harness = vueAdapterHarness<Task>();
  harness.mountRoot();
  harness.mountArea(vueTodoProps());
  harness.mountArea(vueDoneProps());
  harness.transfer("b", "todo", 1, "done", 1);
  assert.deepEqual(harness.calls, [
    "update:todo:a",
    "update:done:c,b",
    "change:transfer",
  ]);
});

test("Area update replaces current items without re-registering", () => {
  const harness = vueAdapterHarness<Task>();
  const area = harness.mountArea(vueTodoProps());
  area.update({ ...vueTodoProps(), disabled: true });
  assert.equal(harness.registrationCount("todo"), 1);
  assert.equal(harness.area("todo").disabled, true);
});
```

The type fixture verifies `modelValue`, `itemKey`, item-slot value, `update:modelValue`, and root change payload. It rejects `useSortable`, directives, `defaultValue`, and missing item keys.

- [ ] **Step 2: Run Vue RED checks**

Run:

```sh
node --import tsx --test test/unit/vue/adapter.test.ts
npm run test:types
```

Expected: FAIL because `comins-sortable/vue` does not exist.

- [ ] **Step 3: Implement provider components in TypeScript**

Use `defineComponent` and `h` so the library build needs no Vue SFC compiler:

```ts
export interface VueSortableAreaProps<T> {
  modelValue: readonly T[];
  areaId: string;
  group?: string;
  itemKey: ItemKey<T>;
  direction?: SortableDirection;
  disabled?: boolean;
  handle?: string;
  ignore?: string;
  activationDistance?: number;
  emptyInsertThreshold?: number;
  autoScroll?: boolean;
  accept?: (context: DragContext) => boolean;
}

export interface VueSortableAreaSlots<T> {
  item(props: { item: T; index: number }): VNodeChild;
}

export interface VueSortableRootOptions<T>
  extends Omit<SortableScopeOptions, "onChange"> {
  onChange?: (change: FrameworkSortableChange<T>) => void;
}
```

`SortableRoot` provides the framework Scope/transaction and renders its default slot without a DOM wrapper. `SortableArea` renders one `div` with `data-comins-sortable-area`, calls the item slot once per item, and emits `update:modelValue` synchronously. Cast the internal `DefineComponent` to a generic public constructor type so TypeScript preserves `T` for props, slot, and emit.

On unmount, unregister once and drop all model callbacks. A one-area component without Root uses a private Scope. Extend `framework-fixtures.ts` with `vueAdapterHarness` and fixed `vueTodoProps`/`vueDoneProps` builders.

- [ ] **Step 4: Add the Vue export and verify GREEN**

Add:

```json
"./vue": {
  "types": "./dist/vue.d.ts",
  "import": "./dist/vue.js"
}
```

Run:

```sh
node --import tsx --test test/unit/vue/adapter.test.ts
npm run typecheck
npm run build
npm run test:types
node --input-type=module --eval "await import('./dist/vue.js')"
```

Expected: PASS with one registration across updates and no DOM access during module import.

- [ ] **Step 5: Commit Vue**

```sh
git add src/vue.ts src/vue/context.ts src/vue/SortableRoot.ts src/vue/SortableArea.ts test/unit/helpers/framework-fixtures.ts test/unit/vue/adapter.test.ts test/types/vue.test.ts package.json
git commit -m "feat: add vue sortable adapter"
```

### Task 10: Implement The Svelte Action Adapter

**Files:**
- Create: `src/svelte.ts`
- Create: `src/svelte/scope.ts`
- Create: `src/svelte/sortable.ts`
- Create: `test/unit/svelte/action.test.ts`
- Create: `test/types/svelte.test.ts`
- Modify: `test/unit/helpers/framework-fixtures.ts`
- Modify: `package.json`

**Interfaces:**
- Consumes: Core Scope, common controlled transaction, an existing element, and Svelte action update/destroy lifecycle.
- Produces: `createSortableScope<T>()` and generic `sortable<T>()` action only; no component, attachment, or CustomEvent.

- [ ] **Step 1: Write failing Svelte action tests**

```ts
test("action update synchronizes items and options in place", () => {
  const harness = svelteActionHarness<Task>();
  const action = sortable(harness.element, svelteOptions());
  action.update?.({
    ...svelteOptions(),
    items: [{ id: "b" }, { id: "a" }],
    disabled: true,
  });
  assert.equal(harness.registrationCount("todo"), 1);
  assert.deepEqual(harness.itemIds("todo"), ["b", "a"]);
  assert.equal(harness.area("todo").disabled, true);
});

test("action destroy is idempotent and releases callbacks", () => {
  const harness = svelteActionHarness<Task>();
  const action = sortable(harness.element, svelteOptions());
  action.destroy?.();
  action.destroy?.();
  assert.equal(harness.registrationCount("todo"), 0);
  assert.equal(harness.retainedCallbackCount, 0);
});
```

The type fixture confirms generic item inference and rejects action parameters without `areaId`, `items`, `itemKey`, or `onItemsChange`.

- [ ] **Step 2: Run Svelte RED checks**

Run:

```sh
node --import tsx --test test/unit/svelte/action.test.ts
npm run test:types
```

Expected: FAIL because `comins-sortable/svelte` does not exist.

- [ ] **Step 3: Implement typed Scope and action**

```ts
export interface SvelteSortableOptions<T> {
  scope?: SvelteSortableScope<T>;
  areaId: string;
  group?: string;
  items: readonly T[];
  itemKey: ItemKey<T>;
  onItemsChange(items: readonly T[]): void;
  direction?: SortableDirection;
  disabled?: boolean;
  handle?: string;
  ignore?: string;
  activationDistance?: number;
  emptyInsertThreshold?: number;
  autoScroll?: boolean;
  accept?: (context: DragContext) => boolean;
}

export interface SvelteActionReturn<T> {
  update(options: SvelteSortableOptions<T>): void;
  destroy(): void;
}

export interface SvelteSortableScopeOptions<T>
  extends Omit<SortableScopeOptions, "onChange"> {
  onChange?: (change: FrameworkSortableChange<T>) => void;
}

declare const svelteScopeBrand: unique symbol;

export interface SvelteSortableScope<T> {
  readonly [svelteScopeBrand]: (item: T) => T;
  cancel(): void;
  destroy(): void;
}

export function createSortableScope<T>(
  options?: SvelteSortableScopeOptions<T>,
): SvelteSortableScope<T>;

export function sortable<T>(
  node: HTMLElement,
  options: SvelteSortableOptions<T>,
): SvelteActionReturn<T>;
```

`createSortableScope<T>()` owns the common transaction and Core Scope. The action uses the supplied Scope or creates a private one, registers once, updates binding data/options without duplicate listeners, and destroys a private Scope only when the action owns it.

Do not import a Svelte runtime symbol. The function shape is directly compatible with `use:sortable` and keeps the optional Svelte peer boundary explicit. Extend `framework-fixtures.ts` with `svelteActionHarness` and a fixed `svelteOptions` builder.

- [ ] **Step 4: Add the Svelte export and verify GREEN**

Add:

```json
"./svelte": {
  "types": "./dist/svelte.d.ts",
  "import": "./dist/svelte.js"
}
```

Run:

```sh
node --import tsx --test test/unit/svelte/action.test.ts
npm run typecheck
npm run build
npm run test:types
node --input-type=module --eval "await import('./dist/svelte.js')"
```

Expected: PASS with no Svelte runtime import in built `dist/svelte.js` and no DOM access at module evaluation.

- [ ] **Step 5: Commit Svelte**

```sh
git add src/svelte.ts src/svelte/scope.ts src/svelte/sortable.ts test/unit/helpers/framework-fixtures.ts test/unit/svelte/action.test.ts test/types/svelte.test.ts package.json
git commit -m "feat: add svelte sortable action"
```

### Task 11: Build Browser Fixtures And Verify Real DOM Behavior

**Files:**
- Create: `playwright.config.ts`
- Create: `scripts/build-browser-fixtures.mjs`
- Create: `scripts/serve-browser-fixtures.mjs`
- Create: `example/index.html`
- Create: `example/shared.css`
- Create: `example/vanilla/index.html`
- Create: `example/vanilla/main.ts`
- Create: `example/react/index.html`
- Create: `example/react/main.tsx`
- Create: `example/vue/index.html`
- Create: `example/vue/main.ts`
- Create: `example/svelte/index.html`
- Create: `example/svelte/main.ts`
- Create: `example/svelte/App.svelte`
- Create: `test/playwright/helpers/drag.ts`
- Create: `test/playwright/interaction.spec.ts`
- Create: `test/playwright/geometry.spec.ts`
- Create: `test/playwright/rollback.spec.ts`
- Create: `test/playwright/auto-scroll.spec.ts`
- Create: `test/playwright/resource-stability.spec.ts`
- Modify: `package.json`
- Modify: `.gitignore`
- Modify: `.github/workflows/verify.yml`

**Interfaces:**
- Consumes: built source modules, all four public adapters, esbuild, the Svelte compiler, and Playwright.
- Produces: four minimal consumer fixtures, a dependency-free static server, cross-browser pointer evidence, Placeholder evidence, rollback evidence, and resource-stability evidence.

- [ ] **Step 1: Write browser specifications before fixtures**

Use one shared scenario table:

```ts
const adapters = ["vanilla", "react", "vue", "svelte"] as const;

for (const adapter of adapters) {
  test.describe(adapter, () => {
    test.beforeEach(async ({ page }) => {
      await page.goto("/" + adapter + "/");
    });

    test("reorders inside one area with a visible placeholder", async ({ page }) => {
      const drag = await beginDrag(page, "todo", "b");
      await drag.moveBefore("todo", "a");
      await expect(page.locator("[data-comins-sortable-placeholder]")).toHaveCount(1);
      await expect(page.locator("[data-comins-sortable-placeholder]")).toBeEmpty();
      await drag.drop();
      await expectIds(page, "todo", ["b", "a"]);
      await expectEventOrder(page, [
        "before",
        "start",
        "drag",
        "insert",
        "change",
        "after:dropped:drop",
      ]);
    });

    test("transfers into the pointer index of another area", async ({ page }) => {
      await dragItem(page, "todo", "b", { areaId: "done", beforeId: "d" });
      await expectIds(page, "todo", ["a"]);
      await expectIds(page, "done", ["c", "b", "d"]);
      await expectAtomicChange(page, {
        operation: "transfer",
        sourceAreaId: "todo",
        destinationAreaId: "done",
        itemId: "b",
      });
    });

    test("inserts into an empty destination at index zero", async ({ page }) => {
      await page.getByRole("button", { name: "Clear done" }).click();
      await dragItem(page, "todo", "a", { areaId: "done" });
      await expectIds(page, "done", ["a"]);
      await expectDestinationIndex(page, 0);
    });
  });
}
```

`expectEventOrder` treats the array as an ordered subsequence, requires exactly
one `before`, `start`, `change`, and `after`, and permits multiple rAF-throttled
`drag` calls. Separate assertions verify `insert` occurs only when area/index
changes.

`geometry.spec.ts` adds horizontal, variable-size, CSS-gap, and empty zero-primary-axis cases. `rollback.spec.ts` adds outside, Escape, pointercancel, blur, disabled, rejected accept, unmount, destroy, callback error, and state-not-committed. `auto-scroll.spec.ts` asserts the nearest scroll container moves and the page does not move when the inner container can still scroll.

- [ ] **Step 2: Run the focused browser spec and verify RED**

Run:

```sh
npx playwright test --config=playwright.config.ts --project=chromium test/playwright/interaction.spec.ts
```

Expected: FAIL because the browser configuration, server, fixtures, and helpers are absent.

- [ ] **Step 3: Build fixtures with esbuild and the Svelte compiler**

`scripts/build-browser-fixtures.mjs` uses esbuild only for test/example output:

```js
const sveltePlugin = {
  name: "svelte-fixture",
  setup(build) {
    build.onLoad({ filter: /\.svelte$/ }, async ({ path }) => {
      const source = await readFile(path, "utf8");
      const compiled = compile(source, {
        filename: path,
        generate: "client",
        css: "external",
      });
      return { contents: compiled.js.code, loader: "js" };
    });
  },
};

await build({
  entryPoints: {
    "vanilla/main": "example/vanilla/main.ts",
    "react/main": "example/react/main.tsx",
    "vue/main": "example/vue/main.ts",
    "svelte/main": "example/svelte/main.ts",
  },
  bundle: true,
  format: "esm",
  splitting: true,
  target: "es2020",
  sourcemap: true,
  outdir: ".example-dist",
  plugins: [sveltePlugin],
});
```

The build script removes only repository-relative `.example-dist`, copies the five HTML files and shared CSS, and emits no asset outside that directory. Add `.example-dist/` to `.gitignore`.

`scripts/serve-browser-fixtures.mjs` calls the build function once, serves only files below `.example-dist` on `127.0.0.1:4175`, rejects decoded paths containing `..`, sends fixed content types, and closes on SIGINT/SIGTERM.

- [ ] **Step 4: Implement the four fixtures with identical test controls**

Every fixture renders:

```html
<section data-area-section="todo">
  <h2>Todo</h2>
  <div data-test-area="todo"></div>
</section>
<section data-area-section="done">
  <h2>Done</h2>
  <div data-test-area="done"></div>
</section>
<button type="button" aria-label="Clear done">Clear done</button>
<output data-test-events></output>
```

Items use stable IDs `a`, `b`, `c`, and `d`. React runs under `StrictMode`, Vue uses `SortableRoot`/`SortableArea` via render functions, and Svelte uses the actual `use:sortable` action in `App.svelte`. All fixtures expose only sanitized test state under `window.__sortableFixture`: area ID orders, event names/reasons, last operation, and mount/destroy controls. Do not expose item text, raw events, DOM snapshots, or private engine objects.

- [ ] **Step 5: Configure Chromium, Firefox, WebKit, and resource tests**

```ts
export default defineConfig({
  testDir: "test/playwright",
  fullyParallel: true,
  use: {
    baseURL: "http://127.0.0.1:4175",
    trace: "on-first-retry",
  },
  webServer: {
    command: "npm run example:serve",
    url: "http://127.0.0.1:4175",
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
  },
  projects: [
    {
      name: "chromium",
      grepInvert: /@resource/,
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "firefox",
      grepInvert: /@resource/,
      use: { ...devices["Desktop Firefox"] },
    },
    {
      name: "webkit",
      grepInvert: /@resource/,
      use: { ...devices["Desktop Safari"] },
    },
    {
      name: "chromium-resource",
      grep: /@resource/,
      fullyParallel: false,
      workers: 1,
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
```

Add scripts:

```json
{
  "example:build": "node scripts/build-browser-fixtures.mjs",
  "example:serve": "node scripts/serve-browser-fixtures.mjs",
  "test:e2e": "playwright test --config=playwright.config.ts",
  "verify:e2e": "npm run test:e2e",
  "verify:full": "npm run verify && npm run verify:e2e"
}
```

- [ ] **Step 6: Add resource and accessibility assertions**

The internal `ResourceBag` unit tests remain the exact listener/rAF/observer gate. Browser resource tests perform 50 drag/cancel/destroy cycles and assert:

```ts
await expect(page.locator("[data-comins-sortable-placeholder]")).toHaveCount(0);
await expect(page.locator("[data-comins-sortable-dragging]")).toHaveCount(0);
await expect(page.locator("[data-comins-sortable-over]")).toHaveCount(0);
await expect.poll(() => fixtureResourceCounts(page)).toEqual({
  activeSessions: 0,
  placeholders: 0,
});
```

Use Chromium CDP DOM node and listener counts only as diagnostic attachments relative to a warmed baseline. Do not copy fixed heap-growth percentages from another module.

Across adapters, assert Escape cancellation, focus restoration to the original item/handle, Placeholder `aria-hidden="true"`, unchanged consumer roles/ARIA, and reduced-motion transition removal. Synthetic touch/pen Pointer Events may validate routing in Chromium but must not be reported as physical-device certification.

- [ ] **Step 7: Run browser GREEN checks**

Run:

```sh
npx playwright install chromium firefox webkit
npx playwright test --config=playwright.config.ts --project=chromium test/playwright/interaction.spec.ts
npm run verify:e2e
```

Expected: all required scenarios pass in Chromium, Firefox, and Playwright WebKit; `chromium-resource` passes serially. Report WebKit only as engine evidence.

- [ ] **Step 8: Add CI browser coverage and commit**

Add a `browser` job after `verify`:

```yaml
browser:
  needs: verify
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1
      with:
        persist-credentials: false
    - uses: actions/setup-node@249970729cb0ef3589644e2896645e5dc5ba9c38
      with:
        node-version: 24
        cache: npm
    - run: npm ci --ignore-scripts
    - run: npx playwright install --with-deps chromium firefox webkit
    - run: npm run verify:e2e
```

Commit:

```sh
git add playwright.config.ts scripts/build-browser-fixtures.mjs scripts/serve-browser-fixtures.mjs example test/playwright package.json .gitignore .github/workflows/verify.yml
git commit -m "test: add cross-browser sortable coverage"
```

### Task 12: Close Types, SSR, Security, Artifact, Consumer, And Documentation

**Files:**
- Create: `test/ssr/imports.node.mjs`
- Create: `scripts/verify-package-artifact.mjs`
- Create: `scripts/consumer-smoke.mjs`
- Create: `test/package-artifact-gate.node.mjs`
- Create: `test/source-security.node.mjs`
- Create: `CHANGELOG.md`
- Create: `reports/2026-08-07.md`
- Modify: `test/types/core.test.ts`
- Modify: `test/types/root.test.ts`
- Modify: `test/types/react.test.tsx`
- Modify: `test/types/vue.test.ts`
- Modify: `test/types/svelte.test.ts`
- Modify: `test/sensitive-data-gates.node.mjs`
- Modify: `test/license-gates.node.mjs`
- Modify: `scripts/check-licenses.mjs`
- Modify: `package.json`
- Modify: `README.md`
- Modify: `.github/workflows/verify.yml`

**Interfaces:**
- Consumes: the final build, all export targets, current lockfile, Gitleaks 8.30.1, npm pack, and the full browser suite.
- Produces: final public type/SSR proof, exactly one candidate tarball per artifact run, extracted artifact privacy/license evidence, peer-floor consumer smoke, user documentation, and implementation evidence. It does not publish.

- [ ] **Step 1: Write failing SSR, artifact, and consumer contract tests**

`test/ssr/imports.node.mjs` removes DOM globals and imports every JavaScript entry:

```js
import assert from "node:assert/strict";

for (const name of [
  "window",
  "document",
  "HTMLElement",
  "Element",
  "PointerEvent",
  "ResizeObserver",
]) {
  assert.equal(Object.hasOwn(globalThis, name), false);
}

for (const path of [
  "../../dist/index.js",
  "../../dist/core.js",
  "../../dist/react.js",
  "../../dist/vue.js",
  "../../dist/svelte.js",
]) {
  const entry = await import(path);
  assert.ok(Object.keys(entry).length > 0);
}
```

Artifact tests require one tarball, exact export targets, LICENSE, no runtime dependencies, no repository-only paths, no absolute source-map paths, no `node_modules` sources, and constant redacted failures.

```js
test("candidate artifact contains only the approved package surface", () => {
  const result = runArtifactVerifier(validFixture());
  assert.equal(result.status, 0, result.stderr);
  const expected = [
    "CHANGELOG.md",
    "LICENSE",
    "README.md",
    "dist/styles.css",
    "package.json",
    ...sourceModules.flatMap((name) => [
      "dist/" + name + ".d.ts",
      "dist/" + name + ".js",
      "dist/" + name + ".js.map",
    ]),
  ];
  assert.deepEqual(result.files.sort(), expected.sort());
});
```

Import `sourceModules` from `package-boundary.mjs`. The verifier rejects every
path outside this derived exact set, so a new internal source module requires an
intentional package-boundary and artifact-test update.

`test/source-security.node.mjs` scans only tracked `src/**/*.ts` and
`src/**/*.tsx` files and fails on these exact implementation surfaces:

```js
const FORBIDDEN_SOURCE = [
  /\binnerHTML\b/,
  /\bouterHTML\b/,
  /\binsertAdjacentHTML\b/,
  /\beval\s*\(/,
  /\bnew\s+Function\s*\(/,
  /\bfetch\s*\(/,
  /\bXMLHttpRequest\b/,
  /\bWebSocket\b/,
  /\blocalStorage\b/,
  /\bsessionStorage\b/,
  /\bdocument\.cookie\b/,
  /\bcloneNode\s*\(\s*true\s*\)/,
  /\bMutationObserver\b/,
];
```

It emits only `source-security-check: failed` and never prints the matching
source line or path.

- [ ] **Step 2: Run focused closure tests and verify RED**

Run:

```sh
npm run build
node --test test/ssr/imports.node.mjs test/package-artifact-gate.node.mjs
```

Expected: SSR may pass, but artifact tests fail because verifier, consumer smoke, complete files allow-list, and documentation are absent.

- [ ] **Step 3: Complete public type fixtures**

Each type fixture contains positive usage and negative `@ts-expect-error` assertions:

```ts
const tasks = [{ id: "a", title: "A" }] as const;
const next = reorder(tasks, 0, 0);
const firstId: "a" | undefined = next[0]?.id;

// @ts-expect-error itemKey must resolve to string or number
const invalidKey: ItemKey<{ value: object }> = (item) => item.value;

// @ts-expect-error Vanilla has no coordinate persistence API
createSortable(element, { ...options, x: 10, y: 20 });

// @ts-expect-error React v1 is controlled only
<SortableArea defaultItems={tasks} areaId="todo" itemKey="id">
  {(item) => <div>{item.title}</div>}
</SortableArea>;
```

Vue and Svelte fixtures similarly reject composable/directive/component/attachment surfaces and verify their approved callbacks. The type build must compile against final `dist/*.d.ts`, not only source paths.

- [ ] **Step 4: Implement one-artifact verification and consumer smoke**

`scripts/verify-package-artifact.mjs` performs this exact order:

```text
npm run build
→ create private temporary directory
→ npm pack --json --ignore-scripts --pack-destination artifactRoot exactly once
→ verify returned files against package.json#files and exact exports
→ extract with system tar into the temporary directory
→ inspect extracted package.json, ESM files, declarations, CSS, and source maps
→ verify gitleaks version is 8.30.1
→ gitleaks dir extractedPackageRoot with redacted captured output
→ node scripts/consumer-smoke.mjs tarballPath
→ remove the temporary directory in finally
```

Use only `execFileSync` argument arrays. Never parse tar/PAX bytes, run lifecycle scripts, retain scanner output, or print artifact contents. Success prints only `package-artifact-check: passed`; every failure prints only `package-artifact-check: failed`.

`scripts/consumer-smoke.mjs` creates isolated temporary consumers with dedicated npm cache/log directories:

```js
const consumers = [
  {
    name: "vanilla",
    packages: [tarball],
    imports: ["comins-sortable", "comins-sortable/core"],
  },
  {
    name: "react-18",
    packages: [tarball, "react@18.2.0", "react-dom@18.2.0"],
    imports: ["comins-sortable/react"],
  },
  {
    name: "vue-3.5",
    packages: [tarball, "vue@3.5.0"],
    imports: ["comins-sortable/vue"],
  },
  {
    name: "svelte-5",
    packages: [tarball, "svelte@5.0.0"],
    imports: ["comins-sortable/svelte"],
  },
];
```

Install with `--ignore-scripts --no-audit --no-fund`, import each JavaScript subpath without DOM globals, resolve `comins-sortable/styles.css`, and compile a small TypeScript consumer against each peer floor. The script never calls `npm pack`.

- [ ] **Step 5: Finalize package scripts and files**

The final script contract is:

```json
{
  "build": "node scripts/build-package.mjs",
  "check:licenses": "node scripts/check-licenses.mjs",
  "example:build": "node scripts/build-browser-fixtures.mjs",
  "example:serve": "node scripts/serve-browser-fixtures.mjs",
  "lint": "npm run typecheck",
  "typecheck": "tsc --noEmit",
  "test": "node scripts/run-unit-tests.mjs",
  "test:run": "node scripts/run-unit-tests.mjs",
  "test:policy": "node --test test/*.node.mjs",
  "test:types": "tsc -p test/types/tsconfig.json --noEmit",
  "test:ssr": "node --test test/ssr/*.node.mjs",
  "test:e2e": "playwright test --config=playwright.config.ts",
  "test:consumer": "node scripts/consumer-smoke.mjs",
  "verify": "npm run check:licenses && npm run test:policy && npm run typecheck && npm run test:run && npm run build && npm run test:types && npm run test:ssr",
  "verify:e2e": "npm run test:e2e",
  "verify:package-artifact": "node scripts/verify-package-artifact.mjs",
  "verify:full": "npm run verify && npm run verify:e2e && npm run verify:package-artifact"
}
```

Add `CHANGELOG.md` to `files`. Keep `private: true` and do not add `prepublishOnly`, publish, version, tag, or release automation.

- [ ] **Step 6: Update documentation and implementation report**

README must include:

- installation wording that clearly says the package is not yet published;
- Vanilla, Core helper, React, Vue, and Svelte minimal examples;
- one-area reorder and cross-area transfer semantics;
- stable ID, direct-child, controlled state, Placeholder, handle/ignore, disabled, accept, event order, and rollback contracts;
- optional CSS import and namespace customization;
- pointer-first accessibility statement, Escape, focus restoration, and consumer-provided move-button example using `reorder`/`transfer`;
- SSR and zero-runtime-dependency boundaries;
- Chromium/Firefox/Playwright WebKit wording that does not claim Safari or physical-device certification;
- full local verification commands and explicit no-publish status.

`CHANGELOG.md` begins with:

```markdown
# Changelog

## Unreleased

- Add the initial Vanilla TypeScript sortable Core.
- Add Vanilla JS, React, Vue, and Svelte adapters.
- Add pointer reorder, cross-area transfer, Placeholder, rollback, and auto-scroll.
```

`reports/2026-08-07.md` records summary, changed files by subsystem, focused RED/GREEN evidence, broad commands and exact counts, environment failures separately, candidate artifact status, unrun real Safari/physical device checks, zero publish actions, and residual risks. It must not include local absolute paths or personal data.

- [ ] **Step 7: Add CI artifact gate**

Add an `artifact` job that needs `verify` and installs pinned Gitleaks 8.30.1 using the same archive name and SHA-256 already present in the security job. Then:

```yaml
- run: npm ci --ignore-scripts
- run: PATH="$PWD/.local/bin:$PATH" npm run verify:package-artifact
```

Do not upload the tarball, publish it, or treat it as release evidence. The verifier removes it before job completion.

- [ ] **Step 8: Run fresh complete verification**

Run in this order:

```sh
npm ci --ignore-scripts
npm audit --audit-level=high
npm run verify
npm run verify:e2e
npm run verify:package-artifact
node scripts/check-public-identities.mjs
git diff --check
git status --short
```

Also run the installed Gitleaks 8.30.1 against the intended change range with captured/redacted output according to `.githooks/pre-push`. Expected:

- package/lock/license checks pass with zero runtime dependencies;
- Node policy, unit, type, build, and SSR checks pass;
- Chromium, Firefox, Playwright WebKit, and serial Chromium resource checks pass;
- one temporary candidate artifact passes allow-list, extracted Gitleaks, and all four consumer smokes, then is deleted;
- `reports/2026-07-27.md` remains untracked and untouched;
- no push, publish, tag, Release, Safari setting change, or external write occurs.

If a required gate fails, classify it as product, test-contract, or environment before changing code. After any meaningful correction, rerun the affected focused gate and this complete gate once.

- [ ] **Step 9: Commit closure evidence**

```sh
git add test/ssr test/types scripts/verify-package-artifact.mjs scripts/consumer-smoke.mjs test/package-artifact-gate.node.mjs test/source-security.node.mjs test/sensitive-data-gates.node.mjs test/license-gates.node.mjs scripts/check-licenses.mjs package.json README.md CHANGELOG.md reports/2026-08-07.md .github/workflows/verify.yml
git commit -m "docs: complete sortable v1 verification"
```

Do not push. Report the final commit list, exact verification results, preserved user file, and all unrun certification/release gates to the maintainer.
