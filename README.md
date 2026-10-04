# Comins Sortable

<a href="https://comins-website.vercel.app/ko/"><img src="https://raw.githubusercontent.com/kim1124/comins-sortable/main/example/public/comins-symbol.svg" width="64" height="64" alt="Comins brand website" /></a>

[Comins Brand](https://comins-website.vercel.app/ko/)

Drag-and-drop sorting for Vanilla JavaScript, React, Vue, and Svelte, built on
one TypeScript core with zero runtime dependencies. Build sortable lists,
grids, kanban boards, and nested trees with controlled application state.

[npm package](https://www.npmjs.com/package/comins-sortable)
· [English docs](https://github.com/kim1124/comins-sortable/blob/main/docs/README.md)
· [한국어 가이드](https://github.com/kim1124/comins-sortable/blob/main/docs/ko/01-quick-start.md)

![Comins Sortable Playground demonstrating empty-slot return, drag start areas, drop feedback styles, per-list state updates, and subtree movement](https://raw.githubusercontent.com/kim1124/comins-sortable/main/docs/assets/sortable-playground.gif?v=0.1.3-20260922)

The animation shows real React Playground interactions: emptying and refilling
a list between fixed slots, changing drag start areas, comparing accepted and
rejected drop styles, updating a child list, and moving a complete subtree.
By default, drag a card's left handle to move it and select its body text to copy it.
The Drag start areas example also demonstrates title-only and whole-card dragging.

## Features

| Capability | What to try in the Playground |
| --- | --- |
| Sortable lists and kanban boards | Reorder items, transfer them between lists, or copy them to another list. |
| Drag start areas and text selection | Compare handle, title-only, and whole-card dragging; use handle mode to select and copy body text. |
| Multi-drag | Command/Ctrl-click handles, or use Shift for a range, then move the selected items together. |
| Sorting thresholds | Change the shaded target region to see when a drag changes order; this differs from the distance needed to start dragging. |
| Grid and Swap Grid | Grid inserts and shifts items. Swap Grid exchanges only the dragged and highlighted cells. |
| Nested lists and Tree | **Per-list state control** updates separate arrays in React, Vue, and Svelte; Vanilla demonstrates direct DOM updates. **Subtree movement** preserves descendants when a node changes parent. Both include structure diagrams and step-by-step instructions. |
| Drag feedback | Compare accepted/rejected drop styles and their CSS; customize animation, placeholders, skeleton feedback, and auto-scroll. |

Vanilla uses no framework peer. React, React DOM, Vue, and Svelte integrations
use optional peers (`react`, `react-dom`, `vue`, and `svelte`).

## Installation

```sh
npm install comins-sortable
```

Install the peers used by your chosen adapter: React `>=18.2 <20` with React DOM
`>=18.2 <20`, Vue `>=3.5 <4`, or Svelte `>=5 <6`. Vanilla needs no framework peer.
Use the repository Playground below to try the examples.

## Quick Start with React

Comins Sortable is controlled: the application owns the item array and commits
each proposed order through `onItemsChange`.

```tsx
import { useState } from 'react';
import { SortableArea, SortableRoot } from 'comins-sortable/react';
import 'comins-sortable/styles.css';

type Item = { id: string; label: string };

export function TaskList() {
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
        handle=".task-handle"
        onItemsChange={(nextItems) => setItems([...nextItems])}
      >
        {(item) => (
          <div>
            <button
              type="button"
              className="task-handle"
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
  );
}
```

The handle confines pointer activation to the button, so the label remains
available for text selection. A labelled button does not add keyboard sorting;
this module's sorting interaction is pointer-based. See the
[handle and text-selection guide](https://github.com/kim1124/comins-sortable/blob/main/docs/user/09-handle-acceptance.md)
for styling and multi-selection behavior.

## Choose an adapter

| Adapter | State updates | Guide |
| --- | --- | --- |
| Vanilla JavaScript | Direct DOM sorting with `createSortable` | [Vanilla guide](https://github.com/kim1124/comins-sortable/blob/main/docs/user/03-vanilla.md) |
| React | Controlled `items` and `onItemsChange` | [React guide](https://github.com/kim1124/comins-sortable/blob/main/docs/user/04-react.md) |
| Vue | `v-model` and a typed item slot | [Vue guide](https://github.com/kim1124/comins-sortable/blob/main/docs/user/05-vue.md) |
| Svelte | Controlled items and update callbacks | [Svelte guide](https://github.com/kim1124/comins-sortable/blob/main/docs/user/06-svelte.md) |

Use stable string or number IDs. Framework adapters propose updates; the
application commits them to its state. Cross-list moves need a shared root.

## Guides and API

- [English quick start](https://github.com/kim1124/comins-sortable/blob/main/docs/user/01-quick-start.md)
- [Documentation index](https://github.com/kim1124/comins-sortable/blob/main/docs/README.md) · [한국어 시작하기](https://github.com/kim1124/comins-sortable/blob/main/docs/ko/01-quick-start.md)
- [Reorder and transfer](https://github.com/kim1124/comins-sortable/blob/main/docs/user/07-reorder-transfer.md) · [Copy and clone](https://github.com/kim1124/comins-sortable/blob/main/docs/user/08-copy-clone.md)
- [Handles and text selection](https://github.com/kim1124/comins-sortable/blob/main/docs/user/09-handle-acceptance.md) · [Animation and auto-scroll](https://github.com/kim1124/comins-sortable/blob/main/docs/user/10-animation-auto-scroll.md)
- [Nested lists and tree API](https://github.com/kim1124/comins-sortable/blob/main/docs/user/12-nested-tree.md) · [Placeholder CSS and rejected targets](https://github.com/kim1124/comins-sortable/blob/main/docs/user/13-placeholder.md)
- [Public API reference](https://github.com/kim1124/comins-sortable/blob/main/docs/user/15-public-api.md) · [한글 API](https://github.com/kim1124/comins-sortable/blob/main/docs/ko/15-public-api.md)

`createSortableTree` maps your tree schema to sortable areas and applies area
updates to an immutable tree value. It preserves descendants when a node moves;
it does not render a tree component. Placeholder classes and CSS variables
customize insertion and rejection feedback without changing sorting behavior.

## Run the Playground locally

The Playground currently provides 25 routes per adapter, covering Vanilla
JavaScript, React, Vue, and Svelte. Clone the repository to run the examples:

```sh
git clone https://github.com/kim1124/comins-sortable.git
cd comins-sortable
npm ci --ignore-scripts
npm run build
npm run dev
```

Open [the React simple-sorting example](http://127.0.0.1:4003/examples/simple/react).
The development server uses port 4003.

Use **Reset** to restore the example and clear multi-selection, including its
Shift-range anchor, in all four adapters.

## Browser support and limits

Automated tests cover Chromium, Firefox, and WebKit. Sorting uses pointer input;
keyboard reordering is not implemented. Browser touch emulation is distinct
from physical-device testing. See the [changelog](https://github.com/kim1124/comins-sortable/blob/main/CHANGELOG.md)
for published changes and the [performance verification guide](https://github.com/kim1124/comins-sortable/blob/main/docs/verification/next-quality-performance.md)
for reproducible large-list and resource measurements.

A previously recorded native Safari title-only drag can leave body text selected.
Use a dedicated handle when selecting and copying body text matters; see the
[handle guide](https://github.com/kim1124/comins-sortable/blob/main/docs/user/09-handle-acceptance.md).
Automated WebKit results do not establish native Safari or Galaxy coverage.

## License and support

[MIT](./LICENSE) ·
[Changelog](https://github.com/kim1124/comins-sortable/blob/main/CHANGELOG.md) ·
[Issues](https://github.com/kim1124/comins-sortable/issues) ·
[Report a security issue](https://github.com/kim1124/comins-sortable/blob/main/SECURITY.md)
