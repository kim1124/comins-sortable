# Handle and Acceptance

Use selectors to control activation and callbacks to control destinations.

## Complete example

```tsx
import { useState } from 'react';
import { SortableArea, SortableRoot } from 'comins-sortable/react';

type Item = { id: string; label: string };

export function HandleExample() {
  const [items, setItems] = useState<Item[]>([
    { id: 'task-1', label: 'Plan' },
    { id: 'task-2', label: 'Build' },
  ]);

  return (
    <SortableRoot<Item>>
      <SortableArea
        areaId="tasks"
        items={items}
        itemKey="id"
        handle=".drag-handle"
        ignore="a, input, textarea, select"
        activationDistance={4}
        accept={(context) => context.source.areaId !== 'locked'}
        onItemsChange={(next) => setItems([...next])}
      >
        {(item) => (
          <div>
            <button
              type="button"
              className="drag-handle"
              aria-label={`Drag ${item.label}`}
            >
              ⠿
            </button>
            <span>{item.label}</span>
          </div>
        )}
      </SortableArea>
    </SortableRoot>
  );
}
```

An explicit `handle` takes precedence over `ignore`. Use a real button for an
accessible handle and provide a descriptive label. `activationDistance`
prevents small pointer movement from immediately starting a drag.

For cards with selectable text, start moves only from the handle. Set the body's
`user-select` and `-webkit-user-select` to `text`, and the handle's to `none`.
Apply `touch-action: none` to the handle to preserve default touch behavior in
the body. The Playground uses this pattern for all cards and suppresses body
selection only during an active drag. Selection becomes available again after
completion or cancellation. With `multiDrag`, use modifier keys with handle
clicks to select items. Input outside the handle or on ignored content does not
change item selection.

`accept(context)` controls a candidate destination. Group `put` controls which
source groups may enter. `disabled` blocks a source or destination area at
runtime and cancels an active owner drag.

While the pointer is over a rejected destination or a non-sortable sibling in
the same host, the target and drag preview expose
`data-comins-sortable-rejection`. The default `styles.css` applies a red outline
and a `not-allowed` cursor. Override them with
`--comins-sortable-rejection-outline` and
`--comins-sortable-rejection-outline-offset`. The state is removed when the
pointer returns to a valid destination or the drag ends.

Playground:

- <http://127.0.0.1:4003/examples/handle/react>
- <http://127.0.0.1:4003/examples/accept/react>
