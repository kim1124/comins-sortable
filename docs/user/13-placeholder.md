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

## Feedback coordinates (0.1.6 candidate)

The candidate keeps move feedback aligned with viewport pointer coordinates in
verified two-dimensional transform, filter and containment contexts. Original
items stay in their consumer-owned parent; completion/cancellation restores
source styles and clears feedback.

Ancestor scrolling and placeholder relocation can change the fixed-position
coordinate basis. The candidate re-anchors after scrolling and within the same
frame after placeholder placement resizes a scaled/rotated list. This fixes the
previous transient shift; it is CSS geometry support, separate from mobile
screen-orientation changes. No new option or mobile-only sorting mode is added.

Detached copy/table previews retain measured viewport dimensions without clone
min/max clamps. Ancestor overflow/paint clipping still follows consumer CSS.
Nonlinear 3D perspective and transforms changed during a gesture are outside
the recorded support evidence. See [current candidate validation](../verification/0.1.6-local-validation.md)
for tested cases, desktop Computer Use and remaining release steps.

## Custom content renderers

Use optional `placeholder.render` for insertion content and `dragOverlay.render`
for a separate pointer-following preview. All four adapters accept the same
synchronous DOM renderer. Omitting these options preserves existing feedback.

```ts
import type { SortableFeedbackRenderer } from 'comins-sortable/core';

const render: SortableFeedbackRenderer = ({ container, itemId }) => {
  container.textContent = `Moving: ${itemId}`;
  return {
    update(next) {
      container.textContent = `${next.itemId}: ${next.rejection ?? next.destination?.areaId ?? 'outside'}`;
    },
    destroy() { container.replaceChildren(); },
  };
};
const feedbackOptions = { placeholder: { render }, dragOverlay: { render } };
```

The context provides the Core-owned `container`, `itemId`, `itemIds`, `source`,
`mode`, `destination`, and `rejection`. Location objects and IDs are read-only.
A returned handle must provide `destroy`; returning no handle is also supported.
`update` runs only when destination or rejection changes, never for pointer
movement alone. Renderer option changes apply to the next activation.

Core owns placement, dimensions, visibility, and host removal. Render only inside
the supplied container. Release listeners and framework mounts in `destroy`.
If creation throws before returning a handle, clean up externally created
resources yourself. There is no string-HTML or asynchronous rendering protocol.

An overlay mounts under the source document's body. Move sources remain under
their original parent and are hidden; copy sources remain visible. Hosts use
`inert`, `aria-hidden`, and `pointer-events: none`. Existing table previews are
unchanged; custom rendering on `TR`, `TH`, or `TD` is rejected with
`INVALID_OPTION`. Arbitrary portal roots, automatic sizing, drop animations, and
framework-specific render components are outside this extension.

Enable **Render custom content** in the drop-feedback-style Playground example.
Keep the existing class/preset API for CSS-only appearance changes.
