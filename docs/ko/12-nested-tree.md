# 중첩 목록과 Tree

중첩 Area는 자신의 parent item을 선언합니다. 이 정보로 parent를 자신의 하위
descendant로 이동하는 cycle을 collision 단계에서 거부합니다.

`createSortableTree`는 하나의 불변 tree 값을 위한 framework-neutral adapter입니다.
컴포넌트를 렌더하거나 상태를 소유하지 않습니다.

## 전체 예제

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
    label: '기획',
    children: [{ id: 'scope', label: '범위 정의', children: [] }],
  },
  { id: 'delivery', label: '개발', children: [] },
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

`getTreeAreas(nodes)`의 각 결과를 프레임워크 Area로 렌더합니다. 결과의 `areaId`,
`items`, 선택형 `parent`를 그대로 전달하고 `updateTreeArea`가 반환한 값으로 전체
tree 상태를 교체합니다.

프레임워크 Root의 한 change를 tree 전체 transaction으로 반영할 때 `applyChange`를
사용합니다. 알 수 없는 area, node·area ID 중복 또는 cycle은 입력을 변경하지 않고
실패합니다.

Playground:

- <http://127.0.0.1:4003/examples/nested/react>
- <http://127.0.0.1:4003/examples/nested-controlled/react>
- <http://127.0.0.1:4003/examples/functional-third-party/react>
- <http://127.0.0.1:4003/examples/tree/react>
