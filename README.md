# Comins Sortable

Comins Sortable is an independent npm frontend module that provides sortable
interaction for Vanilla JavaScript, React, Vue, and Svelte over one Vanilla
TypeScript Core.

`TypeScript` · `Vanilla JS` · `React` · `Vue` · `Svelte` · `Vite` ·
`Playwright` · `Zero runtime dependencies`

![Comins Sortable Playground demonstrating handle-based transfer, multi-drag, swap grid, and tree movement](https://raw.githubusercontent.com/kim1124/comins-sortable/main/docs/assets/sortable-playground.gif)

The animation shows real React Playground interactions: transfer between lists,
multi-selection, a grid swap, and a tree move that carries its descendants.
Drag a card's left handle to move it; select its body text to copy it.

## Status

The current public release is `comins-sortable@0.1.2`. These docs describe the
published package and its repository Playground. Its
Vanilla TypeScript Core and Vanilla, React, Vue, and Svelte adapters implement
reorder, transfer, and copy interactions with commit verification and rollback.
The Playground currently provides 25 routes per adapter (100 example/adapter
combinations). 18 implement the planned
Sortable/Vue.Draggable parity contracts, including multi-drag, thresholds,
two-dimensional grid collision, swap, animation, custom hosts, non-item
siblings, and nested sortable areas. Empty Destination, Accept/Reject, Auto
Scroll, and Swap Grid are additional Comins examples. Tree, Custom Placeholder, and Skeleton
Placeholder demonstrate the official headless Tree model and customizable drag
feedback. Runtime dependencies are not allowed.
React, React DOM, Vue, and Svelte are optional peers.
Their package IDs are `react`, `react-dom`, `vue`, and `svelte`.

Version `0.1.0` was withdrawn on 2026-08-28 after a public identity metadata
incident and cannot be reused. Version `0.1.2` was published on 2026-09-11
through GitHub Actions staged publishing and maintainer approval. Future versions, tags, and
GitHub Releases remain separately maintainer-gated.

## What changes in 0.1.2

| Capability | What to try in the Playground |
| --- | --- |
| Select text and move cards | Drag the handle, then select and copy a value from the card body. |
| Multi-drag | Command/Ctrl-click handles, or use Shift for a range, then move the selected items together. |
| Sorting thresholds | Change the shaded target region to see when a drag changes order; this differs from the distance needed to start dragging. |
| Grid and Swap Grid | Grid inserts and shifts items. Swap Grid exchanges only the dragged and highlighted cells. |
| Nested lists and Tree | Nested lists own separate arrays. Tree owns one recursive value and preserves a moved node's descendants. |

This release also fixes native text-drag conflicts, quick-release destination
updates, external-scroll collision refresh, and destination validation for
Vanilla copies. See the [changelog](https://github.com/kim1124/comins-sortable/blob/main/CHANGELOG.md)
and [0.1.2 verification record](https://github.com/kim1124/comins-sortable/blob/main/docs/verification/0.1.2-release-candidate.md).
Table-row and table-column Playground demos have been removed; they are not
supported examples for this release.

## Installation

```sh
npm install comins-sortable
```

Install the peers used by your chosen adapter: React `>=18.2 <20` with React DOM
`>=18.2 <20`, Vue `>=3.5 <4`, or Svelte `>=5 <6`. Vanilla needs no framework peer.
Use the repository Playground below to try the 0.1.2 features.

## Run the Playground locally

The published npm package does not include the Playground source. Clone this
repository to run all 25 examples with Vanilla JavaScript, React, Vue, and
Svelte adapters:

```sh
git clone https://github.com/kim1124/comins-sortable.git
cd comins-sortable
npm ci --ignore-scripts
npm run dev
```

Open [the React simple-sorting example](http://127.0.0.1:4003/examples/simple/react).
The development server uses the fixed `127.0.0.1:4003` address and fails
instead of selecting another port when that port is occupied.

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

## Governance

- Shared operating policy: [Comins Contract v1.8](https://github.com/kim1124/comins-governance/blob/main/COMINS_CONTRACT.md)
- Open-source policy: [Comins OSS License Policy](https://github.com/kim1124/comins-governance/blob/main/OSS_LICENSE_POLICY.md)
- License: [MIT](./LICENSE)
- Security reports: [SECURITY.md](https://github.com/kim1124/comins-sortable/blob/main/SECURITY.md)

## Verification

Install the reviewed lockfile without lifecycle scripts and run the package
gate:

```sh
npm ci --ignore-scripts
npm run verify
npx --no-install playwright install chromium firefox webkit
npm run verify:e2e
npm run verify:playground
npm run verify:performance
```

`npm run verify` checks the package-aware license scope, security policy tests,
TypeScript, unit tests, the ES2020 ESM build, and public type fixtures.
`verify:e2e` checks package consumer fixtures in Chromium, Firefox, and WebKit;
`verify:playground` builds and tests the production Playground preview.
`npm run verify:performance` builds the Playground, exercises all 25 React
feature routes twice in Chromium, forces garbage collection between resource
samples, and checks that JS Heap, DOM Nodes, and Event Listeners stabilize after
the first warm-up pass. See the
[current verification record](https://github.com/kim1124/comins-sortable/blob/main/docs/verification/0.1.2-release-candidate.md)
for the merged runtime's results. The
[performance investigation](https://github.com/kim1124/comins-sortable/blob/main/docs/verification/0.1.2-performance.md)
preserves the earlier manual Chrome DevTools procedure and measurement history.

`LICENSE_SCOPE.json` records the reviewed runtime, peer, copied/generated, and
asset surfaces. The license checker verifies the manifest and lockfile root,
requires every lock entry to have a routine SPDX classification, and fails
closed for missing or unreviewed material. A manual-review result exposes only
the package name, SPDX expression, and use surface.

## Browser evidence

The automated browser gate covers Chromium, Firefox, and Playwright WebKit.
The merged 0.1.2 runtime passed 238 package E2E and 279 Playground tests.
Playwright WebKit is engine-compatibility evidence, not Safari certification.

On 2026-09-11, actual macOS Safari 26.6.2 was checked with mouse and keyboard
across Vanilla, React, Vue, and Svelte: move a card, select part of its text,
copy/paste it, and move the card again. This is evidence for those flows, not
blanket Safari certification. Held-modifier clicks in Safari and physical touch
or pen input were not included. See the
[verification scope](https://github.com/kim1124/comins-sortable/blob/main/docs/verification/0.1.2-release-candidate.md).
