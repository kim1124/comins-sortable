# 애니메이션과 자동 스크롤

`animation`에 duration 또는 option object를 지정합니다.

## 전체 예제

```tsx
import { useState } from 'react';
import { SortableArea, SortableRoot } from 'comins-sortable/react';

type Item = { id: string; label: string };

export function AnimatedScrollExample() {
  const [items, setItems] = useState<Item[]>(
    Array.from({ length: 20 }, (_, index) => ({
      id: `task-${index + 1}`,
      label: `Task ${index + 1}`,
    })),
  );

  return (
    <div style={{ maxHeight: 240, overflow: 'auto' }}>
      <SortableRoot<Item>>
        <SortableArea
          areaId="tasks"
          items={items}
          itemKey="id"
          animation={{ duration: 180, easing: 'ease-out' }}
          autoScroll
          onItemsChange={(next) => setItems([...next])}
        >
          {(item) => <div>{item.label}</div>}
        </SortableArea>
      </SortableRoot>
    </div>
  );
}
```

애니메이션은 제어 상태 update와 drag commit의 layout delta를 FLIP으로 처리합니다.
비활성화하려면 `animation={false}`를 사용합니다. reduced-motion 환경에서는 option이
있어도 이동 애니메이션을 실행하지 않습니다.

`autoScroll`은 가장 가까운 scroll 가능 컨테이너를 먼저 이동하고 없으면 window를
사용합니다. pointer가 edge 근처에 있는 동안 계속 실행되며 drop, cancel, blur,
unmount 또는 destroy에서 중지합니다. 컨테이너에 실제 overflow와 제한된 크기가
있어야 하며 option이 scroll CSS를 생성하지는 않습니다.

스크롤 컨테이너와 유효한 드롭 대상의 경계는 다를 수 있습니다. 예를 들어 컨테이너의
하단 여백에서는 목록이 스크롤되어도 포인터가 등록된 드롭 영역 밖에 있을 수 있습니다.
이때 삽입 미리보기를 숨기며, 유효한 대상 없이 놓으면 이동을 취소합니다. 유효한
영역으로 재진입하면 미리보기를 복원합니다. 숨긴 이동용 Placeholder는 공간을
유지하므로 숨김 때문에 스크롤 범위가 줄어들지 않습니다.
[Placeholder 스타일](./13-placeholder.md)에서 자세히 설명합니다.

[Playground GIF](../playground-preview.md)에서 React의 하단 여백 이탈 시 미리보기
숨김, 재진입 시 복원, 마지막 위치로 드롭하는 흐름을 확인할 수 있습니다.

0.1.3부터 기존 60Hz 속도를 기준으로 경과 시간에 비례하여
스크롤하고, 프레임 지연 뒤 한 번에 지나치게 이동하지 않도록 제한합니다.
CSS `direction: rtl`인 컨테이너와 페이지의 음수 `scrollLeft` / `scrollX`도
처리합니다.

외부 page/ancestor 스크롤도 활성 drag의 충돌 좌표를 갱신합니다. 포인터가
정지한 상태나 스크롤 직후 즉시 drop한 경우에도 목적지를 다시 평가합니다.
이 좌표 보정은 Core의 `autoScroll` 옵션 활성화 여부와 별개입니다.

가로 목록은 `direction="horizontal"`을 사용합니다. `auto`는 측정된 item center로
방향을 결정합니다.

Playground: <http://127.0.0.1:4003/examples/transition/react> 아래의
`transition`, `auto-scroll` 경로를 확인합니다.

`transitions` 경로는 다중 선택 이동을 설명하며 [고급 정렬](./16-advanced-sorting.md)에서 다룹니다.
