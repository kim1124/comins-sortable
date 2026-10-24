# Placeholder 스타일

모든 Area는 consumer class와 선택형 visual preset을 지원합니다.

## 전체 예제

```tsx
import { useState } from 'react';
import { SortableArea, SortableRoot } from 'comins-sortable/react';
import 'comins-sortable/styles.css';

type Item = { id: string; label: string };

export function PlaceholderExample() {
  const [items, setItems] = useState<Item[]>([
    { id: 'task-1', label: '기획' },
    { id: 'task-2', label: '개발' },
  ]);

  return (
    <SortableRoot<Item>>
      <SortableArea
        areaId="tasks"
        items={items}
        itemKey="id"
        placeholder={{
          className: 'project-drop-placeholder',
          preset: 'skeleton',
        }}
        onItemsChange={(next) => setItems([...next])}
      >
        {(item) => <div>{item.label}</div>}
      </SortableArea>
    </SortableRoot>
  );
}
```

`className`은 안정적인 `comins-sortable__placeholder` class와 함께 적용됩니다.
`skeleton` preset은 drag feedback이며 애플리케이션 loading 상태가 아닙니다. 공개
stylesheet가 필요하며 reduced-motion 환경에서는 animation을 실행하지 않습니다.

consumer class 또는 공개 CSS 변수를 재정의할 수 있습니다.

```css
.project-drop-placeholder {
  --comins-sortable-placeholder-background: #f3f7f5;
  --comins-sortable-placeholder-border: 2px dashed #176343;
  --comins-sortable-placeholder-border-radius: 8px;
  --comins-sortable-placeholder-opacity: 0.9;
  --comins-sortable-placeholder-skeleton-base: #e4ebe7;
  --comins-sortable-placeholder-skeleton-highlight: #f8faf9;
  --comins-sortable-placeholder-skeleton-duration: 1.2s;
}
```

유효한 드롭 대상이 없으면 삽입 표시를 숨기고, 다시 유효한 영역에 들어오면
표시를 복원합니다. 이동 중에는 숨겨진 Placeholder의 공간을 유지하여 목록 높이와
스크롤 범위가 갑자기 줄어들지 않도록 합니다.

[Playground GIF](../playground-preview.md)는 사용자 점선·기본 파선 삽입 표시를
비교하고, 거부 시 표시가 숨겨지며 대상·드래그 카드에 테두리가 나타나는 장면을
보여줍니다. 스크롤 경계 피드백은 `auto-scroll` 예제에서 확인합니다.

Placeholder는 consumer item 데이터를 복사하지 않습니다. drop, cancel, error,
unmount 또는 destroy의 모든 종료 경로에서 제거됩니다.

**드롭 피드백 스타일** 예제는 `custom-placeholder` 경로에서 두 목록의 기본·사용자
스타일과 수락 여부를 비교합니다. 허용 위치에는 삽입 표시가 나타납니다. 거부 시에는
그 표시를 숨기고 대상 및 드래그 요소의 `data-comins-sortable-rejection`을 통해
`--comins-sortable-rejection-outline`과 `--comins-sortable-rejection-outline-offset`을
적용합니다. 예제에서 적용 CSS를 확인할 수 있습니다. 모든 가능한 목적지를 동시에
미리 강조하는 기능은 아닙니다.

Playground:

- <http://127.0.0.1:4003/examples/custom-placeholder/react>
- <http://127.0.0.1:4003/examples/skeleton-placeholder/react>

## 드래그 표시 좌표 (0.1.6부터 지원)

검증한 2차원 transform, filter와 containment 조건에서도 이동 표시는 포인터의
viewport 좌표에 맞춥니다. 원본 항목은 소비자가 소유한 부모에 유지하며,
완료·취소 시 원본 스타일을 복구하고 드래그 표시를 정리합니다.

조상 스크롤과 placeholder 이동은 fixed 요소의 좌표 기준을 바꿀 수 있습니다.
패키지는 스크롤 후 위치를 보정하며, placeholder 이동으로 축소·회전 목록의 크기와
transform 기준점이 바뀌면 같은 프레임에서 다시 보정합니다. 이전 순간 편차를
수정한 CSS 좌표 처리이며, 모바일 화면의 세로·가로 전환 기능과는 별개입니다.
새 옵션이나 모바일 전용 정렬 모드는 추가하지 않습니다.

분리된 복제·테이블 preview는 CSS 최소·최대 크기 제한으로 측정 크기가 바뀌지
않도록 preview만 보정합니다. 조상의 overflow·paint clipping은 소비자 CSS를
따르며, 비선형 3D perspective와 드래그 도중 변경되는 transform은 이번 검증
범위 밖입니다. 실제 검사·직접 조작과 잔여 릴리즈 단계는
[0.1.6 검증 기록](../verification/0.1.6-local-validation.md)을 참고합니다.

## 사용자 콘텐츠 렌더링

`placeholder.render`는 삽입 자리에, `dragOverlay.render`는 포인터를 따라가는 별도
표시에 콘텐츠를 렌더링합니다. 두 옵션 모두 선택 사항이며, 미설정 시 기존 표시를
유지합니다. 네 어댑터가 동일한 동기 DOM renderer 계약을 사용합니다.

```ts
import type { SortableFeedbackRenderer } from 'comins-sortable/core';

const render: SortableFeedbackRenderer = ({ container, itemId }) => {
  container.textContent = `이동 항목: ${itemId}`;
  return {
    update(next) {
      container.textContent = `${next.itemId}: ${next.rejection ?? next.destination?.areaId ?? 'outside'}`;
    },
    destroy() {
      container.replaceChildren();
    },
  };
};
// Area 옵션에 전달합니다.
const feedbackOptions = { placeholder: { render }, dragOverlay: { render } };
```

문맥에는 Core 소유 `container`, `itemId`, `itemIds`, `source`, `mode`,
`destination`, `rejection`이 있습니다. 위치와 ID 목록은 읽기 전용입니다.
반환 handle의 `destroy`는 필수이며, handle 자체를 반환하지 않아도 됩니다.
`update`는 목적지 또는 거부 상태가 바뀔 때만 호출됩니다. 포인터 이동만으로는
콘텐츠를 다시 렌더링하지 않습니다. 옵션 교체는 다음 드래그부터 적용합니다.

Core가 컨테이너의 위치·크기·숨김·제거를 관리합니다. 소비자는 전달받은 컨테이너의
내부만 변경하고, 이벤트나 프레임워크 mount 자원은 `destroy`에서 해제합니다.
생성 중 예외로 handle을 반환하지 못한다면 소비자가 이미 만든 외부 자원을 직접
회수해야 합니다. 문자열 HTML 또는 비동기 renderer 계약은 제공하지 않습니다.

overlay는 원본 document의 body에 붙습니다. move 원본은 기존 부모에 둔 채 숨기고,
copy 원본은 표시합니다. 임시 표시는 `inert`, `aria-hidden`, `pointer-events: none`을
사용합니다. 기본 표 preview는 유지하며 `TR`·`TH`·`TD`의 custom renderer는
`INVALID_OPTION`으로 거부합니다. 임의 Portal root, 자동 크기 변경, drop animation,
프레임워크 전용 render component는 이번 범위에 포함되지 않습니다.

Playground의 **드롭 피드백 스타일 → 사용자 콘텐츠 렌더링**에서 네 어댑터를
확인할 수 있습니다. 기본 CSS 스타일 변경만 필요하면 기존 class/preset으로 충분합니다.

렌더러 옵션은 0.1.7에 추가됐습니다. 드래그 중 transform 변경은 알려진 제한입니다. [0.1.7 상태](../verification/0.1.7-local-validation.md)를 참고합니다.
