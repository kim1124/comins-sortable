# 복제

source group의 `pull` 정책에서 `copy`를 반환하고 새로운 안정 ID를 생성하는
factory를 제공합니다. source 배열은 변경되지 않습니다.

드래그 중에도 원본 source 항목은 목록의 기존 위치에 그대로 표시됩니다. 포인터를
따르는 별도 drag preview와 destination의 Placeholder만 복제 예정 위치를 표시하며,
drop 또는 cancel 이후 임시 피드백은 모두 제거됩니다.

## 전체 예제

```tsx
import { useState } from 'react';
import { SortableArea, SortableRoot } from 'comins-sortable/react';

type Item = { id: string; label: string };
const sourceGroup = { name: 'tasks', pull: 'copy' as const };

export function CopyExample() {
  const [catalog, setCatalog] = useState<Item[]>([
    { id: 'template-1', label: 'Template' },
  ]);
  const [board, setBoard] = useState<Item[]>([]);

  return (
    <SortableRoot<Item>>
      <SortableArea
        areaId="catalog"
        group={sourceGroup}
        items={catalog}
        itemKey="id"
        copyItem={(item) => ({
          ...item,
          id: crypto.randomUUID(),
          label: `${item.label} copy`,
        })}
        onItemsChange={(next) => setCatalog([...next])}
      >
        {(item) => <div>{item.label}</div>}
      </SortableArea>

      <SortableArea
        areaId="board"
        group="tasks"
        items={board}
        itemKey="id"
        onItemsChange={(next) => setBoard([...next])}
      >
        {(item) => <div>{item.label}</div>}
      </SortableArea>
    </SortableRoot>
  );
}
```

React, Vue, Svelte는 `copyItem(item, context)`를 사용합니다. Vanilla는
`copyElement(source, context)`에서 DOM에 연결되지 않은 element를 반환해야 하며
새 ID가 `getItemId` 결과와 일치해야 합니다. 연결된 element, 누락 또는 중복 ID는
두 area를 변경하지 않고 실패합니다.

Vanilla는 `:scope > .item` 같은 상대 선택자를 등록된 area 안에서 평가합니다.
삽입한 복제 요소는 목적지의 item 선택자에 맞고, 목적지의 `getItemId`가 준비된
ID를 반환해야 합니다. 일치하지 않으면 소비자의 `onChange`를 호출하기 전에
삽입을 되돌립니다.

`pull`은 callback도 받을 수 있습니다. 보조키 복제 예제는 drag activation 시점의
pointer snapshot에서 Alt/Option을 확인해 `copy`, 일반 drag는 `move`를 반환합니다.

Playground: <http://127.0.0.1:4003/examples/clone/react> 아래의 `clone`,
`custom-clone`, `modifier-copy` 경로를 확인합니다.
