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
  --comins-sortable-placeholder-border: #176343;
  --comins-sortable-placeholder-border-radius: 8px;
  --comins-sortable-placeholder-opacity: 0.9;
  --comins-sortable-placeholder-skeleton-base: #e4ebe7;
  --comins-sortable-placeholder-skeleton-highlight: #f8faf9;
  --comins-sortable-placeholder-skeleton-duration: 1.2s;
}
```

Placeholder는 consumer item 데이터를 복사하지 않습니다. drop, cancel, error,
unmount 또는 destroy의 모든 종료 경로에서 제거됩니다.

Playground:

- <http://127.0.0.1:4003/examples/custom-placeholder/react>
- <http://127.0.0.1:4003/examples/skeleton-placeholder/react>
