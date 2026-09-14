# Advanced Sorting

These features are available in `comins-sortable@0.1.2` and later.
Try them in the repository Playground.

Multi-drag, thresholds, grid collision, and swap are Area options shared by
Vanilla, React, Vue, and Svelte.

## Complete example

```tsx
import { useState } from 'react';
import { SortableArea, SortableRoot } from 'comins-sortable/react';
import 'comins-sortable/styles.css';

type Item = { id: string; label: string };
type Mode = 'multi' | 'thresholds' | 'swap' | 'grid' | 'swap-grid';

export function AdvancedSortingExample() {
  const [mode, setMode] = useState<Mode>('multi');
  const [items, setItems] = useState<Item[]>(
    Array.from({ length: 12 }, (_, index) => ({
      id: `item-${index + 1}`,
      label: `Item ${index + 1}`,
    })),
  );

  return (
    <>
      <select value={mode} onChange={(event) => setMode(event.target.value as Mode)}>
        <option value="multi">Multi-drag</option>
        <option value="thresholds">Thresholds</option>
        <option value="swap">Swap</option>
        <option value="grid">Grid</option>
        <option value="swap-grid">Swap grid</option>
      </select>
      <SortableRoot<Item>>
        <SortableArea
          areaId="items"
          items={items}
          itemKey="id"
          handle=".drag-handle"
          direction={mode === 'grid' || mode === 'swap-grid' ? 'grid' : 'vertical'}
          areaProps={{ style: {
            display: 'grid',
            gridTemplateColumns: mode === 'grid' || mode === 'swap-grid' ? 'repeat(3, 1fr)' : '1fr',
            gap: 8,
          } }}
          multiDrag={mode === 'multi'}
          selectedClass="is-selected"
          swapThreshold={mode === 'thresholds' ? 0.5 : undefined}
          invertSwap={mode === 'thresholds'}
          swap={mode === 'swap' || mode === 'swap-grid'}
          onItemsChange={(next) => setItems([...next])}
        >
          {(item) => (
            <div>
              <button
                type="button"
                className="drag-handle"
                aria-label={`Drag ${item.label}`}
                style={{ touchAction: 'none', userSelect: 'none', WebkitUserSelect: 'none' }}
              >
                ⠿
              </button>
              <span>{item.label}</span>
            </div>
          )}
        </SortableArea>
      </SortableRoot>
    </>
  );
}
```

## Multi-selection and text copying

With `multiDrag`, use Command (⌘) on macOS or Ctrl on Windows/Linux to toggle
individual items. Shift selects a contiguous range from the latest anchor.
Dragging any selected item moves the selection in original visual order; the
change includes `itemIds`. Secondary clicks do not change selection. Ctrl
context menus are suppressed only on enabled multi-select items; ordinary
right-click menus, ignored controls, and host slots keep their default behavior.

When `handle` is configured, the same input boundary applies to item selection
and Ctrl context-menu suppression. In the Playground, modifier-click handles
to select items and use the body for text selection and copying. Selecting body
text preserves the existing multi-selection.

From 0.1.3, updating `selectedClass` replaces the previous selection class.
Unregistering an area or destroying its scope clears
the library's selection markers and range anchor; re-registering starts with
an empty selection. This cleanup preserves unrelated CSS classes and browser
text selection.

## Sorting thresholds

`swapThreshold` (0–1) controls where the pointer must enter a target card before
its order changes. It is separate from `activationDistance`, which controls
how far the pointer moves before a drag starts. In the Playground, drag Design
upward onto Research: the shaded top region shows where Research-before
insertion activates. Without inversion, 0.2 shades the top 60% and 0.8 shades
90%. With `invertSwap`, those regions become 40% and 10%. Moving downward uses
the opposite edge. The guide and shaded region update with the controls.

## Insertion and swap

`direction="grid"` uses both axes and keeps the current destination stable
while the pointer remains over its placeholder. Ordinary grid sorting inserts
the item and shifts intervening cells. `swap` exchanges just the dragged and
highlighted target items within the same area, keeps every other position,
and emits `swapItemId`. Swap Grid combines `direction="grid"` with `swap`.

Playground: `transitions`, `thresholds`, `swap`, `grid`, and `swap-grid` under
<http://127.0.0.1:4003/examples/transitions/react>.

For `[A, B, C, D]`, inserting A after C produces `[B, C, A, D]`. Swapping A
with C produces `[C, B, A, D]`.
