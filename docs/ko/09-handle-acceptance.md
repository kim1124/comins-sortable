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
            <span className="card-label">{item.label}</span>
          </div>
        )}
      </SortableArea>
    </SortableRoot>
  );
}
```

```css
.drag-handle {
  touch-action: none;
  -webkit-user-select: none;
  user-select: none;
}

.card-label {
  -webkit-user-select: text;
  user-select: text;
}
```

명시적인 `handle`은 `ignore`보다 우선합니다. 접근 가능한 handle은 실제 button으로
구현하고 설명 가능한 label을 제공합니다. `activationDistance`는 작은 pointer
움직임이 즉시 drag로 시작되는 것을 방지합니다.

본문 선택·복사가 필요한 카드에는 핸들로만 이동을 시작하도록 설정합니다.
본문의 `user-select`와 `-webkit-user-select`는 `text`, 핸들은 `none`으로
설정합니다. `touch-action: none`도 핸들에 적용하여 본문의 기본 터치 동작을
유지합니다. Playground는 기본적으로 이 방식을 사용하고, 활성 드래그 중에만
본문 선택을 차단합니다. 이동 완료·취소 뒤에는 본문을 다시 선택할 수 있습니다.
`multiDrag`와 함께 사용하면 보조키와 핸들 클릭으로 항목을 선택합니다.
핸들 밖의 본문이나 무시 대상에서 시작한 입력은 항목 선택을 바꾸지 않습니다.

`handle`을 생략하면 기본 무시 대상인 입력창·버튼·링크·편집 요소 등을 제외한
항목 전체에서 드래그를 시작할 수 있습니다. `handle=".card-title"`처럼 원하는 하위
요소의 선택자를 지정할 수도 있습니다. Playground의 **드래그 시작 영역** 예제에서
전용 핸들·제목·카드 전체를 전환합니다. 전체 모드는 본문 드래그도 정렬로 처리하며,
핸들 모드로 돌아오면 본문 선택이 복원됩니다. 다른 예제의 기본 핸들 방식은 유지합니다.

**확인된 Safari 제한(2026-09-22):** 실제 Safari 26.6.2의 React Playground에서
제목 모드로 정렬한 뒤 여러 카드의 본문 선택이 남습니다. 새로고침 직후에도 재현되며
핸들 모드로 돌아가는 것만으로 기존 선택이 지워지지는 않습니다. 본문 선택·복사가
필요하면 전용 핸들 예제를 기준으로 사용합니다. 카드 전체 모드는 본문 드래그도
정렬로 처리합니다. [재현 및 검증 범위](../../reports/2026-09-22-final-artifact-safari-validation.md)를
참조하며, 이 결과를 모든 어댑터·브라우저의 동일 결함으로 확대하지 않습니다.

핸들은 포인터 활성화 범위를 제한합니다. 설명이 있는 button을 사용해도 키보드
정렬 기능이 추가되지는 않습니다. 활성 드래그 중 본문 선택을 차단하는 처리는
Playground의 스타일·lifecycle 구성이고, 패키지가 전역 `user-select`를 설정하지는
않습니다. 소비자 앱에서 같은 처리가 필요하면 해당 위젯 범위에만 적용하고
`onAfterDrag`와 unmount에서 해제합니다.

Core는 수락한 마우스 정렬 입력이 진행되는 동안만 브라우저의 네이티브
`dragstart`를 막아 기존 텍스트 선택이 정렬 입력을 가로채지 않도록 합니다.
선택 범위를 지우지 않으며, 이동 후 특정 값만 다시 선택해서 복사할 수 있습니다.
정렬 대상으로 수락하지 않은 본문·링크 등의 입력은 이 차단 대상이 아닙니다.

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
