# Lifecycle and Errors

Scope callbacks expose the drag lifecycle without transferring state ownership
to the library.

```ts
const lifecycle = {
  onBeforeDragStart: (context) => canStart(context),
  onDragStart: (context) => log('start', context),
  onDrag: (context) => log('drag', context),
  onInsertDragArea: (event) => log('destination', event.destination),
  onChange: (change) => audit(change),
  onAfterDrag: (result) => log(result.status, result.reason),
  onError: (error) => report(error),
};
```

Returning `false` from `onBeforeDragStart` abandons pending activation without
starting an after-drag lifecycle. After activation, cleanup and rollback occur
before `onAfterDrag`. The result status is `dropped`, `cancelled`, or
`rejected`; its reason distinguishes drop, outside, pointer cancellation,
Escape, blur, disabled state, rejection, nested cycle, unmount, stale commit,
destroy, and callback error.

`onError` is the application error boundary. React and Vue report structural
Core failures there even when a consumer callback was not reached. Svelte uses
the supplied scope handler and otherwise reports through the Core platform.

Destroy every owned scope or adapter instance. Destruction is idempotent,
cancels active work, releases pointer capture, frames, listeners, animations,
placeholders, and retained rollback state.

Do not treat `onChange` as proof of success. A successful controlled render and
`onAfterDrag({ status: 'dropped' })` close the transaction.
