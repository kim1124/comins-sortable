# 정렬과 이동

하나의 Area는 자신의 제어 배열을 재정렬합니다. 같은 scope와 `group`을 사용하는
Area 사이에서는 item을 이동할 수 있습니다.

## 전체 예제

```tsx
import { useState } from 'react';
import { SortableArea, SortableRoot } from 'comins-sortable/react';

type Item = { id: string; label: string };

export function TransferExample() {
  const [todo, setTodo] = useState<Item[]>([
    { id: 'task-1', label: 'Plan' },
    { id: 'task-2', label: 'Build' },
  ]);
  const [done, setDone] = useState<Item[]>([]);

  return (
    <SortableRoot<Item>>
      <SortableArea
        areaId="todo"
        group="tasks"
        items={todo}
        itemKey="id"
        onItemsChange={(next) => setTodo([...next])}
      >
        {(item) => <div>{item.label}</div>}
      </SortableArea>

      <SortableArea
        areaId="done"
        group="tasks"
        items={done}
        itemKey="id"
        emptyInsertThreshold={24}
        onItemsChange={(next) => setDone([...next])}
      >
        {(item) => <div>{item.label}</div>}
      </SortableArea>
    </SortableRoot>
  );
}
```

transaction은 Root `onChange` 전에 source에서 item을 제거하고 destination에
삽입합니다. 두 배열은 같은 제어 update 경계에서 함께 렌더해야 합니다.

`emptyInsertThreshold`는 빈 Area에서 drop 가능한 주축 영역을 확장합니다.
`accept(context)`는 pointer frame마다 destination에 대해 한 번 평가됩니다.
`false` 반환, `disabled`, 영역 밖 drop 또는 제어 commit 실패는 원본 순서를
유지합니다.

Playground:

- <http://127.0.0.1:4003/examples/simple/react>
- <http://127.0.0.1:4003/examples/two-lists/react>
- <http://127.0.0.1:4003/examples/empty/react>
- <http://127.0.0.1:4003/examples/accept/react>
