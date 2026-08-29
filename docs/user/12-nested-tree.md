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

Use `applyChange` when one framework Root change should be folded into the
whole tree transaction. Unknown areas, duplicate node or area IDs, and cycles
fail without mutating the input.

Playground:

- <http://127.0.0.1:4003/examples/nested/react>
- <http://127.0.0.1:4003/examples/nested-controlled/react>
- <http://127.0.0.1:4003/examples/functional-third-party/react>
- <http://127.0.0.1:4003/examples/tree/react>
