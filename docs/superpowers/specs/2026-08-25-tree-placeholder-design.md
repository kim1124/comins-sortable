# Tree API 및 Placeholder 설계

## 결정

- Tree는 `createSortableTree`라는 공식 framework-neutral headless API로 제공한다.
- React/Vue/Svelte 전용 Tree component나 package-owned node schema는 추가하지 않는다.
- Placeholder는 Area 옵션의 `className`과 공개 CSS variable로 consumer styling을 허용한다.
- Skeleton은 generic loading UI가 아니라 선택형 drag-feedback preset으로만 제공한다.
- Playground는 Tree, Custom Placeholder, Skeleton Placeholder route를 네 adapter에 제공한다.

## Tree 계약

consumer가 node ID, children read/write, child area ID mapping을 주입한다. 모델은 root 및
child area와 `parent` metadata를 계산하고, `updateArea`와 `applyChange`로 immutable tree를
반환한다. 현재 tree 전체에서 node ID와 area ID는 각각 유일해야 한다. 알 수 없는 area,
중복 ID, 잘못된 callback 결과는 기존 redacted `SortableError` code로 실패한다.

## Placeholder 계약

Core는 source와 같은 tag 및 geometry를 갖는 빈 placeholder를 유지한다. consumer class를
stable class 옆에 추가하며 `data-comins-sortable-placeholder-preset`을 노출한다. 기본
preset은 시각 스타일을 강제하지 않고 공개 CSS variable의 fallback만 제공한다. Skeleton
preset은 CSS animation으로 구현하며 `prefers-reduced-motion: reduce`에서 animation을
제거한다.

## 범위 경계

- 포함: desktop pointer behavior, 네 adapter, package build/type surface, Playground.
- 보류: virtualization.
- 제외: keyboard sorting, physical touch/pen 인증, 모바일 최적화, 실제 Safari 인증.
- 별도 승인: remote push/PR, publish, version/tag/Release.
