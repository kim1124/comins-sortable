# 핸들과 수락 정책

selector로 drag activation을 제한하고 callback으로 destination을 제어합니다.

## 전체 예제

```tsx
import { useState } from 'react';
import { SortableArea, SortableRoot } from 'comins-sortable/react';

type Item = { id: string; label: string };

export function HandleExample() {
  const [items, setItems] = useState<Item[]>([
    { id: 'task-1', label: 'Plan' },
    { id: 'task-2', label: 'Build' },
  ]);

  return (
    <SortableRoot<Item>>
      <SortableArea
        areaId="tasks"
        items={items}
        itemKey="id"
        handle=".drag-handle"
        ignore="a, input, textarea, select"
        activationDistance={4}
        accept={(context) => context.source.areaId !== 'locked'}
        onItemsChange={(next) => setItems([...next])}
      >
        {(item) => (
          <div>
            <button
              type="button"
              className="drag-handle"
              aria-label={`Drag ${item.label}`}
            >
              ⠿
            </button>
            <span>{item.label}</span>
          </div>
        )}
      </SortableArea>
    </SortableRoot>
  );
}
```

명시적인 `handle`은 `ignore`보다 우선합니다. 접근 가능한 handle은 실제 button으로
구현하고 설명 가능한 label을 제공합니다. `activationDistance`는 작은 pointer
움직임이 즉시 drag로 시작되는 것을 방지합니다.

본문 선택·복사가 필요한 카드에는 핸들로만 이동을 시작하도록 설정합니다.
본문의 `user-select`와 `-webkit-user-select`는 `text`, 핸들은 `none`으로
설정합니다. `touch-action: none`도 핸들에 적용하여 본문의 기본 터치 동작을
유지합니다. Playground는 모든 카드에 이 방식을 사용하고, 활성 드래그 중에만
본문 선택을 차단합니다. 이동 완료·취소 뒤에는 본문을 다시 선택할 수 있습니다.
`multiDrag`와 함께 사용하면 보조키와 핸들 클릭으로 항목을 선택합니다.
핸들 밖의 본문이나 무시 대상에서 시작한 입력은 항목 선택을 바꾸지 않습니다.

`accept(context)`는 destination 후보를 제어합니다. group의 `put`은 어떤 source
group이 들어올 수 있는지 제한합니다. `disabled`는 runtime에 source 또는
destination Area를 차단하며 해당 owner의 활성 drag도 취소합니다.

거부된 destination 또는 같은 Host 안의 비정렬 형제를 가리키는 동안 대상과 drag
preview에는 `data-comins-sortable-rejection`이 설정됩니다. 기본 `styles.css`는 빨간
outline과 `not-allowed` cursor를 제공하며
`--comins-sortable-rejection-outline`,
`--comins-sortable-rejection-outline-offset` CSS 변수로 재정의할 수 있습니다. 포인터가
유효 위치로 이동하거나 drag가 종료되면 이 상태는 제거됩니다.

Playground:

- <http://127.0.0.1:4003/examples/handle/react>
- <http://127.0.0.1:4003/examples/accept/react>
