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

The scrollable container and a valid drop destination can have different bounds.
For example, a container's bottom padding may scroll the list while remaining
outside its registered drop area. Insertion feedback hides there; releasing
without a valid destination cancels the move. Reentering a valid area restores
the feedback. The hidden move placeholder keeps its layout space so hiding it
does not shrink the scroll range. See [Placeholder Styling](./13-placeholder.md).

Try this edge case in the `auto-scroll` Playground: drag to the bottom padding,
then reenter the list before dropping. The current GIF focuses on other examples.

From 0.1.3, auto-scroll scales movement by elapsed time, using the
existing 60Hz speed as its baseline and limiting catch-up after delayed frames.
It also supports horizontal scrolling in containers and pages with CSS
`direction: rtl`, including their negative `scrollLeft` / `scrollX` values.

External page or ancestor scrolling also refreshes collision geometry during
a drag, including a stationary pointer or a drop immediately after scrolling.
This correction does not require enabling Core's `autoScroll` option.

Use `direction="horizontal"` for horizontal lists. `auto` resolves direction
from measured item centers.

Playground: `transition` and `auto-scroll` under
<http://127.0.0.1:4003/examples/transition/react>.

The `transitions` route now demonstrates multi-drag; see [Advanced Sorting](./16-advanced-sorting.md).
