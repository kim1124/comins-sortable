# 사용자 Host와 Slot

React의 `as`와 Vue의 `tag`는 Area 계약을 바꾸지 않고 정렬 host를 변경합니다.
Svelte와 Vanilla는 item 자식을 소유하는 element를 직접 등록합니다.

## 전체 예제

```tsx
import { useState } from 'react';
import { SortableArea, SortableRoot } from 'comins-sortable/react';

type Row = { id: string; name: string; owner: string };

export function TableRowsExample() {
  const [rows, setRows] = useState<Row[]>([
    { id: 'project-1', name: '웹사이트', owner: '민수' },
    { id: 'project-2', name: '모바일 앱', owner: '지영' },
  ]);

  return (
    <SortableRoot<Row>>
      <table>
        <thead>
          <tr>
            <th>프로젝트</th>
            <th>담당자</th>
          </tr>
        </thead>
        <SortableArea
          as="tbody"
          areaId="rows"
          items={rows}
          itemKey="id"
          animation={160}
          onItemsChange={(next) => setRows([...next])}
        >
          {(row) => (
            <tr>
              <td>{row.name}</td>
              <td>{row.owner}</td>
            </tr>
          )}
        </SortableArea>
      </table>
    </SortableRoot>
  );
}
```

테이블 열 정렬은 row host와 header-cell item에 `direction="horizontal"`을
사용합니다. 사용자 component를 host로 사용한다면 React ref를 전달하거나 Vue의
실제 root element가 adapter에 노출되어야 합니다.

React의 `header`·`footer`, Vue slot 또는 범위를 좁힌 Vanilla/Svelte `item`
selector를 사용하면 같은 host에 비정렬 콘텐츠를 유지할 수 있습니다. 비정렬
형제는 item selector와 일치해서는 안 되며 제어 item 배열에도 포함하지 않습니다.
pointer가 이러한 비정렬 형제 위에 있으면 삽입 위치로 해석하지 않고
`not-accepted` 거부 피드백을 표시합니다.

Playground:

- <http://127.0.0.1:4003/examples/third-party/react>
- <http://127.0.0.1:4003/examples/footer-slot/react>
- <http://127.0.0.1:4003/examples/header-slot/react>
- <http://127.0.0.1:4003/examples/two-list-slots/react>
