# 고급 정렬

0.1.2에 추가된 기능입니다. npm 0.1.1에는 포함되지 않으므로 배포 전에는 저장소
Playground에서 확인합니다.

다중 드래그, threshold, grid 충돌, swap은 Vanilla, React, Vue, Svelte가
공유하는 Area option입니다.

## 전체 예제

```tsx
import { useState } from 'react';
import { SortableArea, SortableRoot } from 'comins-sortable/react';
import 'comins-sortable/styles.css';

type Item = { id: string; label: string };
type Mode = 'multi' | 'thresholds' | 'swap' | 'grid' | 'swap-grid';

export function AdvancedSortingExample() {
  const [mode, setMode] = useState<Mode>('multi');
  const [items, setItems] = useState<Item[]>(
    Array.from({ length: 12 }, (_, index) => ({
      id: `item-${index + 1}`,
      label: `Item ${index + 1}`,
    })),
  );

  return (
    <>
      <select value={mode} onChange={(event) => setMode(event.target.value as Mode)}>
        <option value="multi">Multi-drag</option>
        <option value="thresholds">Thresholds</option>
        <option value="swap">Swap</option>
        <option value="grid">Grid</option>
        <option value="swap-grid">Swap grid</option>
      </select>
      <SortableRoot<Item>>
        <SortableArea
          areaId="items"
          items={items}
          itemKey="id"
          handle=".drag-handle"
          direction={mode === 'grid' || mode === 'swap-grid' ? 'grid' : 'vertical'}
          areaProps={{ style: {
            display: 'grid',
            gridTemplateColumns: mode === 'grid' || mode === 'swap-grid' ? 'repeat(3, 1fr)' : '1fr',
            gap: 8,
          } }}
          multiDrag={mode === 'multi'}
          selectedClass="is-selected"
          swapThreshold={mode === 'thresholds' ? 0.5 : undefined}
          invertSwap={mode === 'thresholds'}
          swap={mode === 'swap' || mode === 'swap-grid'}
          onItemsChange={(next) => setItems([...next])}
        >
          {(item) => (
            <div>
              <button
                type="button"
                className="drag-handle"
                aria-label={`Drag ${item.label}`}
                style={{ touchAction: 'none', userSelect: 'none', WebkitUserSelect: 'none' }}
              >
                ⠿
              </button>
              <span>{item.label}</span>
            </div>
          )}
        </SortableArea>
      </SortableRoot>
    </>
  );
}
```

## 다중 선택과 텍스트 복사

`multiDrag`에서는 macOS의 Command (⌘), Windows/Linux의 Ctrl로 개별 항목을
토글하고 Shift로 최근 기준점부터 연속 범위를 선택합니다. 선택된 항목을
드래그하면 원래 표시 순서로 함께 이동하며 change의 `itemIds`에서 전체 항목을
확인할 수 있습니다. 보조 마우스 버튼은 선택을 바꾸지 않습니다. 활성화된 다중
선택 항목의 Ctrl 컨텍스트 메뉴만 억제하며, 일반 우클릭·무시 대상 컨트롤·Host
슬롯의 기본 메뉴는 유지합니다.

`handle`을 설정하면 항목 선택과 Ctrl 메뉴 억제에도 같은 입력 범위를 적용합니다.
Playground에서는 핸들을 보조키와 함께 클릭하여 선택하고, 본문은 텍스트 선택과
복사에 사용합니다. 본문을 선택해도 기존 다중 선택 상태는 유지됩니다.

## 정렬 전환 기준

`swapThreshold`(0–1)는 포인터가 대상 카드의 어디까지 들어와야 정렬 순서가
바뀌는지 결정합니다. 드래그 시작에 필요한 이동 거리인 `activationDistance`와는
별개입니다. Playground에서 Design을 위쪽 Research로 이동하면 색칠된 상단
영역이 Research 앞으로 삽입되는 범위를 표시합니다. 반전을 끈 경우 0.2는 상단
60%, 0.8은 90%이며, `invertSwap`을 켜면 각각 40%, 10%가 됩니다. 아래로
이동할 때는 반대 방향을 적용합니다. 컨트롤을 바꾸면 설명과 영역 표시가 함께
갱신됩니다.

## 삽입과 스왑의 차이

`direction="grid"`는 두 축을 사용하며 포인터가 현재 Placeholder 위에 있는 동안
목적지를 유지합니다. 일반 그리드 정렬은 항목을 삽입하면서 사이의 셀을 밀어냅니다.
`swap`은 같은 Area의 드래그 항목과 강조된 대상 항목만 교환하며 나머지 위치는
유지하고 `swapItemId`를 내보냅니다. 스왑 그리드는 `direction="grid"`와 `swap`을
조합한 예제입니다.

Playground는 <http://127.0.0.1:4003/examples/transitions/react> 아래의
`transitions`, `thresholds`, `swap`, `grid`, `swap-grid` 경로에서 확인합니다.

예를 들어 `[A, B, C, D]`에서 A를 C 위치로 이동하면 일반 Grid는
`[B, C, A, D]`, Swap Grid는 `[C, B, A, D]`가 됩니다.
