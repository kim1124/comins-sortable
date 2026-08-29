# Comins Sortable

Comins Sortable is an independent npm frontend module that provides sortable
interaction for Vanilla JavaScript, React, Vue, and Svelte over one Vanilla
TypeScript Core.

`TypeScript` · `Vanilla JS` · `React` · `Vue` · `Svelte` · `Vite` ·
`Playwright` · `Zero runtime dependencies`

![Comins Sortable Playground moving a controlled item between React lists](https://raw.githubusercontent.com/kim1124/comins-sortable/main/docs/assets/sortable-playground.gif)

The animation is captured from the real Comins Sortable Playground.

## Status

The current public release is `comins-sortable@0.1.1`. Its
Vanilla TypeScript Core and Vanilla, React, Vue, and Svelte adapters implement
reorder, transfer, and copy interactions with commit verification and rollback.
The Playground currently provides 23 routes. Seventeen implement the planned
Vue.Draggable parity contracts, including animation, custom hosts, non-item
siblings, and nested sortable areas. Empty Destination, Accept/Reject, and Auto
Scroll are additional Comins examples. Tree, Custom Placeholder, and Skeleton
Placeholder demonstrate the official headless Tree model and customizable drag
feedback. Runtime dependencies are not allowed.
React, React DOM, Vue, and Svelte are optional peers.

Version `0.1.0` was withdrawn on 2026-08-28 after a public identity metadata
incident and cannot be reused. Version `0.1.1` is available from npm. Future
versions, tags, and GitHub Releases remain separately maintainer-gated.

## Installation

```sh
npm install comins-sortable
```

## Run the Playground locally

The published npm package does not include the Playground source. Clone this
repository to run all 23 examples with Vanilla JavaScript, React, Vue, and
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
        onItemsChange={(nextItems) => setItems([...nextItems])}
      >
        {(item) => <div>{item.label}</div>}
      </SortableArea>
    </SortableRoot>
  );
}
```

## User Guides

- [Documentation index](https://github.com/kim1124/comins-sortable/blob/main/docs/README.md)
- [English Quick Start](https://github.com/kim1124/comins-sortable/blob/main/docs/user/01-quick-start.md)
- [Korean Quick Start](https://github.com/kim1124/comins-sortable/blob/main/docs/ko/01-quick-start.md)
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

- Shared operating policy: [Comins Contract v1.7](https://github.com/kim1124/comins-governance/blob/main/COMINS_CONTRACT.md)
- Open-source policy: [Comins OSS License Policy](https://github.com/kim1124/comins-governance/blob/main/OSS_LICENSE_POLICY.md)
- License: [MIT](./LICENSE)
- Security reports: [SECURITY.md](./SECURITY.md)

## Verification

Install the reviewed lockfile without lifecycle scripts and run the package
gate:

```sh
npm ci --ignore-scripts
npm run verify
```

`npm run verify` checks the package-aware license scope, security policy tests,
TypeScript, unit tests, the ES2020 ESM build, and public type fixtures.

`LICENSE_SCOPE.json` records the reviewed runtime, peer, copied/generated, and
asset surfaces. The license checker verifies the manifest and lockfile root,
requires every lock entry to have a routine SPDX classification, and fails
closed for missing or unreviewed material. A manual-review result exposes only
the package name, SPDX expression, and use surface.

## Browser evidence

The automated browser gate covers Chromium, Firefox, and Playwright WebKit.
Playwright WebKit is engine-compatibility evidence, not Safari certification.
Actual Safari remains uncertified until it is verified in Safari. Physical
touch or pen certification is intentionally deferred and is not implied by the
automated Pointer Events coverage.
