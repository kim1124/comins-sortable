# React Adapter

React uses controlled `SortableRoot` and `SortableArea` components.

```tsx
import { useState } from 'react';
import { SortableArea, SortableRoot } from 'comins-sortable/react';

type Item = { id: string; label: string };

export function Tasks() {
  const [items, setItems] = useState<Item[]>([
    { id: 'task-1', label: 'Plan' },
    { id: 'task-2', label: 'Build' },
  ]);

  return (
    <SortableRoot<Item> onError={console.error}>
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

The root owns one shared scope. Place areas that transfer items inside the same
root and give them the same `group`. A rootless area creates a private one-area
scope. React Strict Mode setup and cleanup are supported without duplicate
registration.

`onItemsChange` must synchronously schedule the next controlled render. Root
`onChange` runs after all affected area setters and receives typed immutable
updates for the complete transaction.

Playground: <http://127.0.0.1:4003/examples/simple/react>
