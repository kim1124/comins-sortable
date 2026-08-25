# Comins Sortable v1 Design

**상태:** 사용자 승인 완료, 구현 전 설계

**작성일:** 2026-08-07

**범위:** `comins-sortable`의 Vanilla JS, React, Vue, Svelte 공통 v1 동작과
공개 계약을 정의한다. 이 문서는 구현, package 생성, publish, tag 또는 Release를
수행하지 않는다.

## 1. 배경

`comins-sortable`은 jQuery UI의 sortable과 제한된 draggable 사용 사례를 하나의
모듈로 제공한다. 자유 좌표 기반 Layout 엔진이 아니라, 등록된 영역 안에서 item의
순서를 바꾸거나 등록된 다른 영역의 특정 index로 item을 이동한다.

Core는 외부 drag-and-drop runtime 없이 Vanilla TypeScript로 구현한다. React, Vue,
Svelte는 동일 Core를 사용하는 얇은 어댑터이며 Vanilla JS는 package root의 DOM
facade를 사용한다.

## 2. 조사 근거

다음 공식 문서와 공개 소스를 대표 비교군으로 검토했다.

- [SortableJS](https://github.com/SortableJS/Sortable): 단일·복수 목록, group,
  handle, filter, placeholder, move/change lifecycle, auto-scroll
- [sortablejs-vue3](https://github.com/MaxLeiter/sortablejs-vue3): 작은 Vue
  component wrapper와 수동 상태 동기화
- [vue-draggable-plus](https://github.com/Alfred-Skyblue/vue-draggable-plus): Vue
  component, composable, directive와 `v-model` 자동 동기화
- [dnd-kit](https://github.com/clauderic/dnd-kit): framework-agnostic core, DOM
  계층, React·Vue·Svelte adapter, geometry와 collision 계층화
- [Pragmatic drag and drop](https://atlassian.design/components/pragmatic-drag-and-drop/core-package/):
  TypeScript로 작성된 Vanilla JS core, instance 격리, 등록 해제 cleanup
- [FormKit Drag and Drop](https://github.com/formkit/drag-and-drop): 배열을
  source of truth로 사용하는 data-first 모델과 framework wrapper
- [react-sortablejs](https://github.com/SortableJS/react-sortablejs): DOM mutation과
  React state reconciliation의 복잡성
- [svelte-dnd-action](https://github.com/isaacHagoel/svelte-dnd-action): Svelte
  action, consider/finalize 상태 갱신, shadow placeholder
- [hello-pangea/dnd](https://github.com/hello-pangea/dnd): controlled list,
  placeholder, multi-list와 auto-scroll 경계

인접 범주의 모듈은 다음 이유로 직접 runtime 후보가 아니라 경계 검증 자료로만
사용한다.

| 범주 | 검토 대상 | v1 적용 판단 |
|---|---|---|
| 원형 API | [jQuery UI Sortable](https://api.jqueryui.com/sortable/), [Draggable](https://api.jqueryui.com/draggable/) | 사용자 경험과 lifecycle 명칭만 참고하고 jQuery 의존성은 사용하지 않음 |
| 저수준 drag | [interact.js](https://interactjs.io/docs/draggable/), [Neodrag](https://github.com/PuruVJ/neodrag) | pointer activation과 제약 개념만 참고하며 x/y 좌표 소유 모델은 제외 |
| 별도 sortable | [Shopify Draggable](https://github.com/Shopify/draggable), [Dragula](https://github.com/bevacqua/dragula) | 영역 간 이동과 mirror 처리 비교에 사용하고 runtime 의존성은 추가하지 않음 |
| layout engine | [Muuri](https://github.com/haltu/muuri), [GridStack](https://github.com/gridstack/gridstack.js) | 좌표·레이아웃 소유권이 본 모듈의 비목표이므로 제외 |
| slot swap | [Swapy](https://github.com/TahaSh/swapy) | 고정 slot 교환 모델은 pointer index 기반 list insertion과 달라 제외 |

조사 결과, data-first Core와 framework adapter 구조는 과도하지 않다. 다만 내부
계층을 각각 public package로 노출하거나 모든 framework binding 형식을 v1에 동시에
제공하는 것은 제외한다.

## 3. 목표

v1은 다음 동작을 제공한다.

1. 단일 영역 내부 item 재정렬
2. 동일 Scope의 복수 영역 간 item 이동
3. pointer 위치에 해당하는 destination index 계산
4. drag 중 단일 Placeholder 제공
5. mouse, touch, pen을 Pointer Events로 처리
6. Vanilla JS, React, Vue, Svelte에서 동일한 핵심 동작 제공
7. lifecycle callback과 원자적인 reorder/transfer change 제공
8. 최소 CSS와 namespace된 style hook 제공
9. SSR-safe import, 멱등 cleanup, 개인정보 비수집 및 zero runtime dependency

## 4. 비목표

다음은 v1에 포함하지 않는다.

- 자유 x/y 좌표 저장 또는 Grid Layout
- clone/copy, multidrag, swap/combine
- nested 또는 tree sortable
- virtualized list 전용 engine
- 소비자가 교체하는 sensor·collision plugin system
- keyboard sorting sensor와 live region
- framework별 component, hook, composable, directive, action의 동시 제공
- iframe 간 이동과 Shadow DOM 경계 횡단
- 외부 file 또는 text drop
- CommonJS 전용 환경, UMD/IIFE global, IE
- publish, tag, GitHub Release

## 5. Package 표면

단일 npm package와 다음 subpath를 사용한다.

```text
comins-sortable              Vanilla JS 기본 facade
comins-sortable/core         공통 controller, 순수 helper, type
comins-sortable/react        React adapter
comins-sortable/vue          Vue adapter
comins-sortable/svelte       Svelte adapter
comins-sortable/styles.css   선택적 최소 visual style
```

`comins-sortable/vanilla`는 package root와 중복되므로 v1에서 만들지 않는다.
JavaScript output은 ESM과 ES2020을 기준으로 하며 framework peer dependency는
optional peer로 선언한다.

- React: `>=18.2 <20`
- Vue: `>=3.5 <4`
- Svelte: `>=5 <6`

모든 JavaScript subpath는 import 시점에 `window`, `document`, `HTMLElement`를
참조하지 않는다. DOM 연결은 명시적인 생성 또는 mount 이후에만 시작한다.

## 6. Architecture

```text
comins-sortable
├─ core
│  ├─ model        ID, Area, Operation, Change
│  ├─ engine       drag session state machine
│  ├─ registry     area와 item 등록
│  ├─ geometry     DOMRect snapshot과 invalidation
│  ├─ collision    area와 insertion index 판정
│  ├─ pointer      Pointer Events activation
│  ├─ feedback     Placeholder와 source feedback
│  └─ auto-scroll  scroll container 제어
├─ vanilla         package root DOM facade
├─ react           React binding
├─ vue             Vue binding
├─ svelte          Svelte action binding
└─ styles.css      namespace된 최소 CSS
```

이 구분은 내부 응집도와 테스트 경계다. `model`, `registry`, `geometry`,
`collision`, `pointer`, `feedback`, `auto-scroll`을 개별 public export 또는 plugin
API로 노출하지 않는다.

Core engine은 drag 중 Placeholder와 feedback을 위한 임시 DOM만 소유한다. 최종
순서는 adapter가 확정한다.

- Vanilla facade: 성공한 drop을 실제 DOM 순서로 확정
- React·Vue·Svelte: framework state를 통해 최종 순서 확정

Scope는 instance별로 격리하며 전역 group registry 또는 singleton을 사용하지 않는다.
같은 group 이름이라도 Scope가 다르면 상호작용하지 않는다.

## 7. Core 데이터 계약

```ts
type SortableId = string | number;

type ItemKey<T> = keyof T | ((item: T) => SortableId);

interface SortableLocation {
  areaId: string;
  index: number;
}

interface SortableOrder {
  areaId: string;
  itemIds: readonly SortableId[];
}

interface SortableChange {
  operation: "reorder" | "transfer";
  itemId: SortableId;
  source: SortableLocation;
  destination: SortableLocation;
  orders: readonly SortableOrder[];
}

interface SortableAreaUpdate<T> {
  areaId: string;
  items: readonly T[];
}

interface FrameworkSortableChange<T> extends SortableChange {
  updates: readonly SortableAreaUpdate<T>[];
}
```

- `reorder`는 `orders`와 `updates`에 동일 area 한 개를 포함한다.
- `transfer`는 source와 destination 두 area를 포함한다.
- item 배열은 직접 mutate하지 않고 영향받은 배열만 얕게 복사한다.
- `SortableChange`에는 DOM element, item text, raw PointerEvent를 넣지 않는다.
- source를 제거한 목록을 기준으로 destination index를 정규화한다.
- area ID는 Scope 안에서 고유해야 한다.
- item ID는 같은 Scope와 group 전체에서 고유해야 하며 index fallback을 허용하지
  않는다.
- 같은 group으로 연결된 area는 동일한 item data type을 사용한다.

순수 helper는 public으로 제공한다.

```ts
reorder<T>(items, fromIndex, toIndex): readonly T[];

transfer<T>(
  sourceItems,
  destinationItems,
  sourceIndex,
  destinationIndex,
): {
  sourceItems: readonly T[];
  destinationItems: readonly T[];
};
```

## 8. Scope와 상태 소유권

복수 영역은 명시적인 Root 또는 Scope에 등록한다. Root는 drag session을 조정하지만
consumer 데이터를 장기 내부 상태로 보관하지 않는다.

```ts
interface SortableScope {
  registerArea(element, options): () => void;
  updateArea(areaId, patch): void;
  cancel(): void;
  destroy(): void;
}

createSortableScope(options): SortableScope;
```

`registerArea()`가 반환하는 unregister 함수와 `destroy()`는 멱등이다. idle 상태의
`cancel()`은 아무 동작도 하지 않는다. 하나의 Scope에는 같은 `ownerDocument`의
element만 등록할 수 있다.

- 단일 영역: adapter가 내부 Scope를 생성할 수 있다.
- 복수 영역: 같은 Root 또는 `createSortableScope()` 결과를 공유해야 한다.
- `group`: 같은 Scope 안에서 영역 간 이동을 허용하는 논리 분류
- `accept`: destination이 현재 item을 받을 수 있는지 동기적으로 판정

framework adapter는 controlled 방식만 지원한다. uncontrolled state와 controlled
state를 동시에 제공하지 않는다.

유효한 drop의 framework 처리 순서는 다음과 같다.

1. Core가 하나의 `SortableChange`를 계산한다.
2. source와 destination의 framework binding callback을 같은 transaction에서 호출한다.
3. Root 또는 controller의 `onChange`를 한 번 호출한다.
4. adapter가 다음 framework render에서 ID 순서를 확인한다.
5. 순서가 반영되면 commit하고, 반영되지 않으면 rollback한다.

상태 갱신은 drag callback의 일반 동기 update로 예약해야 한다. transition이나 임의의
지연 갱신으로 다음 animation-frame 경계까지 새 순서가 확인되지 않으면
`state-not-committed`로 거부한다.

## 9. Vanilla JS

Vanilla 사용자는 package root의 DOM facade를 사용한다.

```js
import { createSortable } from "comins-sortable";

const sortable = createSortable(document.querySelector("#todo"), {
  areaId: "todo",
  group: "tasks",
  item: ":scope > [data-sortable-item]",
  getItemId: (element) => element.dataset.id,
  onChange(change) {
    persistOrder(change.orders);
  },
});

const unregisterDone = sortable.registerArea(
  document.querySelector("#done"),
  {
    areaId: "done",
    group: "tasks",
    item: ":scope > [data-sortable-item]",
    getItemId: (element) => element.dataset.id,
  },
);

unregisterDone();
sortable.destroy();
```

Controller 표면은 다음으로 제한한다.

```ts
registerArea(element, options): () => void;
updateArea(areaId, patch): void;
cancel(): void;
destroy(): void;
```

- `Element`와 selector string을 받을 수 있다.
- selector가 유효하지 않거나 element를 찾지 못하면 `INVALID_ELEMENT`로 거부한다.
- item ID는 `getItemId()` 또는 `data-sortable-id`로 얻는다.
- index, `textContent`, `innerHTML`, element ID를 fallback item ID로 사용하지 않는다.
- 외부 DOM 변경은 다음 drag activation 시 direct child를 다시 스캔해 반영한다.
- 기본 `MutationObserver`는 사용하지 않는다.
- 성공한 drop은 source element를 Placeholder 위치로 이동한 뒤 DOM 순서를 유지한다.

## 10. Framework Adapter

### 10.1 React

React는 `SortableRoot`와 `SortableArea`를 제공한다. 단일 영역에서는 Root를 생략할
수 있다. 별도 `useSortable` public hook은 v1에서 제공하지 않는다.

```tsx
<SortableRoot onChange={handleChange}>
  <SortableArea
    areaId="todo"
    group="tasks"
    items={todo}
    itemKey="id"
    onItemsChange={setTodo}
  >
    {(item) => <TaskItem item={item} />}
  </SortableArea>

  <SortableArea
    areaId="done"
    group="tasks"
    items={done}
    itemKey="id"
    onItemsChange={setDone}
  >
    {(item) => <TaskItem item={item} />}
  </SortableArea>
</SortableRoot>
```

React Strict Mode의 setup-cleanup-setup을 허용하고 element/ref 변경과 unmount 시
등록을 멱등으로 해제한다.

### 10.2 Vue

Vue는 `SortableRoot`와 `SortableArea`를 제공한다. composable과 directive는 v1에서
제공하지 않는다.

```vue
<SortableRoot @change="handleChange">
  <SortableArea
    v-model="todo"
    area-id="todo"
    group="tasks"
    item-key="id"
  >
    <template #item="{ item }">
      <TaskItem :item="item" />
    </template>
  </SortableArea>
</SortableRoot>
```

transfer 시 source와 destination의 `update:modelValue`를 같은 transaction에서
emit하고 Root의 `change`는 한 번만 emit한다.

### 10.3 Svelte

Svelte는 action을 대표 API로 사용한다. component와 attachment는 v1에서 제공하지
않는다. CustomEvent와 callback을 중복 제공하지 않고 typed callback을 사용한다.

```svelte
<script>
  import {
    createSortableScope,
    sortable,
  } from "comins-sortable/svelte";

  const scope = createSortableScope({
    onChange: handleChange,
  });
</script>

<div
  use:sortable={{
    scope,
    areaId: "todo",
    group: "tasks",
    items: todo,
    itemKey: "id",
    onItemsChange: (next) => todo = next,
  }}
>
  {#each todo as item (item.id)}
    <TaskItem {item} />
  {/each}
</div>
```

action의 `update`와 `destroy`에서 Core registration을 동기화한다.

## 11. 공통 옵션

| 옵션 | 기본값 | 의미 |
|---|---:|---|
| `group` | Scope 내부 기본 그룹 | 영역 간 이동 범위 |
| `direction` | `"auto"` | `vertical`, `horizontal`, `auto` |
| `disabled` | `false` | area 전체 비활성화 |
| `handle` | 없음 | drag handle selector |
| `ignore` | 기본 interactive selector | drag를 시작하지 않을 요소 |
| `activationDistance` | `4` | drag 활성화에 필요한 pointer 이동 px |
| `emptyInsertThreshold` | `8` | 빈 area 주변 확장 hitbox px |
| `autoScroll` | `true` | scroll container와 window 자동 스크롤 |
| `accept` | 항상 허용 | destination 수신 여부 |

기본 ignore selector는 다음 요소를 포함한다.

```css
input,
textarea,
select,
button,
a[href],
[contenteditable="true"],
[data-comins-sortable-ignore]
```

명시적인 handle에서 시작한 pointer는 handle을 우선한다. `accept`와
`onBeforeDragStart`는 동기 callback만 허용하고 Promise를 지원하지 않는다.

## 12. Drag Session

상태 전이는 다음으로 제한한다.

```text
idle → pending → dragging → committing → idle
                ↘ cancelling → idle
```

- primary pointer만 drag activation 대상으로 삼는다.
- `pointerdown`에서 바로 시작하지 않고 `activationDistance`를 통과할 때 시작한다.
- activation 직전 source area, item ID, index, DOM parent/next sibling, 수정할 inline
  style을 snapshot한다.
- active session listener는 하나의 `AbortController`로 관리한다.
- pointer capture를 사용하며 `pointerup`, `pointercancel`, Escape, window blur,
  document 비활성화, unmount와 destroy를 종료 신호로 처리한다.

## 13. Placeholder와 Feedback

- session당 Placeholder는 하나만 생성한다.
- source와 같은 tag를 사용하되 child, ID, text, form value를 복제하지 않는다.
- source의 `DOMRect`를 기준으로 width와 height만 설정한다.
- `aria-hidden="true"`와 namespace된 class/data attribute를 사용한다.
- source element는 기본적으로 reparent 또는 deep clone하지 않고 임시 feedback
  style로 pointer를 따라간다.
- Placeholder만 현재 candidate location으로 이동한다.
- framework commit이 확인될 때까지 Placeholder를 유지하고 이후 정리한다.

```html
<div
  class="comins-sortable__placeholder"
  data-comins-sortable-placeholder
  aria-hidden="true"
></div>
```

v1은 custom placeholder renderer와 drag overlay API를 제공하지 않는다. 소비자는
namespace된 class, data attribute, CSS custom property로 시각 표현을 변경한다.

## 14. Area와 삽입 Index 판정

1. `elementsFromPoint(clientX, clientY)`로 pointer 아래 등록 area를 찾는다.
2. 직접 hit된 area가 없으면 등록된 빈 area의 확장된 rect를 fallback으로 검사한다.
3. 같은 Scope, group, `accept`를 통과한 area만 후보로 사용한다.
4. v1은 nested area를 지원하지 않으므로 가장 안쪽 유효 area 하나를 선택한다.
5. Placeholder와 source를 제외한 direct item들의 `DOMRect`를 측정한다.
6. 주축의 item 중심점과 pointer를 비교해 앞 또는 뒤 index를 정한다.

`direction: "auto"`는 첫 두 item 중심의 x/y 차이 중 큰 축을 선택한다. item이 두 개
미만이면 vertical을 사용한다. Grid와 자유 좌표는 처리하지 않는다.

가변 크기 item과 CSS gap은 실제 rect와 중심점을 사용한다. source를 제외한 목록을
기준으로 index를 계산해 같은 area reorder의 off-by-one 보정을 별도 노출하지 않는다.

빈 area에 pointer가 들어오면 index는 `0`이다. 주축 크기가 0인 빈 area도 선택할 수
있도록 `emptyInsertThreshold`만큼 hitbox를 확장한다. 양 축이 모두 0이거나 렌더 트리에
없는 area는 후보에서 제외하며 강제 `min-height` CSS는 추가하지 않는다.

geometry는 area 진입 시 측정하고 scroll, resize, adapter의 item 갱신 시 dirty 처리한다.
pointer 이동과 `onDrag`는 animation frame당 최대 한 번 처리한다. auto-scroll 후에는
영향받은 scroll container의 geometry만 다시 계산한다.

## 15. Event 계약

```ts
interface PointerSnapshot {
  type: "mouse" | "touch" | "pen";
  clientX: number;
  clientY: number;
  deltaX: number;
  deltaY: number;
}

interface DragContext {
  itemId: SortableId;
  source: SortableLocation;
  destination: SortableLocation | null;
  pointer: PointerSnapshot;
}

interface InsertDragAreaEvent extends DragContext {
  previousDestination: SortableLocation | null;
  destination: SortableLocation;
}
```

이벤트 순서는 다음과 같다.

1. `onBeforeDragStart(context)`
   - `false`를 반환하면 activation하지 않는다.
   - activation되지 않은 attempt에는 `onAfterDrag`가 발생하지 않는다.
2. `onDragStart(context)`
   - threshold를 통과하고 Placeholder를 만든 후 한 번 호출한다.
3. `onDrag(context)`
   - animation frame당 최대 한 번 호출하며 데이터 순서를 변경하지 않는다.
4. `onInsertDragArea(event)`
   - Placeholder의 area ID 또는 index가 변경될 때만 호출한다.
5. `onChange(change)`
   - 유효한 drop의 adapter update와 함께 정확히 한 번 호출한다.
6. `onAfterDrag(result)`
   - 활성화된 session의 cleanup 후 정확히 한 번 호출한다.

```ts
interface AfterDragResult {
  status: "dropped" | "cancelled" | "rejected";
  reason:
    | "drop"
    | "outside"
    | "pointer-cancel"
    | "escape"
    | "blur"
    | "disabled"
    | "not-accepted"
    | "unmounted"
    | "state-not-committed"
    | "destroyed"
    | "error";
  change?: SortableChange;
}
```

`add`, `remove`, `update`와 같이 하나의 transfer를 여러 상태 변경 이벤트로 나누지
않는다. `onInsertDragArea`는 Placeholder 위치 알림이며 상태를 commit하지 않는다.
Core와 Vanilla의 `onChange`는 `SortableChange`, framework Root의 `onChange`는
`FrameworkSortableChange<T>`를 받는다. Framework area의 상태 callback은 해당 area의
`updates` 항목에 있는 `items`만 받는다.

- `dropped`: `drop`
- `cancelled`: `outside`, `pointer-cancel`, `escape`, `blur`, `unmounted`,
  `destroyed`, `error`
- `rejected`: `disabled`, `not-accepted`, `state-not-committed`

## 16. Commit과 Rollback

유효한 drop은 다음과 같이 처리한다.

- Core가 하나의 reorder 또는 transfer change를 계산한다.
- Vanilla는 source DOM을 Placeholder 위치로 옮긴다.
- framework adapter는 source/destination 상태 callback을 호출한다.
- Root/controller의 `onChange`를 한 번 호출한다.
- Vanilla DOM 또는 framework의 다음 render 순서를 확인한다.
- 확인되면 feedback과 Placeholder를 제거하고 `dropped`로 종료한다.

다음 조건은 rollback한다.

- 유효 area 밖의 pointerup
- pointer cancellation 또는 Escape
- window blur 또는 document 비활성화
- disabled 또는 `accept` 거부
- source/destination unmount
- framework state 미반영
- `destroy()`
- 중복 또는 누락 ID
- lifecycle callback 예외

Rollback은 원래 parent/index와 변경한 inline style을 복구하고 Placeholder, pointer
capture, auto-scroll, listener, observer와 rAF를 모두 정리한다.

## 17. 오류 처리

설정 단계의 오류는 동기적으로 `SortableError`를 throw한다.

```text
INVALID_ELEMENT
DUPLICATE_AREA_ID
DUPLICATE_ITEM_ID
MISSING_ITEM_ID
INVALID_OPTION
```

interaction 단계 오류는 다음 순서로 처리한다.

1. session과 DOM rollback
2. `onAfterDrag({ status: "cancelled", reason: "error" })`
3. `onError(error)` 호출
4. handler가 없으면 `reportError(error)`, 미지원 환경에서는 microtask rethrow

`onBeforeDragStart` 예외처럼 activation 전 발생한 오류는 pending 상태만 정리하고
`onError`로 전달하며 `onAfterDrag`를 호출하지 않는다. 활성 session의 lifecycle
callback 예외에만 위 rollback 순서를 적용한다. `onAfterDrag` 자체 예외는 이미 끝난
cleanup을 반복하지 않고 `onError`로 전달한다.

library는 임의로 console에 출력하지 않는다. 오류에는 item data, DOM text, raw
selector 또는 raw event를 포함하지 않는다. `not-accepted`와
`state-not-committed`는 설정 오류가 아니라 정상적인 rejected 결과다.

등록 또는 `updateArea()` 시점에 확인할 수 있는 ID 오류는 동기적으로 throw한다.
Vanilla DOM이 외부에서 변경되어 activation 시점에 처음 발견된 ID 오류는 session을
시작하지 않고 `onError`로 전달한다.

## 18. CSS와 Customization

CSS는 `.comins-sortable-*`과 `data-comins-sortable-*` namespace만 사용한다.
global reset, element selector, framework-specific class를 추가하지 않는다.

`styles.css`는 Placeholder, dragging cursor, pointer-events와 reduced-motion 같은 최소
시각 규칙만 제공한다. 동작에 필요한 rect와 feedback 좌표는 engine이 임시 inline
style로 적용하고 원래 값을 정확히 복원한다.

사용자는 다음 selector로 상태를 변경할 수 있다.

```css
[data-comins-sortable-area]
[data-comins-sortable-dragging]
[data-comins-sortable-over]
[data-comins-sortable-placeholder]
```

## 19. 접근성 경계

v1은 pointer-first로 제공하고 완전한 keyboard accessibility를 주장하지 않는다.
keyboard sorting sensor와 live region은 후속 범위다.

v1이 제공하는 접근성 기반은 다음과 같다.

- Pointer drag 중 Escape 취소
- drop 또는 rollback 후 기존 item/handle focus 복원
- Placeholder `aria-hidden="true"`
- consumer의 semantic element와 ARIA attribute 보존
- `prefers-reduced-motion`에서 feedback transition 제거
- custom 이동 버튼이 사용할 수 있는 `reorder()`와 `transfer()` helper 예제
- handle의 접근 가능한 이름은 consumer가 제공하도록 문서화

deprecated `aria-grabbed`, `aria-dropeffect`, 임의 role 또는 positive tabindex를 자동
주입하지 않는다.

## 20. 보안과 개인정보

- network request, telemetry, storage, cookie를 사용하지 않는다.
- `eval`, `new Function`, `innerHTML`을 사용하지 않는다.
- source와 Placeholder를 deep clone하지 않는다.
- raw PointerEvent와 DOM text를 session 밖에 보관하지 않는다.
- ID 저장소는 일반 object가 아닌 `Map`을 사용한다.
- DOM 참조는 가능한 범위에서 `WeakMap`을 사용한다.
- callback 예외 시 cleanup을 먼저 수행한다.
- 오류 출력은 값이 아닌 error code와 안전한 context만 사용한다.
- runtime dependency를 추가하지 않는다.
- package artifact에 local absolute path, personal data, credential, 불필요한 개발
  산출물이 포함되지 않도록 Comins gate를 적용한다.

## 21. 성능과 메모리

- 전역 singleton과 영구 document-level drag listener를 사용하지 않는다.
- idle 상태에는 area별 delegated pointerdown listener만 유지한다.
- active listener는 단일 `AbortController`로 제거한다.
- geometry cache, snapshot과 pointer state는 `onAfterDrag` 전에 해제한다.
- pointer 이동 중 forced layout을 매 event마다 실행하지 않는다.
- 정렬된 item 중심점으로 insertion index를 탐색한다.
- auto-scroll과 geometry 측정은 하나의 rAF loop로 조정한다.
- default MutationObserver와 DOM deep clone을 사용하지 않는다.

환경 의존 heap 증가량을 고정 숫자 release gate로 두지 않는다. 반복
drag/cancel/mount/unmount 후 다음 resource 불변조건을 검증한다.

- orphan Placeholder 0개
- active rAF 0개
- active session listener 0개
- unregister된 area/item strong reference 0개
- active scroll/resize observer 0개

## 22. 지원 및 검증 경계

필수 browser automation은 Chromium, Firefox, Playwright WebKit이다. WebKit 통과는
engine compatibility evidence이며 실제 Safari certification이 아니다. Safari 지원
문구는 실제 Safari 검증 이후 별도 승인한다. 물리적 mobile touch와 pen도 실제 장치
검증 전에는 Pointer Events 기반 호환으로만 기술한다.

| 계층 | 필수 검증 |
|---|---|
| Core | reorder, transfer, index, 불변성, state machine, event 순서 |
| Vanilla | 단일·복수·빈 area, handle, ignore, disabled, accept, rollback |
| Browser | vertical, horizontal, 가변 크기, auto-scroll, pointer cancel |
| React | controlled update, Strict Mode, transfer batching, unmount |
| Vue | `v-model`, source/destination 동시 갱신, mount/unmount |
| Svelte | action update/destroy, 공유 Scope, 미반영 rollback |
| SSR·type | 모든 subpath import, public type compile, peer 범위 |
| Resource | 반복 drag/cancel/destroy 후 listener·DOM·rAF 정리 |
| Artifact | exports, ESM, CSS, license, sensitive-data 검사 |

실제 package boundary를 만드는 구현 전까지 repository baseline은 다음 명령이다.

```sh
node scripts/check-licenses.mjs
node --test test/*.node.mjs
```

package 생성 이후의 npm script, build tool과 exact-artifact gate는 별도 구현 계획에서
결정하며 이 설계 문서가 임의의 publish gate를 생성하지 않는다.

## 23. v1 완료 조건

v1 구현 완료를 주장하려면 다음 조건을 모두 충족해야 한다.

- 동일 Core로 Vanilla, React, Vue, Svelte 최소 예제가 동작한다.
- 단일 area reorder와 복수 area transfer가 같은 change 계약을 사용한다.
- pointer 위치에 따라 Placeholder가 정확한 index로 이동한다.
- 빈 destination은 index `0`을 제공한다.
- drop, cancel, reject, unmount, destroy에서 DOM과 resource가 복구된다.
- lifecycle event 순서와 정확한 호출 횟수가 검증된다.
- source와 destination state update가 하나의 transfer로 관찰된다.
- Chromium, Firefox, WebKit automation이 통과한다.
- type, SSR import, build, resource, security와 artifact 검증이 통과한다.
- 좌표 기반 Layout, clone, multidrag, tree, keyboard sorting이 포함되지 않는다.
- 사용자 문서가 pointer-first 및 Safari·mobile certification 경계를 정확히 설명한다.
- publish, tag와 Release는 별도 승인 전 수행하지 않는다.

## 24. 후속 후보

v1 안정화와 별도 설계 승인 이후에만 다음을 검토한다.

- keyboard sorting sensor, live region과 locale 가능한 안내문
- custom Placeholder 또는 drag overlay renderer
- React hook, Vue composable/directive, Svelte component/attachment
- clone/copy와 multidrag
- nested/tree 및 virtualization integration
- 실제 Safari와 physical mobile/pen certification

이 항목들은 현재 public contract나 v1 완료 조건이 아니다.
