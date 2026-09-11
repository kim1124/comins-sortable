# Comins Sortable

Drag-and-drop sorting for Vanilla JavaScript, React, Vue, and Svelte, built on
one TypeScript core with zero runtime dependencies. Build sortable lists,
grids, kanban boards, and nested trees with controlled application state.

**Current release: `comins-sortable@0.1.2`** · [npm package](https://www.npmjs.com/package/comins-sortable)
· [English docs](https://github.com/kim1124/comins-sortable/blob/main/docs/README.md)
· [한국어 가이드](https://github.com/kim1124/comins-sortable/blob/main/docs/ko/01-quick-start.md)

![Comins Sortable Playground demonstrating handle-based transfer, multi-drag, swap grid, and tree movement](https://raw.githubusercontent.com/kim1124/comins-sortable/main/docs/assets/sortable-playground.gif)

The animation shows real React Playground interactions: transfer between lists,
multi-selection, a grid swap, and a tree move that carries its descendants.
Drag a card's left handle to move it; select its body text to copy it.

## Features

| Capability | What to try in the Playground |
| --- | --- |
| Sortable lists and kanban boards | Reorder items, transfer them between lists, or copy them to another list. |
| Drag handles and text selection | Drag the handle, then select and copy a value from the card body. |
| Multi-drag | Command/Ctrl-click handles, or use Shift for a range, then move the selected items together. |
| Sorting thresholds | Change the shaded target region to see when a drag changes order; this differs from the distance needed to start dragging. |
| Grid and Swap Grid | Grid inserts and shifts items. Swap Grid exchanges only the dragged and highlighted cells. |
| Nested lists and Tree | Nested lists own separate arrays. Tree owns one recursive value and preserves a moved node's descendants. |
| Drag feedback | Customize animation, placeholders, skeleton feedback, and auto-scroll. |

Vanilla uses no framework peer. React, React DOM, Vue, and Svelte integrations
use optional peers (`react`, `react-dom`, `vue`, and `svelte`).

## Installation

```sh
npm install comins-sortable
```

Install the peers used by your chosen adapter: React `>=18.2 <20` with React DOM
`>=18.2 <20`, Vue `>=3.5 <4`, or Svelte `>=5 <6`. Vanilla needs no framework peer.
Use the repository Playground below to try the 0.1.2 features.

## Run the Playground locally

The Playground currently provides 25 routes per adapter, covering Vanilla
JavaScript, React, Vue, and Svelte. Clone the repository to run the examples:

```sh
git clone https://github.com/kim1124/comins-sortable.git
cd comins-sortable
npm ci --ignore-scripts
npm run dev
```

Open [the React simple-sorting example](http://127.0.0.1:4003/examples/simple/react).
The development server uses port 4003.

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

## User Guides

- [Documentation index](https://github.com/kim1124/comins-sortable/blob/main/docs/README.md)
- [English Quick Start](https://github.com/kim1124/comins-sortable/blob/main/docs/user/01-quick-start.md)
- [Korean Quick Start](https://github.com/kim1124/comins-sortable/blob/main/docs/ko/01-quick-start.md)
- [English Public API Reference](https://github.com/kim1124/comins-sortable/blob/main/docs/user/15-public-api.md)
- [한글 Public API 레퍼런스](https://github.com/kim1124/comins-sortable/blob/main/docs/ko/15-public-api.md)
- [All English feature guides](https://github.com/kim1124/comins-sortable/tree/main/docs/user)
- [모든 한글 기능 가이드](https://github.com/kim1124/comins-sortable/tree/main/docs/ko)

## Tree API

`createSortableTree` is a framework-neutral, schema-adapted public API. It maps
one immutable tree value to sortable areas and folds controlled area updates
back into that value without owning a component hierarchy.

```ts
import { createSortableTree } from 'comins-sortable/core';

const tree = createSortableTree<Node>({
  rootAreaId: 'root',
  getNodeId: (node) => node.id,
  getChildren: (node) => node.children,
  withChildren: (node, children) => ({ ...node, children }),
  getChildrenAreaId: (node) => `children-${node.id}`,
});

const areas = tree.getAreas(nodes);
const nextNodes = tree.updateArea(nodes, areaId, nextItems);
```

React, Vue, and Svelte controlled Areas use `updateArea` from their item update
callback. `applyChange` accepts the typed `FrameworkSortableChange` emitted by
framework Roots when a consumer needs to fold a whole transaction at once.

## Placeholder styling

Every Area accepts `placeholder`. `className` adds consumer classes beside the
stable `comins-sortable__placeholder` class. The optional `skeleton` preset is
drag feedback only; it is not a general loading-skeleton API.

```ts
const areaOptions = {
  placeholder: {
    className: 'project-drop-placeholder',
    preset: 'skeleton' as const,
  },
};
```

Consumers can style either their class or these public CSS variables:

- `--comins-sortable-placeholder-background`
- `--comins-sortable-placeholder-border`
- `--comins-sortable-placeholder-border-radius`
- `--comins-sortable-placeholder-opacity`
- `--comins-sortable-placeholder-skeleton-base`
- `--comins-sortable-placeholder-skeleton-highlight`
- `--comins-sortable-placeholder-skeleton-duration`

Import `comins-sortable/styles.css` to enable the preset. Reduced-motion mode
disables the skeleton animation.

## Browser support

Automated tests cover Chromium, Firefox, and WebKit. Sorting uses pointer
input; keyboard reordering is not implemented. See the
[browser verification scope](https://github.com/kim1124/comins-sortable/blob/main/docs/verification/0.1.2-release-candidate.md)
for the tested Safari flows and device coverage.

## License and support

[MIT](./LICENSE) ·
[Changelog](https://github.com/kim1124/comins-sortable/blob/main/CHANGELOG.md) ·
[Issues](https://github.com/kim1124/comins-sortable/issues) ·
[Report a security issue](https://github.com/kim1124/comins-sortable/blob/main/SECURITY.md)
