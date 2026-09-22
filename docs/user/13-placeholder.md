# Placeholder Styling

Every area supports consumer classes and an optional visual preset.

## Complete example

```tsx
import { useState } from 'react';
import { SortableArea, SortableRoot } from 'comins-sortable/react';
import 'comins-sortable/styles.css';

type Item = { id: string; label: string };

export function PlaceholderExample() {
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
        placeholder={{
          className: 'project-drop-placeholder',
          preset: 'skeleton',
        }}
        onItemsChange={(next) => setItems([...next])}
      >
        {(item) => <div>{item.label}</div>}
      </SortableArea>
    </SortableRoot>
  );
}
```

`className` is added beside the stable `comins-sortable__placeholder` class.
The `skeleton` preset is drag feedback, not an application loading state. It
needs the public stylesheet and disables its animation for reduced motion.

Override consumer classes or the public variables:

```css
.project-drop-placeholder {
  --comins-sortable-placeholder-background: #f3f7f5;
  --comins-sortable-placeholder-border: 2px dashed #176343;
  --comins-sortable-placeholder-border-radius: 8px;
  --comins-sortable-placeholder-opacity: 0.9;
  --comins-sortable-placeholder-skeleton-base: #e4ebe7;
  --comins-sortable-placeholder-skeleton-highlight: #f8faf9;
  --comins-sortable-placeholder-skeleton-duration: 1.2s;
}
```

Insertion feedback is hidden when there is no valid drop destination and restored
on reentry. During a move, the hidden placeholder retains its layout space so the
list height and scroll range do not suddenly shrink.

The [Playground GIF](../playground-preview.md) compares custom dotted and default
dashed insertion markers, then shows rejection hiding the marker and outlining
the target and dragged item. Use `auto-scroll` for scroll-boundary feedback.

The placeholder does not copy consumer item data. It is removed on every drop,
cancel, error, unmount, or destroy path.

The **Drop feedback styles** example at `custom-placeholder` compares default
and custom styles across two lists with a destination-acceptance toggle. Accepted
positions show the insertion marker. Rejection hides it and styles the target
and dragged element through `data-comins-sortable-rejection`,
`--comins-sortable-rejection-outline`, and
`--comins-sortable-rejection-outline-offset`. The guide displays the applied CSS.
It does not highlight every possible destination in advance.

Playground:

- <http://127.0.0.1:4003/examples/custom-placeholder/react>
- <http://127.0.0.1:4003/examples/skeleton-placeholder/react>
