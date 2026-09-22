# 사용자 Host와 Slot

React의 `as`와 Vue의 `tag`는 Area 계약을 바꾸지 않고 정렬 Host를 변경합니다.
Svelte와 Vanilla는 항목을 직접 포함하는 element를 등록합니다.

## 전체 예제

```tsx
import { useState } from 'react';
import { SortableArea, SortableRoot } from 'comins-sortable/react';

type Item = { id: string; label: string };

export function CustomHostExample() {
  const [items, setItems] = useState<Item[]>([
    { id: 'task-1', label: 'Plan' },
    { id: 'task-2', label: 'Build' },
  ]);

  return (
    <SortableRoot<Item>>
      <SortableArea
        as="ul"
        areaId="tasks"
        areaProps={{ 'aria-label': 'Tasks', style: { listStyle: 'none', padding: 0 } }}
        items={items}
        itemKey="id"
        handle=".drag-handle"
        header={<li>Tasks to complete</li>}
        footer={<li>End of list — not a drop target</li>}
        onItemsChange={(next) => setItems([...next])}
      >
        {(item) => (
          <li>
            <button
              type="button"
              className="drag-handle"
              aria-label={`Drag ${item.label}`}
              style={{ touchAction: 'none', userSelect: 'none', WebkitUserSelect: 'none' }}
            >
              ⠿
            </button>
            <span>{item.label}</span>
          </li>
        )}
      </SortableArea>
    </SortableRoot>
  );
}
```

이 예제는 실제 `ul`을 Host로 사용하고 헤더·푸터 `li`를 정렬 항목에서 제외합니다.
`as`에 사용자 컴포넌트를 전달하는 경우에는 React ref를 실제 Host까지 전달해야
합니다. Vue 컴포넌트도 등록할 실제 root element를 노출해야 합니다.

React의 `header`·`footer`, Vue slot 또는 범위를 좁힌 Vanilla/Svelte `item`
selector로 같은 Host에 비정렬 콘텐츠를 유지합니다. 비정렬 형제는 item selector와
일치해서는 안 되며 제어 item 배열에도 포함하지 않습니다. 포인터가 이러한
형제 위에 있으면 삽입 위치로 해석하지 않고 `not-accepted` 피드백을 표시합니다.

Vanilla/Svelte에서는 `item: ':scope > .task-item'`처럼 직접 항목만 지정할 수
있습니다. 자식 항목에 `matches()`를 호출하지 않고 등록 Area에서 선택자를 평가합니다.
헤더·푸터에는 `.task-item`을 붙이지 않습니다.

`third-party`는 외부 UI 패키지 의존성 없이 소비자 컴포넌트를 Host로 쓰는 예제입니다.
이름이 외부 라이브러리 통합을 보증하지는 않습니다. 테이블 행·열 Playground 데모는
제거되었으며, 일반 Host API의 존재를 테이블 정렬 지원 근거로 사용하지 않습니다.

Playground:

- <http://127.0.0.1:4003/examples/third-party/react>
- <http://127.0.0.1:4003/examples/footer-slot/react>
- <http://127.0.0.1:4003/examples/header-slot/react>
- <http://127.0.0.1:4003/examples/two-list-slots/react>

## Playground Host 설명

React는 `as`와 ref 전달, Vue는 `tag`와 `componentProps`를 사용합니다.
Svelte는 직접 작성한 `div`에 `use:sortable`을 연결하고, Vanilla는 생성한 `div`를
`createSortable`에 전달합니다. 뒤의 두 탭은 컴포넌트 교체 예제가 아니라 직접 DOM
등록 예제입니다. `functional-third-party` 경로도 이 차이를 유지하며 `parent`로
자식 영역을 연결합니다.
