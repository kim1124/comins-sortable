# 중첩 목록과 Tree

`getAreas`는 Area 설명자를 반환하며 중첩 DOM을 만들지 않습니다. 계층형 화면이
필요하면 각 자식 Area를 해당 부모 항목 안에 렌더합니다. 설명자를 평면으로
나열하는 화면과 재귀적인 Tree 화면은 구분합니다.

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

`updateArea`는 선택한 area의 직계 item만 교체합니다. 프레임워크의 source와
destination setter가 하나의 영역 간 이동을 순서대로 반영하더라도 기존 node는 현재
하위 collection을 유지합니다.

프레임워크 Root의 한 change를 tree 전체 transaction으로 반영할 때 `applyChange`를
사용합니다. 알 수 없는 area, node·area ID 중복 또는 cycle은 입력을 변경하지 않고
실패합니다.

## Playground 예제의 차이

- **중첩 목록**은 루트와 자식 배열을 별도로 관리합니다. DOM 중첩, `parent` 관계,
  목록 간 항목 이동을 설명합니다.
- **트리 데이터 정렬**은 재귀적인 `children` 값 하나를 관리하고
  `createSortableTree`로 각 Area를 구합니다. 초기 구조는 Research → Review →
  Document/Observe의 3단계이며, Design에는 빈 자식 영역이 있습니다. Review를
  Design 안으로 옮기면 두 하위 항목도 함께 이동합니다. 이동 후 부모 관계도
  갱신되며 순환 이동은 거부됩니다.

두 예제는 같은 Core 정렬 엔진을 사용합니다. 별도의 드래그 방식이 아니라 상태
모델과 하위 트리 보존을 설명하는 차이입니다.

Playground:

- <http://127.0.0.1:4003/examples/nested/react>
- <http://127.0.0.1:4003/examples/nested-controlled/react>
- <http://127.0.0.1:4003/examples/functional-third-party/react>
- <http://127.0.0.1:4003/examples/tree/react>
