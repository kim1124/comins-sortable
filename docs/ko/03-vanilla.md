# Vanilla JavaScript 어댑터

DOM을 직접 정렬 view로 사용할 때 package root의 `createSortable`을 사용합니다.

```html
<ul id="tasks">
  <li data-sortable-id="task-1">계획</li>
  <li data-sortable-id="task-2">구현</li>
</ul>
```

```ts
import { createSortable } from 'comins-sortable';

const sortable = createSortable('#tasks', {
  areaId: 'tasks',
  item: ':scope > [data-sortable-id]',
  onChange(change) {
    console.log(change.operation, change.orders);
  },
  onError(error) {
    console.error(error);
  },
});

// 화면 또는 컴포넌트 해제 시 호출합니다.
sortable.destroy();
```

`createSortable`은 다음 프레임 검증 전에 DOM을 이동합니다. 별도의 업무 상태가
DOM 순서를 저장한다면 `onChange`에서 함께 갱신합니다. 기본 item ID는
`data-sortable-id`에서 읽으며 다른 식별자가 필요하면 `getItemId`를 제공합니다.

같은 scope에 area를 추가할 때는 `sortable.registerArea(element, options)`을
사용합니다. 반환된 unregister 함수를 보관하고 area를 제거하기 전에 호출합니다.
`destroy()`는 활성 drag를 취소하고 scope 전체 resource를 해제합니다.

Playground: <http://127.0.0.1:4003/examples/simple/vanilla>
