# Custom Hosts and Slots

React `as` and Vue `tag` change the sortable host without changing the Area
contract. Svelte and Vanilla register the element that directly contains items.

## Complete example

```tsx
import { useState } from 'react';
import { SortableArea, SortableRoot } from 'comins-sortable/react';

type Item = { id: string; label: string };

export function CustomHostExample() {
  const [items, setItems] = useState<Item[]>([
    { id: 'task-1', label: 'Plan' },
    { id: 'task-2', label: 'Build' },
  ]);

  return (
    <SortableRoot<Item>>
      <SortableArea
        as="ul"
        areaId="tasks"
        areaProps={{ 'aria-label': 'Tasks', style: { listStyle: 'none', padding: 0 } }}
        items={items}
        itemKey="id"
        handle=".drag-handle"
        header={<li>Tasks to complete</li>}
        footer={<li>End of list — not a drop target</li>}
        onItemsChange={(next) => setItems([...next])}
      >
        {(item) => (
          <li>
            <button
              type="button"
              className="drag-handle"
              aria-label={`Drag ${item.label}`}
              style={{ touchAction: 'none', userSelect: 'none', WebkitUserSelect: 'none' }}
            >
              ⠿
            </button>
            <span>{item.label}</span>
          </li>
        )}
      </SortableArea>
    </SortableRoot>
  );
}
```

This example uses a real `ul` host and keeps the header/footer `li` elements
outside the sortable items. A consumer component passed to `as` must forward
the React ref to that host. Vue component hosts must expose the real root
element that will be registered.

React `header` and `footer`, Vue slots, or a narrowed Vanilla/Svelte `item`
selector keep non-sortable content in the same host. Non-item siblings must not
match the item selector or appear in the controlled array. Hovering such a
sibling rejects the candidate with `not-accepted` feedback.

For Vanilla/Svelte, `item: ':scope > .task-item'` limits discovery to direct
items. Selectors are evaluated in the registered Area, rather than with
`matches()` on each child. Do not give header/footer elements that item class.

The `third-party` example uses a consumer-defined host without an external UI
package dependency. Its name does not certify a third-party library integration.
Table-row and table-column Playground demos were removed; the generic host API
does not establish support for table sorting.

Playground:

- <http://127.0.0.1:4003/examples/third-party/react>
- <http://127.0.0.1:4003/examples/footer-slot/react>
- <http://127.0.0.1:4003/examples/header-slot/react>
- <http://127.0.0.1:4003/examples/two-list-slots/react>
