# Nested Lists and Tree

Nested areas declare their parent item so collision can reject a move from a
parent into its own descendant.

```tsx
<SortableArea
  areaId={`children-${parent.id}`}
  parent={{ areaId: 'root', itemId: parent.id }}
  group="tree"
  items={parent.children}
  itemKey="id"
  onItemsChange={(next) => updateChildren(parent.id, next)}
>
  {(item) => <div>{item.label}</div>}
</SortableArea>
```

`createSortableTree` is the framework-neutral adapter for one immutable tree
value. It does not render components or own state.

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

Use `applyChange` when one framework Root change should be folded into the
whole tree transaction. Unknown areas, duplicate node or area IDs, and cycles
fail without mutating the input.

Playground:

- <http://127.0.0.1:4003/examples/nested/react>
- <http://127.0.0.1:4003/examples/nested-controlled/react>
- <http://127.0.0.1:4003/examples/functional-third-party/react>
- <http://127.0.0.1:4003/examples/tree/react>
