# Task 9: Vue Adapter Report

## Scope

- Date: 2026-08-12 (Asia/Seoul)
- Implemented only the approved `comins-sortable/vue` surface: `SortableRoot` and generic controlled `SortableArea`.
- No remote write, publish, tag, release, dependency addition, or public API outside `./vue` was performed.

## RED evidence

```sh
node --import tsx --test test/unit/vue/adapter.test.ts
npm run test:types
```

- The focused suite failed with `ERR_MODULE_NOT_FOUND` for `src/vue/context.js`.
- The type fixture failed with `TS2307` because `comins-sortable/vue` was not exported.

## GREEN implementation

- Added a provider-only Root that emits one typed `change` event.
- Added a one-div Area with required `modelValue`, `areaId`, and stable `itemKey`; it emits `update:modelValue` synchronously and exposes only the `item` slot.
- Added a private lifecycle primitive shared by the component and sanitized injected harness. It keeps bindings current without option re-registration and owns rootless controller cleanup.
- Reused the shared framework transaction, including pre-activation structural validation and rollback/error ordering.
- Added only `./vue` types/ESM export and its package-policy expectation.

## GREEN evidence

```sh
node --import tsx --test test/unit/vue/adapter.test.ts
npm run typecheck
npm run build
npm run test:types
node --input-type=module --eval "await import('./dist/vue.js')"
```

- Focused Vue suite passed: 11/11.
- Typecheck, build, type fixture, and DOM-global-free built import passed.

## Remaining risk

- Tests use a sanitized lifecycle harness and injected Core fake platform. Real browser pointer E2E remains outside Task 9.
- Vue SSR fragment comments are framework output for VNode arrays, not DOM wrapper elements; runtime direct-child validation reads Element children only.
