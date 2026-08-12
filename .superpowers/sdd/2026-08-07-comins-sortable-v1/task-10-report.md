# Task 10: Svelte Action Adapter Report

## Scope

- Date: 2026-08-12 (Asia/Seoul)
- Implemented only the approved `comins-sortable/svelte` surface: generic `createSortableScope<T>()`, generic `sortable<T>()`, and their documented Scope/action/options types.
- No Svelte runtime import, component, attachment, CustomEvent, remote write, publish, tag, or release was added.

## RED evidence

```sh
node --import tsx --test test/unit/svelte/action.test.ts
npm run test:types
```

- The focused suite failed with `ERR_MODULE_NOT_FOUND` for `src/svelte.js`.
- The public type fixture failed with `TS2307` because `comins-sortable/svelte` was not exported.

## GREEN implementation

- Added a branded generic Scope over the shared binding registry, controlled transaction, and Core Scope.
- Added a direct Svelte-compatible action that registers once, reads latest items/item key/callbacks, patches options in place, and safely re-registers for area ID or Scope transitions.
- Private action Scopes are destroyed once and release controller callbacks; supplied shared Scopes survive individual action destruction.
- Reused pre-activation structural validation, transaction ordering/rollback, dynamic Core `onError` fallback, and omitted `autoScroll` forwarding semantics from the prior adapters.
- Added only the `./svelte` package export and the matching package-boundary assertion.

## GREEN evidence

```sh
node --import tsx --test test/unit/svelte/action.test.ts
npm run typecheck
npm run build
npm run test:types
node --input-type=module --eval "await import('./dist/svelte.js')"
```

- The focused Svelte suite passed: 10/10.
- The suite covers action updates, private and shared Scope cleanup, transfer setter/change ordering, area/Scope transitions, rollback callback/error order, zero-child activation rejection, and Core platform error fallback.
- Typecheck, build, type fixture, and built import passed; the built Svelte entry contains no Svelte runtime import.
- `npm run verify` passed: policy 26/26 and full unit 149/149, followed by build and public type fixtures.
- `.githooks/pre-commit` and `git diff --check` passed.

## Remaining risk

- The sanitized harness uses the production Scope/action lifecycle with an injected Core surface, and structural/error activation uses the real Core fake platform. Real browser Svelte compilation and pointer E2E remain Task 11 scope.

## Review fix round 1

### RED evidence

```sh
node --import tsx --test test/unit/svelte/action.test.ts
npm run test:types
```

- The review regressions were first fixed as tests. The initial focused run failed because the new deterministic action-inspection hook was absent from the production module.

### GREEN changes

- Area and Scope transitions are transactional: a same-Scope transition detaches only when necessary, restores the old registration after candidate failure, and preserves the original failure if restoration also fails.
- A failed supplied/destroyed Scope transition leaves the old action attached. A newly created private Scope candidate is destroyed on transition or initial-registration failure.
- Action state is now one nullable object. `destroy()` unregisters first, destroys an owned Scope, then clears node, options, Scope, Scope factory, and disposer references; later updates are no-ops.
- The Svelte controller tracks every active registration disposer and drains them before Core Scope/transaction destruction, so destroying a shared Scope releases every action binding even when action objects remain alive.
- Added missing `itemKey` type rejection and type-only Svelte `Action` compatibility coverage; no Svelte runtime import is emitted.

### GREEN evidence

- Focused Svelte suite: 17/17 passed.
- Typecheck, build, type fixture, built import, and runtime Svelte-import scan passed.
- `npm run verify` passed: policy 26/26 and full unit 156/156; pre-commit and diff check passed.
