# Lifecycle과 오류

Scope callback은 상태 소유권을 라이브러리로 이동하지 않고 drag lifecycle을
애플리케이션에 제공합니다.

## 전체 예제

```tsx
import { useState } from 'react';
import { SortableArea, SortableRoot } from 'comins-sortable/react';

type Item = { id: string; label: string; locked?: boolean };

export function LifecycleExample() {
  const [items, setItems] = useState<Item[]>([
    { id: 'task-1', label: '기획' },
    { id: 'task-2', label: '개발' },
  ]);

  return (
    <SortableRoot<Item>
      onBeforeDragStart={(context) => {
        const item = items.find(({ id }) => id === context.itemId);
        return item?.locked !== true;
      }}
      onDragStart={(context) => console.info('start', context)}
      onDrag={(context) => console.info('drag', context)}
      onInsertDragArea={(event) => {
        console.info('destination', event.destination);
      }}
      onChange={(change) => console.info('change', change)}
      onAfterDrag={(result) => {
        console.info('complete', result.status, result.reason);
      }}
      onError={(error) => console.error('sortable error', error)}
    >
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

`onBeforeDragStart`에서 `false`를 반환하면 after-drag lifecycle을 시작하지 않고
pending activation을 종료합니다. activation 이후에는 cleanup과 rollback을 먼저
수행한 뒤 `onAfterDrag`를 호출합니다. 결과 status는 `dropped`, `cancelled`,
`rejected`이며 reason으로 drop, 영역 밖, pointer cancel, Escape, blur, disabled,
수락 거부, nested cycle, unmount, stale commit, destroy, callback error를 구분합니다.

`onError`는 애플리케이션 오류 경계입니다. React와 Vue는 consumer callback에
도달하기 전의 구조적 Core 오류도 이 경계로 전달합니다. Svelte는 공유 scope에
지정한 handler를 사용하고 없으면 Core platform reporter를 사용합니다.

소유한 scope 또는 adapter instance는 반드시 destroy합니다. destroy는 여러 번
호출해도 안전하며 활성 작업을 취소하고 pointer capture, frame, listener,
animation, placeholder, rollback 상태를 모두 해제합니다.

`onChange` 호출만 성공 증거로 사용하지 않습니다. 제어 렌더가 검증되고
`onAfterDrag({ status: 'dropped' })`가 호출되어야 transaction이 완료됩니다.
