# Copy and Clone

Return `copy` from a source group's `pull` policy and provide a factory that
creates a new stable ID. The source array remains unchanged.

## Complete example

```tsx
import { useState } from 'react';
import { SortableArea, SortableRoot } from 'comins-sortable/react';

type Item = { id: string; label: string };
const sourceGroup = { name: 'tasks', pull: 'copy' as const };

export function CopyExample() {
  const [catalog, setCatalog] = useState<Item[]>([
    { id: 'template-1', label: 'Template' },
  ]);
  const [board, setBoard] = useState<Item[]>([]);

  return (
    <SortableRoot<Item>>
      <SortableArea
        areaId="catalog"
        group={sourceGroup}
        items={catalog}
        itemKey="id"
        copyItem={(item) => ({
          ...item,
          id: crypto.randomUUID(),
          label: `${item.label} copy`,
        })}
        onItemsChange={(next) => setCatalog([...next])}
      >
        {(item) => <div>{item.label}</div>}
      </SortableArea>

      <SortableArea
        areaId="board"
        group="tasks"
        items={board}
        itemKey="id"
        onItemsChange={(next) => setBoard([...next])}
      >
        {(item) => <div>{item.label}</div>}
      </SortableArea>
    </SortableRoot>
  );
}
```

React, Vue, and Svelte use `copyItem(item, context)`. Vanilla uses
`copyElement(source, context)` and must return a detached element whose ID is
new and matches `getItemId`. An attached, missing, or duplicate copy fails
closed without changing either area.

`pull` may also be a callback. The modifier-copy example reads the activation
snapshot and returns `copy` for Alt/Option, otherwise `move`.

Playground: `clone`, `custom-clone`, and `modifier-copy` under
<http://127.0.0.1:4003/examples/clone/react>.
