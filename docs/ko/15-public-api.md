# Public API 레퍼런스

이 문서는 package entry point와 공개 값·타입을 열거합니다. 기능별 동작과 전체
예제는 각 기능 가이드를 따릅니다. 이 문서에 없는 export는 내부 구현으로
취급합니다.

## `comins-sortable`

root entry는 Vanilla JavaScript 어댑터입니다.

- `createSortable`: Vanilla sortable instance와 DOM transaction 경계를
  생성합니다.
- `Sortable`: area 등록, refresh, 취소, 여러 번 호출해도 안전한 destroy를
  포함하는 반환 instance입니다.
- `VanillaSortableOptions`: root 생성 option입니다.
- `VanillaSortableAreaOptions`: 최초 area option입니다.
- `VanillaSortableAreaPatch`: 지원되는 area update입니다.

[Vanilla JavaScript 어댑터](./03-vanilla.md)를 참고합니다.

## `comins-sortable/core`

Core는 framework 중립 operation, lifecycle 소유권, 오류와 headless Tree model을
제공합니다.

### 공개 값

- `SortableError`: `SortableErrorCode` code를 노출하는 안정적인 공개 오류입니다.
- `reorder`: 같은 area의 immutable order를 반환합니다.
- `transfer`: immutable source·destination order를 반환합니다.
- `buildCopyChange`: source를 제거하지 않고 typed copy change를 준비합니다.
- `createSortableScope`: instance-local sortable lifecycle scope를 생성합니다.
- `createSortableTree`: immutable tree를 sortable area로 변환하고 area change를
  tree에 다시 반영합니다.

### 공개 타입

- Lifecycle·오류: `SortableErrorCode`, `AfterDragReason`, `AfterDragResult`,
  `DragContext`, `PointerSnapshot`, `InsertDragAreaEvent`.
- 식별자·위치: `ItemKey`, `SortableId`, `SortableLocation`,
  `SortableParentLocation`, `SortableOrder`.
- Scope·area: `SortableScope`, `SortableScopeOptions`, `SortableAreaOptions`,
  `SortableAreaPatch`, `SortableAreaUpdate`.
- Group·transfer: `SortableGroup`, `SortableGroupOptions`,
  `SortableTransferMode`, `CopyItem`, `CopyItemContext`.
- Change: `SortableChange`, `SortableMoveChange`, `SortableReorderChange`,
  `SortableTransferChange`, `SortableCopyChange`, `FrameworkSortableChange`.
  다중 드래그 change는 `itemIds`도 노출하며 swap change는
  `SortableSwapChange`와 `swapItemId`를 사용합니다.
- 표현: `SortableDirection`, `SortableAnimation`, `SortableAnimationOptions`,
  `SortablePlaceholderOptions`, `SortablePlaceholderPreset`.
- Tree: `SortableTree`, `SortableTreeArea`, `SortableTreeOptions`.

[핵심 개념](./02-core-concepts.md), [정렬과 이동](./07-reorder-transfer.md),
[복제](./08-copy-clone.md), [중첩 목록과 Tree](./12-nested-tree.md),
[Lifecycle과 오류](./14-lifecycle-errors.md)를 참고합니다.
[고급 정렬](./16-advanced-sorting.md)은 다중 선택, threshold, grid 충돌,
swap 동작을 설명합니다.

## `comins-sortable/react`

- `SortableRoot`: 공유되는 제어형 React scope를 소유합니다.
- `SortableArea`: 하나의 제어형 React area를 등록합니다.
- `SortableRootProps`: root lifecycle·change prop입니다.
- `SortableAreaProps`: area 데이터, 식별자, render와 동작 prop입니다.

[React 어댑터](./04-react.md)를 참고합니다.

## `comins-sortable/vue`

- `SortableRoot`: 공유되는 제어형 Vue scope를 소유합니다.
- `SortableArea`: 하나의 제어형 Vue area를 등록합니다.
- `VueSortableRootComponent`, `VueSortableRootProps`, `VueSortableRootSlots`,
  `VueSortableRootOptions`: typed root component contract입니다.
- `VueSortableAreaComponent`, `VueSortableAreaProps`, `VueSortableAreaSlots`:
  typed area component contract입니다.

[Vue 어댑터](./05-vue.md)를 참고합니다.

## `comins-sortable/svelte`

- `createSortableScope`: 여러 Svelte action이 공유하는 scope를 생성합니다.
- `sortable`: Svelte action입니다.
- `SvelteActionReturn`: action의 update·destroy contract입니다.
- `SvelteSortableOptions`: action 하나의 area·lifecycle option입니다.
- `SvelteSortableScope`, `SvelteSortableScopeOptions`: 공유 scope contract입니다.

[Svelte 어댑터](./06-svelte.md)를 참고합니다.

## `comins-sortable/styles.css`

공개 base style과 선택 가능한 placeholder preset을 사용하려면 이 entry를
import합니다. 선언된 유일한 side-effect entry입니다.
[Placeholder 스타일](./13-placeholder.md)을 참고합니다.

## 지원 경계

모든 entry point는 ESM이며 ES2020을 대상으로 합니다. React, React DOM, Vue,
Svelte는 optional peer dependency이고 package의 runtime dependency는 0개입니다.
브라우저 증거와 인증 범위는 저장소 [README](../../README.md#browser-evidence)에서
관리합니다.
