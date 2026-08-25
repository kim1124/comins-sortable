# Comins Sortable Playground And Feature Parity Design

## 1. 목적

`comins-sortable`은 두 조건을 동시에 만족해야 한다.

1. Playground는 `comins-table`과 `comins-grid-layout`처럼 사용자가 직접 기능을
   탐색하고 상태를 확인할 수 있는 독립 소비자 애플리케이션이어야 한다.
2. Sortable 제품 기능은 Vue.Draggable의 공개 예제에서 증명되는 기능과 동등하거나
   그 이상이어야 하며, Vanilla, React, Vue, Svelte가 하나의 Core 계약을 공유해야 한다.

Playground 외형만 완성하거나 현재 기능만 예제로 옮기는 것은 완료가 아니다. 예제는
제품 기능을 실제 consumer 코드로 증명하는 acceptance surface다.

이 문서는 기존
`docs/superpowers/specs/2026-08-07-comins-sortable-design.md`의 v1 비목표 중
clone/copy, nested/tree, custom host와 framework integration 제한을 대체한다. 기존
pointer lifecycle, controlled transaction, cleanup, security, zero runtime dependency,
release 승인 경계는 유지한다.

## 2. 확인한 기준

### Comins Playground 기준

- `comins-table`: Vite 소비자 앱, 기능별 라우팅, 탐색 셸, live example, 제어 패널,
  public API 사용 예, Playwright 검증
- `comins-grid-layout`: Docs와 Playground 분리, full-width workspace, 기능별 route,
  제어 그룹, 실제 상태 출력, 한국어/영어 전환, 접근성 및 브라우저 검증

### 기능 parity 기준

Vue.Draggable의 공개 예제와 source를 기준으로 다음 17개 example contract를
확인했다.

- Live examples: <https://sortablejs.github.io/Vue.Draggable/#/simple>
- Example source: <https://github.com/SortableJS/Vue.Draggable/tree/master/example/components>

1. Simple
2. Two Lists
3. Clone
4. Custom Clone
5. Clone on Control
6. Handle
7. Transition
8. Transitions
9. Table
10. Table Column
11. Third party
12. Footer slot
13. Header slot
14. Two list header slot
15. Nested
16. Nested controlled state
17. Functional third party

기능 parity는 Vue 전용 prop 이름을 복제하는 것이 아니다. 각 example이 증명하는
동작을 framework-neutral Core와 각 framework에 자연스러운 public API로 제공한다.

## 3. 접근 방식

### 선택안: Playground shell 우선 수직 구현

먼저 확인 가능한 Playground shell과 현재 지원 예제를 제공한다. 이후 각 신규 기능을
Core operation, DOM lifecycle, 네 adapter, Playground example, browser gate까지 하나의
수직 단위로 완료한다.

이 방식은 사용자가 초기 동작 결과부터 확인할 수 있고, demo가 아직 없는 product API나
product API 없이 흉내만 내는 demo가 생기는 것을 방지한다.

### 배제안 A: 기능 전체 구현 후 Playground 일괄 개발

기능 계약을 먼저 완성할 수 있지만 사용자 확인 시점이 너무 늦다. 이번 우선순위와
맞지 않는다.

### 배제안 B: Playground에서 기능을 독립적으로 모사

화면은 빠르게 만들 수 있지만 실제 package와 example behavior가 분리된다. Playground를
제품 acceptance surface로 사용한다는 목표와 충돌한다.

## 4. Playground 정보 구조

### 4.1 Route

Playground는 Vite 소비자 앱으로 제공한다.

- 개발 명령: `npm run dev`
- 기본 주소: `http://127.0.0.1:4003`
- canonical route: `/examples/:exampleId/:adapterId`
- `adapterId`: `vanilla | react | vue | svelte`
- `/`와 알 수 없는 route는 `/examples/simple/react`로 이동한다.
- route는 reload와 직접 접근이 가능해야 한다.

기존 Task 11 최소 fixture는 low-level browser regression surface로 유지한다. 사용자가
보는 Playground와 테스트 전용 fixture를 같은 화면으로 취급하지 않는다. fixture route는
`/fixtures/:adapterId`로 격리한다.

### 4.2 Shell

화면은 다음 순서를 유지한다.

1. Comins Sortable brand header
2. example navigation
3. framework adapter tabs
4. example title, 설명, 지원 API 요약
5. action/options control panel
6. 실제 drag workspace
7. controlled model JSON
8. event timeline과 last operation
9. adapter별 source code viewer

데스크톱은 workspace와 state inspector를 병렬 배치한다. 900px 이하에서는 하나의
열로 전환하고, 360px viewport에서 가로 page overflow가 없어야 한다.

### 4.3 실제 adapter runtime

Playground shell은 React로 작성하되 demo 자체를 React로 모사하지 않는다. adapter별
module은 동일한 private harness contract를 구현한다.

```ts
type PlaygroundAdapterId = 'vanilla' | 'react' | 'vue' | 'svelte';

interface PlaygroundDemoModule {
  mount(
    container: HTMLElement,
    input: PlaygroundDemoInput,
    bridge: PlaygroundBridge,
  ): Promise<PlaygroundDemoHandle> | PlaygroundDemoHandle;
}

interface PlaygroundDemoHandle {
  dispatch(controlId: string, value?: string | number | boolean): void;
  reset(): void;
  destroy(): void;
}

interface PlaygroundBridge {
  publishModel(model: unknown): void;
  publishEvent(event: PlaygroundEvent): void;
  publishOperation(operation: SortableChange | null): void;
}
```

- Vanilla module은 public `createSortable` 또는 `createSortableScope`를 사용한다.
- React module은 실제 `SortableRoot`와 `SortableArea`를 별도 React root에 mount한다.
- Vue module은 실제 `createApp`, `SortableRoot`, `SortableArea`를 사용한다.
- Svelte module은 실제 compiled component와 `use:sortable` action을 사용한다.
- adapter 전환 시 이전 handle의 `destroy()`를 먼저 호출한 뒤 target을 비우고 다음
  runtime을 mount한다.
- shell control panel은 example registry의 control definition을 렌더하고 현재 handle의
  `dispatch()`로만 명령을 전달한다. 알 수 없는 control ID는 실행하지 않는다.
- bridge에는 ID, order, lifecycle name, status/reason만 전달한다. raw Event, DOM node,
  component instance, consumer text 전체를 노출하지 않는다.

### 4.4 코드 보기

`View code`는 현재 선택한 example과 adapter의 실제 consumer source를 Vite raw import로
표시한다. 별도의 축약 pseudocode를 사용하지 않는다. source viewer는 읽기 전용이며,
copy 동작은 사용자 클릭으로만 수행한다.

### 4.5 지역화와 접근성

- 기본 locale은 `ko`, 선택값은 `ko | en`만 허용한다.
- 저장 key는 `comins-sortable-playground-locale`이다.
- locale 전환은 현재 example, adapter, model state를 유지한다.
- `<html lang>`과 visible copy를 같은 render에서 갱신한다.
- tab은 tablist/tab/tabpanel 의미를 제공하고 keyboard focus가 표시되어야 한다.
- consumer가 제공한 list/listitem/table semantics를 library가 덮어쓰지 않는다.
- drag handle에는 consumer가 접근 가능한 이름을 제공한다.
- `prefers-reduced-motion`에서는 drag와 layout animation을 제거한다.

## 5. 기능 계약

### 5.1 기존 기능

다음은 현재 구현을 유지하고 example로 승격한다.

- 단일 area reorder
- 동일 group의 다중 area transfer
- controlled immutable state update
- handle, ignore, disabled
- synchronous accept/reject
- vertical, horizontal, auto direction
- empty destination index 0
- auto-scroll
- lifecycle callback과 cleanup-first rollback
- pointer cancel, Escape, blur, unmount, destroy, callback error 처리

### 5.2 Move와 Copy

`group`은 기존 string과 확장 object를 모두 허용한다.

```ts
type SortableTransferMode = 'move' | 'copy';

interface SortableGroupOptions {
  name: string;
  pull?: false | SortableTransferMode |
    ((context: DragContext) => false | SortableTransferMode);
  put?: boolean | readonly string[] |
    ((context: DragContext) => boolean);
}

type SortableGroup = string | SortableGroupOptions;
```

`DragContext.pointer`에는 `altKey`, `ctrlKey`, `metaKey`, `shiftKey`를 추가한다. source의
`pull` callback은 drag activation snapshot을 기준으로 `move`, `copy`, 또는 거부를
선택한다. 이 계약으로 Clone on Control을 구현한다.

framework adapter는 다음 factory를 제공한다.

```ts
interface CopyItemContext extends DragContext {
  destination: SortableLocation;
}

type CopyItem<T> = (item: T, context: CopyItemContext) => T;
```

- copy mode에는 `copyItem`이 필수다.
- factory가 반환한 item의 `itemKey`는 source와 group 전체에서 고유해야 한다.
- source order는 유지하고 destination에 copied item을 삽입한다.
- copy change는 `operation: 'copy'`, `sourceItemId`, 새 `itemId`, source와 destination을
  포함한다.
- copy change의 orders에는 보존된 source order와 새 ID가 삽입된 destination order를
  모두 포함한다.
- factory throw, duplicate ID, state 미반영은 source와 destination을 원상복구하고
  `onAfterDrag`를 정확히 한 번 호출한다.

Vanilla는 `copyElement(source, context)` factory를 사용한다. 반환 element는 직접 item
selector에 일치하고 유효한 새 ID를 제공해야 한다. Core는 arbitrary deep clone을
기본값으로 수행하지 않는다.

### 5.3 Host element, table, third-party component

- React `SortableArea`는 `as`와 `areaProps`를 제공한다.
- Vue `SortableArea`는 `tag`와 `componentProps`를 제공한다.
- Svelte action과 Vanilla controller는 등록된 실제 element를 host로 유지한다.
- framework item VNode/element에는 내부 `data-comins-sortable-item` marker를 추가해
  non-item sibling과 구분한다.
- custom host는 실제 DOM element ref를 전달해야 하며 전달하지 못하면 mount 시
  `INVALID_ELEMENT`로 거부한다.

이 계약으로 `tbody > tr`, `tr > th`, third-party accordion/card/layout component를
동일 Core에 등록한다.

### 5.4 Header, footer와 non-sortable sibling

- React는 `header`와 `footer` ReactNode를 제공한다.
- Vue는 `header`와 `footer` slot을 제공한다.
- Svelte와 Vanilla는 `item` selector로 sortable item만 선택한다.
- header/footer는 item order, child count, geometry와 ID validation에서 제외한다.
- interactive header/footer control은 drag activation을 시작하지 않는다.

### 5.5 Animation과 transition

framework별 transition wrapper에만 의존하지 않고 Core geometry와 adapter layout update가
공유하는 FLIP animation manager를 제공한다.

```ts
interface SortableAnimationOptions {
  duration: number;
  easing?: string;
}

type SortableAnimation = false | number | SortableAnimationOptions;
```

- 숫자는 duration ms다.
- default는 `false`이며 소비자가 opt-in한다.
- programmatic reorder와 drag placeholder 이동 모두 같은 animation resource manager를
  사용한다.
- 새 drag, scroll/resize invalidation, cancel, unmount, destroy에서 기존 animation을
  취소하고 inline style을 복구한다.
- reduced-motion에서는 duration을 0으로 처리한다.

### 5.6 Nested와 tree

Nested sortable은 재귀적으로 등록된 area의 조합으로 제공한다.

```ts
interface SortableParentLocation {
  areaId: string;
  itemId: SortableId;
}

interface SortableAreaOptions {
  parent?: SortableParentLocation;
}
```

- pointer target에서 가장 안쪽 등록 area만 activation을 소유한다.
- 각 child collection은 고유 `areaId`를 가진다.
- `parent` metadata로 item ancestry를 계산한다.
- item을 자기 자신 또는 자기 descendant area로 이동하면 `nested-cycle`로 거부한다.
- `nested-cycle`은 `AfterDragReason`에 추가하고 `status: 'rejected'`로 보고한다.
- 빈 child area는 기존 empty destination 규칙으로 index 0을 제공한다.
- nested transfer도 일반 source/destination binding transaction을 사용한다.
- controlled tree consumer는 area별 items callback을 immutable tree state로 반영한다.

고수준 Tree component는 추가하지 않는다. Core의 nested area 계약과 adapter example로
동등 기능을 제공하며 특정 tree data schema를 package가 소유하지 않는다.

## 6. Data flow

### Move

1. innermost area와 direct item을 찾는다.
2. handle/ignore/disabled와 source pull을 검증한다.
3. pointer 이동으로 destination, direction, index를 계산한다.
4. destination put/accept와 nested cycle을 검증한다.
5. reorder 또는 transfer change를 계산한다.
6. adapter binding이 source/destination state를 같은 transaction에서 갱신한다.
7. 다음 framework render에서 ID order를 검증한다.
8. 성공 시 drop, 실패 시 rollback한다.

### Copy

1. source pull이 copy를 반환한다.
2. destination 확정 후 adapter copy factory를 한 번 호출한다.
3. 새 item ID를 검증한다.
4. source는 보존하고 destination update만 예약한다.
5. render verification 실패나 callback error에서 prepared copy를 폐기하고 rollback한다.

## 7. 오류 및 보안

- invalid selector, host ref, copy factory, duplicate ID, nested cycle은 redacted error code로
  보고한다.
- raw item, DOM text, selector, source code, Event 객체를 error message나 global
  Playground state에 포함하지 않는다.
- callback error는 active session과 DOM resource cleanup 뒤 소비자 `onAfterDrag`와
  `onError` 계약을 따른다.
- source code viewer는 repository에 포함된 example source만 읽고 외부 URL이나 사용자
  입력을 실행하지 않는다.
- Playground는 analytics, telemetry, remote API, persistence를 사용하지 않는다. locale
  외 상태는 reload 시 초기화한다.

## 8. 예제 매핑

| 기준 예제 | Comins 예제 | 제품 계약 |
|---|---|---|
| Simple | Simple | reorder, add/replace, disabled, before move |
| Two Lists | Two Lists | group transfer, controlled state |
| Clone | Clone | pull copy, source preserve |
| Custom Clone | Custom Clone | typed copy factory, unique ID |
| Clone on Control | Modifier Copy | pointer modifier, dynamic pull |
| Handle | Handle & Inputs | handle, ignore interactive controls |
| Transition | Programmatic Transition | external reorder, FLIP |
| Transitions | Drag Animation | placeholder/item animation |
| Table | Table Rows | custom tbody host |
| Table Column | Table Columns | custom tr host, horizontal th |
| Third party | Component Host | custom host props/ref |
| Footer slot | Footer Content | non-item trailing sibling |
| Header slot | Header Content | non-item leading sibling |
| Two list header slot | Group Headers | siblings plus transfer |
| Nested | Nested Lists | recursive areas, cycle prevention |
| Nested controlled state | Controlled Tree | immutable recursive state |
| Functional third party | Nested Component Layout | nested areas plus component hosts |

추가 Comins example은 Empty Destination, Accept/Reject, Auto Direction, Auto Scroll,
Rollback Reasons, Resource Stability, Accessibility를 제공한다.

## 9. 검증

### Unit

- immutable reorder, transfer, copy orders
- copy factory, duplicate copy ID, conditional modifier copy
- custom item selector와 non-item sibling 제외
- nested innermost activation, cross-level move, empty child, cycle rejection
- animation start/cancel/style restoration
- 모든 error path의 cleanup-first와 callback 횟수

### Adapter

- React StrictMode와 custom `as` ref lifecycle
- Vue `tag`, component props, header/footer slots와 controlled model
- Svelte action의 selector/update/destroy와 nested Scope
- Vanilla table, copyElement와 DOM rollback
- 네 adapter의 copy factory와 nested state 결과가 같은 order contract를 생성

### Browser

- 모든 17개 parity example을 실제 네 adapter runtime에서 실행
- Comins 추가 example을 동일 adapter matrix로 실행
- route reload, back/forward, adapter 전환 destroy, locale state 유지
- model JSON, event timeline, View code가 현재 route와 일치
- 360px, 900px, desktop layout과 keyboard tab navigation
- Chromium, Firefox, Playwright WebKit
- 반복 mount/drag/cancel/copy/nested/destroy 뒤 listener, rAF, placeholder 0

Playwright WebKit은 Safari 인증이 아니다. physical touch/pen과 실제 Safari는 별도 승인
및 실제 장치 evidence 전까지 지원 인증으로 표현하지 않는다.

## 10. 전달 순서

1. Playground shell, route, locale, 실제 adapter mount contract
2. 현재 기능의 Simple, Two Lists, Handle, Empty, Accept, Auto Scroll example
3. custom host, non-item sibling, Table, Table Column, component host
4. framework-neutral animation과 Transition examples
5. copy operation, custom copy, modifier copy
6. nested area, cycle prevention, controlled tree
7. 17개 parity matrix와 Comins 추가 example 전체 browser gate
8. package artifact, SSR, consumer closure

각 단계는 동작 가능한 Playground route와 focused browser evidence를 남긴다. 단계 중간
결과는 preview로 보고할 수 있지만, 17개 parity와 추가 example 전체가 통과하기 전에는
기능 parity 완료를 주장하지 않는다.

## 10.1 구현 상태 (2026-08-25)

- 17개 parity example과 3개 Comins 추가 example을 네 adapter runtime에 구현했다.
- animation, custom/table/component host, header/footer sibling, nested 및 controlled nested
  계약을 Core와 adapter public surface에 반영했다.
- Chromium, Firefox, Playwright WebKit 검증을 완료 조건으로 사용한다. 실제 Safari 검증은
  별도 evidence로 남기며, physical touch/pen과 모바일 인증은 후순위로 보류한다.

## 11. 경계

- runtime dependency는 계속 0개다. Vite, React Router와 framework compiler/plugin은
  Playground 개발용 devDependency로만 사용한다.
- public API 변경은 이 설계의 기능에 필요한 최소 범위로 제한한다.
- 외부 source를 복사하지 않고 behavior와 information architecture만 참고한다.
- publish, version, tag, GitHub Release, remote push/PR, CI browser job은 별도 승인 전
  수행하지 않는다.
