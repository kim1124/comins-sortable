# Animation and Auto-scroll

Set `animation` to a duration or an options object.

## Complete example

```tsx
import { useState } from 'react';
import { SortableArea, SortableRoot } from 'comins-sortable/react';

type Item = { id: string; label: string };

export function AnimatedScrollExample() {
  const [items, setItems] = useState<Item[]>(
    Array.from({ length: 20 }, (_, index) => ({
      id: `task-${index + 1}`,
      label: `Task ${index + 1}`,
    })),
  );

  return (
    <div style={{ maxHeight: 240, overflow: 'auto' }}>
      <SortableRoot<Item>>
        <SortableArea
          areaId="tasks"
          items={items}
          itemKey="id"
          animation={{ duration: 180, easing: 'ease-out' }}
          autoScroll
          onItemsChange={(next) => setItems([...next])}
        >
          {(item) => <div>{item.label}</div>}
        </SortableArea>
      </SortableRoot>
    </div>
  );
}
```

Animation uses FLIP layout deltas for controlled updates and drag commits. Set
`animation={false}` to disable it. Reduced-motion preference disables movement
even when animation is configured.

`autoScroll` scrolls the nearest eligible container first and falls back to the
window. It continues while the pointer remains near an edge and stops on drop,
cancel, blur, unmount, or destroy. The container must have real overflow and a
bounded size; the option does not create scrollable CSS.

External page or ancestor scrolling also refreshes collision geometry during
a drag, including a stationary pointer or a drop immediately after scrolling.
This correction does not require enabling Core's `autoScroll` option.

Use `direction="horizontal"` for horizontal lists. `auto` resolves direction
from measured item centers.

Playground: `transition` and `auto-scroll` under
<http://127.0.0.1:4003/examples/transition/react>.

The `transitions` route now demonstrates multi-drag; see [Advanced Sorting](./16-advanced-sorting.md).
