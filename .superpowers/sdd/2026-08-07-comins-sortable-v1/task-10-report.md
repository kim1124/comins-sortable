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
