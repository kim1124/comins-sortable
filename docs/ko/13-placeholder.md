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

## 드래그 표시 좌표 (0.1.6 후보)

2차원 transform, filter 또는 containment가 fixed 요소의 기준을 바꾸는
경우에도 이동 표시는 포인터의 viewport 좌표에 맞춥니다. 원본 항목은 소비자가
소유한 부모에 유지하며, 포인터 이동과 조상 스크롤에 부모 offset이 중복되지
않도록 보정합니다. 분리된 복제·테이블 preview는 CSS 최소·최대 크기 제한으로
viewport 측정 크기가 바뀌지 않도록 처리합니다.

조상의 overflow·paint clipping은 소비자 CSS를 따릅니다. 이 변경은 portal을
추가하거나 비선형 3D perspective 및 드래그 도중 변경되는 transform의 지원을
보장하지 않습니다. 취소 시 원본 스타일·포커스와 placeholder 정리를 복구합니다.
[0.1.6 후보 검증 보고서](../../reports/2026-10-12-0.1.6-implementation.md)에서 실제 검사 범위를 확인할 수 있습니다.
