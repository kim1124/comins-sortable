# Core Concepts

Comins Sortable separates pointer interaction from application state.

- A **scope** owns one drag lifecycle and isolates its registrations.
- An **area** is one sortable container with a stable `areaId`.
- A **group** controls move or copy between areas.
- An **item ID** is stable business identity, not visual position.
- A **controlled commit** renders proposed arrays before next-frame verification.

Framework adapters apply one immutable transaction to every affected area. For
a transfer, source and destination setters run before the root `onChange`
callback. A setter or callback failure restores the original arrays.

Vanilla `createSortable` owns its DOM transaction but does not own a consumer's
business model. Update any model that mirrors the DOM from `onChange`.

Use a string group for ordinary movement:

```ts
const group = 'tasks';
```

Use an object group for copy or directional acceptance:

```ts
const group = {
  name: 'tasks',
  pull: 'copy' as const,
  put: ['tasks'],
};
```

See [Reorder and Transfer](./07-reorder-transfer.md), [Copy and Clone](./08-copy-clone.md),
and [Lifecycle and Errors](./14-lifecycle-errors.md).
