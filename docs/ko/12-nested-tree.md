# 중첩 목록과 Tree

중첩 Area는 자신의 parent item을 선언합니다. 이 정보로 parent를 자신의 하위
descendant로 이동하는 cycle을 collision 단계에서 거부합니다.

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

`createSortableTree`는 하나의 불변 tree 값을 위한 framework-neutral adapter입니다.
컴포넌트를 렌더하거나 상태를 소유하지 않습니다.

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

프레임워크 Root의 한 change를 tree 전체 transaction으로 반영할 때 `applyChange`를
사용합니다. 알 수 없는 area, node·area ID 중복 또는 cycle은 입력을 변경하지 않고
실패합니다.

Playground:

- <http://127.0.0.1:4003/examples/nested/react>
- <http://127.0.0.1:4003/examples/nested-controlled/react>
- <http://127.0.0.1:4003/examples/functional-third-party/react>
- <http://127.0.0.1:4003/examples/tree/react>
