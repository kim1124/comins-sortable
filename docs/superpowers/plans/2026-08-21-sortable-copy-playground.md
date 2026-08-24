# Sortable Copy And Clone Playground Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add framework-neutral copy operations and expose Clone, Custom Clone, and Modifier Copy as real Vanilla, React, Vue, and Svelte Playground examples.

**Architecture:** Preserve the current pointer/session/commit pipeline and extend its area contract with normalized group pull/put rules plus a copy-ID preparation callback. Core produces one immutable `copy` change; Vanilla and framework transactions own the prepared DOM element or typed item and release or discard it through the existing cleanup-first lifecycle. Playground examples use only public adapter APIs.

**Tech Stack:** TypeScript 7, Vanilla TypeScript Core, React 19, Vue 3.5, Svelte 5, Node test runner, Vite 7.3.6, Playwright 1.62.

**Spec:** `docs/superpowers/specs/2026-08-14-comins-sortable-playground-parity-design.md`

## Global Constraints

- Runtime dependencies remain empty.
- Existing string `group` behavior remains source-compatible and means same-name move.
- Copy mode requires an explicit consumer factory; no default deep clone is provided.
- The source order is preserved and only the destination receives the copied item.
- Copy IDs must be string or number and unique across the group.
- Factory errors, duplicate IDs, callback failures, and state-not-committed results clean up prepared copies and invoke `onAfterDrag` once.
- The three examples must mount the actual public Vanilla, React, Vue, and Svelte adapters.
- Do not push, publish, tag, create a Release, or edit the CI browser workflow.

---

### Task 1: Core Copy Contract

**Files:**
- Modify: `src/core/model.ts`
- Modify: `src/core/operations.ts`
- Modify: `src/core/pointer.ts`
- Modify: `src/core/registry.ts`
- Modify: `src/core/scope.ts`
- Modify: `src/core.ts`
- Modify: `test/unit/core/operations.test.ts`
- Modify: `test/unit/core/pointer.test.ts`
- Modify: `test/unit/core/event-order.test.ts`
- Modify: `test/unit/helpers/core-fixtures.ts`
- Modify: `test/types/core.test.ts`

**Interfaces:**
- Consumes: existing `SortableScope`, `DragContext`, pointer/session lifecycle.
- Produces: `SortableTransferMode`, `SortableGroupOptions`, `SortableGroup`, `CopyItemContext`, `SortableCopyChange`, `buildCopyChange()` and modifier snapshots.

- [ ] **Step 1: Write failing operation and type tests**

Add literal assertions proving that `buildCopyChange(['a', 'b'], ['c'], source, destination, 'a-copy')` returns:

```ts
{
  operation: 'copy',
  sourceItemId: 'a',
  itemId: 'a-copy',
  source: { areaId: 'todo', index: 0 },
  destination: { areaId: 'done', index: 1 },
  orders: [
    { areaId: 'todo', itemIds: ['a', 'b'] },
    { areaId: 'done', itemIds: ['c', 'a-copy'] },
  ],
}
```

Add public type fixtures for object group options and `PointerSnapshot` modifier booleans. The production mutation caught is any copy implementation that removes the source, reuses the source ID, or drops modifier state.

- [ ] **Step 2: Run Core RED**

Run:

```sh
node --import tsx --test test/unit/core/operations.test.ts test/unit/core/pointer.test.ts
npm run test:types
```

Expected: compile failures because `buildCopyChange`, copy types, and pointer modifiers do not exist.

- [ ] **Step 3: Implement immutable copy operations and modifier snapshots**

Define:

```ts
export type SortableTransferMode = 'move' | 'copy';
export interface SortableGroupOptions {
  name: string;
  pull?: false | SortableTransferMode | ((context: DragContext) => false | SortableTransferMode);
  put?: boolean | readonly string[] | ((context: DragContext) => boolean);
}
export type SortableGroup = string | SortableGroupOptions;
export interface CopyItemContext extends DragContext {
  destination: SortableLocation;
}
```

Make `SortableChange` a discriminated union. `SortableCopyChange` contains `operation: 'copy'`, `sourceItemId`, the copied `itemId`, unchanged source order, and copied destination order. Extend `PointerInput`, pending pointer state, and `PointerSnapshot` with `altKey`, `ctrlKey`, `metaKey`, and `shiftKey`, defaulting missing structural inputs to `false`.

- [ ] **Step 4: Write failing Scope copy lifecycle tests**

Use the real internal Core fixture to prove:

- string groups still transfer;
- `{ name: 'tasks', pull: 'copy' }` calls the source copy-ID callback once at release;
- source order stays `['a', 'b']`, destination becomes `['c', 'a-copy']`;
- `pull(context)` sees activation modifier booleans;
- `pull: false`, failed `put`, and a duplicate copied ID reject before `onChange`;
- factory throw ends with `after:cancelled:error`, cleans feedback, and reports one error.

Expected RED: object group validation or copy change creation is unsupported.

- [ ] **Step 5: Implement normalized group routing in Scope**

Normalize string groups to `{ name, pull: 'move', put: [name] }`. Store the source pull decision in `ActiveDrag`; same-area reorder remains available, while cross-area candidates require non-false pull plus destination `put` and `accept`. At release, call `prepareCopy(context)` exactly once for copy mode, validate the returned ID against every current group ID, build the copy change, then reuse commit verification and cleanup.

- [ ] **Step 6: Run Task 1 GREEN and commit**

Run the focused Core/type tests and `npm run typecheck`. Commit:

```sh
git add src/core src/core.ts test/unit/core test/unit/helpers/core-fixtures.ts test/types/core.test.ts
git commit -m "feat: add sortable copy operations"
```

---

### Task 2: Vanilla And Framework Copy Transactions

**Files:**
- Modify: `src/framework/bindings.ts`
- Modify: `src/framework/controlled-transaction.ts`
- Modify: `src/vanilla/types.ts`
- Modify: `src/vanilla/create-sortable.ts`
- Modify: `src/vanilla/dom-transaction.ts`
- Modify: `src/react/SortableArea.tsx`
- Modify: `src/react/lifecycle.ts`
- Modify: `src/vue/SortableArea.ts`
- Modify: `src/vue/lifecycle.ts`
- Modify: `src/svelte/sortable.ts`
- Modify: `test/unit/framework/controlled-transaction.test.ts`
- Modify: `test/unit/vanilla/dom-transaction.test.ts`
- Modify: `test/unit/vanilla/create-sortable.test.ts`
- Modify: `test/unit/react/adapter.test.ts`
- Modify: `test/unit/vue/adapter.test.ts`
- Modify: `test/unit/svelte/action.test.ts`
- Modify: `test/types/react.test.tsx`
- Modify: `test/types/vue.test.ts`
- Modify: `test/types/svelte.test.ts`

**Interfaces:**
- Consumes: Task 1 `SortableCopyChange` and `CopyItemContext`.
- Produces: React/Vue/Svelte `copyItem(item, context): T` and Vanilla `copyElement(source, context): Element`.

- [ ] **Step 1: Write failing framework transaction tests**

Register source `[{id:'a'}]` and destination `[{id:'c'}]` bindings. A copy change with new ID `a-copy` must call only the destination setter with `[{id:'c'},{id:'a-copy'}]`, preserve the source reference, and emit one enhanced change. Missing factory, factory throw, and duplicate returned ID must leave both bindings unchanged.

- [ ] **Step 2: Run framework RED**

Run:

```sh
node --import tsx --test test/unit/framework/controlled-transaction.test.ts
```

Expected: copy is treated as transfer and removes the source.

- [ ] **Step 3: Implement prepared typed copies**

Extend `FrameworkAreaBinding<T>` with optional `copyItem(context): T`. Let the source binding prepare one item and derive its ID before Core emits `onChange`; cache it only for the active transaction. `ControlledTransaction.apply()` inserts the prepared item only into the destination, verifies the ID equals `change.itemId`, and clears the prepared copy on finish, rollback, destroy, or error.

React, Vue, and Svelte area props/options expose `copyItem`. Lifecycle getters always read the latest factory without registration churn.

- [ ] **Step 4: Write failing Vanilla DOM tests**

Prove `copyElement` inserts a distinct element into the destination, keeps the source in place, removes the copy on rollback, retains it on release, and rejects a returned element that does not match the direct item selector or has a duplicate/missing ID.

- [ ] **Step 5: Implement Vanilla prepared DOM copies**

Add `copyElement` to `VanillaSortableAreaOptions`. Prepare the copied element through the source area callback, validate without exposing consumer content, and let `DomTransaction.apply()` insert it for `operation: 'copy'`. Rollback removes only the prepared copy; release clears transaction references.

- [ ] **Step 6: Add public adapter type fixtures and run GREEN**

Compile a typed clone factory for React, Vue, and Svelte and reject wrong return types. Run focused transaction/adapter tests plus `npm run typecheck` and `npm run test:types`. Commit:

```sh
git add src/framework src/vanilla src/react src/vue src/svelte test/unit/framework test/unit/vanilla test/unit/react test/unit/vue test/unit/svelte test/types
git commit -m "feat: add adapter copy factories"
```

---

### Task 3: Clone Playground Examples

**Files:**
- Modify: `example/src/app/navigation.ts`
- Modify: `example/src/app/messages.ts`
- Modify: `example/src/playground/scenarios.ts`
- Modify: `example/src/adapters/demo-data.ts`
- Modify: `example/src/adapters/vanilla.ts`
- Modify: `example/src/adapters/react.tsx`
- Modify: `example/src/adapters/vue.ts`
- Modify: `example/src/adapters/SvelteDemo.svelte`
- Modify: `example/src/styles.css`
- Modify: `test/unit/playground/navigation.test.ts`
- Modify: `test/unit/playground/demo-data.test.ts`
- Modify: `test/playground/playground.spec.ts`

**Interfaces:**
- Consumes: public copy group/factory APIs from Tasks 1 and 2.
- Produces: canonical `/examples/clone/:adapter`, `/examples/custom-clone/:adapter`, and `/examples/modifier-copy/:adapter` routes.

- [ ] **Step 1: Write navigation and demo-data RED tests**

Assert the three route IDs resolve without fallback. Add hand-checked clone state helpers that generate deterministic IDs (`design-copy-1`, `design-copy-2`) and never mutate catalog/source arrays.

- [ ] **Step 2: Run Playground unit RED**

Run:

```sh
node --import tsx --test test/unit/playground/navigation.test.ts test/unit/playground/demo-data.test.ts
```

Expected: route fallback and missing clone state behavior.

- [ ] **Step 3: Implement localized scenario metadata and real adapter demos**

Add Korean/English titles, descriptions, API badges, and controls. `clone` always copies with an explicit identity-preserving factory plus a new ID; `custom-clone` changes the copied title/detail; `modifier-copy` uses Alt on Windows/Linux and Option on macOS through `pointer.altKey`, moving normally without the modifier. All adapters publish the same sanitized model/change/event shape.

- [ ] **Step 4: Write browser RED tests**

For every adapter, drag `design` from source to destination and assert:

- Clone: source remains unchanged and destination contains `design-copy-1`.
- Custom Clone: rendered copy has the custom title and model contains only IDs.
- Modifier Copy: Alt drag copies, ordinary drag moves.
- Event timeline contains one change and one dropped after-drag; last operation is `copy` for copy paths.

- [ ] **Step 5: Run Chromium RED, implement minimal UI, then GREEN**

Run the focused Chromium grep before and after implementation. Commit:

```sh
git add example/src test/unit/playground test/playground/playground.spec.ts
git commit -m "feat: add clone playground examples"
```

---

### Task 4: Affected Verification And Delivery

**Files:**
- Modify: `reports/2026-08-12.md`

**Interfaces:**
- Consumes: all copy commits.
- Produces: same-commit package, Playground, and work-report evidence.

- [ ] **Step 1: Run affected gates once after the last meaningful change**

Run:

```sh
npm run verify
npm run verify:playground
git diff --check
```

Run the existing 205-case low-level E2E gate only if Core pointer/geometry/lifecycle behavior changed after its focused tests; if run, record its exact result separately. Classify any failure and rerun only the failed or affected job under Contract v1.6.

- [ ] **Step 2: Update the work report**

Record date, copy contracts, changed files, RED/GREEN evidence, exact gate counts, and residual WebKit/Safari and physical touch/pen boundaries. Do not claim full 17-example parity; this slice raises visible parity from 6 to 9 examples.

- [ ] **Step 3: Run pre-commit and create the final local commit**

```sh
git add reports/2026-08-12.md
.githooks/pre-commit
git diff --cached --check
git commit -m "docs: report sortable clone parity"
```

- [ ] **Step 4: Start the local Playground**

Run `npm run dev`, open `/examples/clone/react`, and leave the local preview available. No remote action is authorized.
