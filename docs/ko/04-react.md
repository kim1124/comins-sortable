# React 어댑터

React는 제어형 `SortableRoot`와 `SortableArea` 컴포넌트를 사용합니다.

```tsx
import { useState } from 'react';
import { SortableArea, SortableRoot } from 'comins-sortable/react';

type Item = { id: string; label: string };

export function Tasks() {
  const [items, setItems] = useState<Item[]>([
    { id: 'task-1', label: '계획' },
    { id: 'task-2', label: '구현' },
  ]);

  return (
    <SortableRoot<Item> onError={console.error}>
      <SortableArea
        areaId="tasks"
        items={items}
        itemKey="id"
        onItemsChange={(next) => setItems([...next])}
      >
        {(item) => <div>{item.label}</div>}
      </SortableArea>
    </SortableRoot>
  );
}
```

Root는 하나의 공유 scope를 소유합니다. item을 서로 이동할 area는 같은 Root 아래에
두고 같은 `group`을 지정합니다. Root가 없는 Area는 area 하나만 포함하는 private
scope를 생성합니다. React Strict Mode의 setup·cleanup 반복도 중복 등록 없이
지원합니다.

`onItemsChange`에서는 다음 제어 렌더를 동기적으로 예약해야 합니다. Root의
`onChange`는 영향을 받은 모든 area setter 이후에 호출되며 전체 transaction의
typed immutable update를 제공합니다.

Playground: <http://127.0.0.1:4003/examples/simple/react>
