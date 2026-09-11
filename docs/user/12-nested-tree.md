# Nested Lists and Tree

Nested areas declare their parent item so collision can reject a move from a
parent into its own descendant.

`createSortableTree` is the framework-neutral adapter for one immutable tree
value. It does not render components or own state.

## Complete example

```ts
import { createSortableTree } from 'comins-sortable/core';

export type Node = {
  id: string;
  label: string;
  children: readonly Node[];
};

const tree = createSortableTree<Node>({
  rootAreaId: 'root',
  getNodeId: (node) => node.id,
  getChildren: (node) => node.children,
  withChildren: (node, children) => ({ ...node, children }),
  getChildrenAreaId: (node) => `children-${node.id}`,
});

export const initialNodes: readonly Node[] = [
  {
    id: 'planning',
    label: 'Planning',
    children: [{ id: 'scope', label: 'Define scope', children: [] }],
  },
  { id: 'delivery', label: 'Delivery', children: [] },
];

export function getTreeAreas(nodes: readonly Node[]) {
  return tree.getAreas(nodes);
}

export function updateTreeArea(
  nodes: readonly Node[],
  areaId: string,
  nextItems: readonly Node[],
) {
  return tree.updateArea(nodes, areaId, nextItems);
}
```

Render every result from `getTreeAreas(nodes)` as a framework Area. Pass its
`areaId`, `items`, and optional `parent` without changing them, then replace the
tree state with the value returned by `updateTreeArea`.

`getAreas` returns area descriptors; it does not construct nested DOM. Render
child areas inside their corresponding parent item when a hierarchical view is
required. A flat rendering of those descriptors is not a recursive tree view.

`updateArea` replaces only the direct items of the selected area. Existing
nodes retain their current descendant collections, including when framework
source and destination setters apply one cross-area move sequentially.

Use `applyChange` when one framework Root change should be folded into the
whole tree transaction. Unknown areas, duplicate node or area IDs, and cycles
fail without mutating the input.

## What the Playground examples demonstrate

- **Nested lists** keep separate root and child arrays. They demonstrate DOM
  nesting, the `parent` relationship, and transfers between lists.
- **Tree data sorting** keeps one recursive `children` value and derives each
  area through `createSortableTree`. The initial three levels are Research →
  Review → Document/Observe, alongside an empty Design folder. Move Review into
  Design to carry both descendants with it. Parent relationships update after
  the move, while cycles remain rejected.

Both examples use the same Core sorting engine. Their distinction is the state
model and subtree preservation, rather than a separate drag interaction.

Playground:

- <http://127.0.0.1:4003/examples/nested/react>
- <http://127.0.0.1:4003/examples/nested-controlled/react>
- <http://127.0.0.1:4003/examples/functional-third-party/react>
- <http://127.0.0.1:4003/examples/tree/react>
