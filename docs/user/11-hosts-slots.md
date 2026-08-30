# Custom Hosts and Slots

React `as` and Vue `tag` change the sortable host without changing the area
contract. Svelte and Vanilla register the element that owns the item children.

## Complete example

```tsx
import { useState } from 'react';
import { SortableArea, SortableRoot } from 'comins-sortable/react';

type Row = { id: string; name: string; owner: string };

export function TableRowsExample() {
  const [rows, setRows] = useState<Row[]>([
    { id: 'project-1', name: 'Website', owner: 'Min' },
    { id: 'project-2', name: 'Mobile app', owner: 'Lee' },
  ]);

  return (
    <SortableRoot<Row>>
      <table>
        <thead>
          <tr>
            <th>Project</th>
            <th>Owner</th>
          </tr>
        </thead>
        <SortableArea
          as="tbody"
          areaId="rows"
          items={rows}
          itemKey="id"
          animation={160}
          onItemsChange={(next) => setRows([...next])}
        >
          {(row) => (
            <tr>
              <td>{row.name}</td>
              <td>{row.owner}</td>
            </tr>
          )}
        </SortableArea>
      </table>
    </SortableRoot>
  );
}
```

Use `direction="horizontal"` with a row host and header-cell items for table
columns. A consumer component used as a host must forward the React ref, or
expose the Vue root element, to the real registered element.

React `header` and `footer`, Vue slots, or a narrowed Vanilla/Svelte `item`
selector keep non-sortable content in the same host. Non-item siblings must not
match the item selector and must remain outside the controlled item array.

Playground:

- <http://127.0.0.1:4003/examples/table/react>
- <http://127.0.0.1:4003/examples/table-column/react>
- <http://127.0.0.1:4003/examples/third-party/react>
- <http://127.0.0.1:4003/examples/footer-slot/react>
- <http://127.0.0.1:4003/examples/header-slot/react>
- <http://127.0.0.1:4003/examples/two-list-slots/react>
