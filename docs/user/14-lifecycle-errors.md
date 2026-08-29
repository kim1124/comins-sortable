# Lifecycle and Errors

Scope callbacks expose the drag lifecycle without transferring state ownership
to the library.

## Complete example

```tsx
import { useState } from 'react';
import { SortableArea, SortableRoot } from 'comins-sortable/react';

type Item = { id: string; label: string; locked?: boolean };

export function LifecycleExample() {
  const [items, setItems] = useState<Item[]>([
    { id: 'task-1', label: 'Plan' },
    { id: 'task-2', label: 'Build' },
  ]);

  return (
    <SortableRoot<Item>
      onBeforeDragStart={(context) => {
        const item = items.find(({ id }) => id === context.itemId);
        return item?.locked !== true;
      }}
      onDragStart={(context) => console.info('start', context)}
      onDrag={(context) => console.info('drag', context)}
      onInsertDragArea={(event) => {
        console.info('destination', event.destination);
      }}
      onChange={(change) => console.info('change', change)}
      onAfterDrag={(result) => {
        console.info('complete', result.status, result.reason);
      }}
      onError={(error) => console.error('sortable error', error)}
    >
      <SortableArea
        areaId="tasks"
        items={items}
        itemKey="id"
        onItemsChange={(next) => setItems([...next])}
      >
        {(item) => <div>{item.label}</div>}
      </SortableArea>
    </SortableRoot>
  );
}
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
