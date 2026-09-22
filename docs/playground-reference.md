# Playground reference and source files

## 한국어

DOC 사이트에서 예제를 인용할 때는 **경로, 어댑터, 언어, 검증한 소스 버전**을 함께
기록합니다. 메타데이터를 재사용할 때는 `scenarioById(exampleId, adapterId)`의
반환값을 사용합니다. 공통 목록의 설명·API 필드를 그대로 가져오면 어댑터별 보정이
누락됩니다. 같은 드래그 결과라도 상태를 관리하는 방법과 공개 API 이름은 다릅니다.

| 주제 | React | Vue | Svelte | Vanilla |
| --- | --- | --- | --- | --- |
| 목록 데이터 | `items`, `onItemsChange` | `modelValue`, `update:modelValue` | `items`, `onItemsChange` | DOM `item` selector, `onChange` |
| Host 연결 | `as`, ref, `areaProps` | `tag`, `componentProps` | `use:sortable` | `createSortable(element)` |
| 복제 | `copyItem` | `copyItem` | `copyItem` | `copyElement` |
| `nested-controlled` | 배열 갱신 | 배열 갱신 | 배열 갱신 | DOM 재배치, `refreshArea` |
| 트리 이동 | `updateArea` | `updateArea` | `updateArea` | `applyChange` |

트리의 자식 순서 뒤집기는 네 어댑터 모두 `updateArea`를 사용하는 공통 helper를
거칩니다. 일반 중첩 목록의 순환 방지와 트리의 하위 항목 보존을 같은 기능으로
설명하지 않습니다. 보조키 복제는 네 어댑터 모두 **Alt/Option**입니다.

**코드 보기**의 `main.ts`는 선택한 예제와 언어로 어댑터를 실행하는 진입 코드입니다.
나머지는 실제 Playground의 공통 어댑터와 보조 파일이며, 라이브러리 import 경로만
공개 패키지 경로로 변환합니다. 각 파일의 상대 경로를 그대로 유지해야 합니다.
`demo-data.ts`는 초기 데이터와 트리 helper를 포함하며, Svelte 트리 렌더링은 별도의
`SvelteTreeArea.svelte`에 있습니다. `.tsx`, `.svelte`, `.ts` 파일명을 구분합니다.

사용 조건:

- 예제를 확인한 소스에 대응하는 `comins-sortable` 패키지를 사용합니다. 미발행 로컬
  후보 버전은 같은 체크아웃으로 만든 패키지로 확인하며, npm에 게시된 것으로 간주하지 않습니다.
- Vite의 TypeScript 및 `?raw` 처리를 사용합니다. React에는 React·React DOM과 TSX
  automatic JSX 설정, Vue에는 Vue, Svelte에는 Svelte 및 `.svelte` 컴파일 설정이 필요합니다.
- `styles.css`는 공개 패키지 CSS와 데모의 전역 스타일을 포함합니다. 기존 서비스에
  통합할 때는 필요한 `.cs-demo-*` 스타일을 추려 사용합니다.
- DOM 컨테이너가 준비된 후 `main.ts`의 `mountExample(container, bridge)`를 호출합니다.
  `bridge`에는 `publishModel`, `publishEvent`, `publishOperation` 함수를 전달합니다.
  반환된 handle의 `dispatch`, `reset`, `setLocale`, `destroy`로 조작과 수명주기를 연결합니다.

파일 선택 목록은 한 파일만 복사하여 실행하는 최소 예제가 아닙니다. DOC 사이트에서는
전체 파일 구성을 제공하거나 필요한 동작만 추린 별도의 예제를 작성·검증합니다.
언어 전환은 현재 정렬과 선택을 유지하고 안내 문구를 갱신합니다. Research·Design 같은
카드 데이터 이름은 번역 대상이 아닙니다.

`handle` 경로는 **드래그 시작 영역**이며 전용 핸들·제목·전체 카드 모드를 비교합니다.
`transition`은 **전환 효과**, `custom-placeholder`는 **드롭 피드백 스타일**입니다.
후자는 두 목록에서 기본/사용자 CSS와 대상 수락 여부를 비교합니다. 거부 시에는
Placeholder를 숨기고 대상·드래그 요소를 표시합니다. DOC 사이트의 모든 예제에서
핸들만 지원한다고 설명하거나 거부 표시를 Placeholder와 동일시하지 않습니다.
2026-09-22 [GIF](./playground-preview.md)는 슬롯 복귀, 드래그 시작 영역, 피드백 CSS,
목록별 상태 갱신과 하위 트리 이동을 실제 Chromium에서 촬영했습니다. 모든 예제나
Safari 결과를 대표하지 않습니다. Safari 제목 드래그의 선택 잔류는
[핸들 가이드](./ko/09-handle-acceptance.md)의 미해결 제한으로 함께 안내합니다.

## English

Record the route, adapter, locale, and validated source version when citing a
Playground example. Resolve metadata through `scenarioById(exampleId, adapterId)`;
reading the shared list directly skips adapter-specific descriptions and APIs.
Matching drag results do not imply matching APIs or state
ownership. The table above lists the adapter boundaries: Vanilla registers and
reorders DOM, while React, Vue, and Svelte control list arrays. Tree transfers use
`updateArea` in framework adapters and `applyChange` in Vanilla. The shared tree
Reverse children helper uses `updateArea` in all four adapters. Modifier copy
uses **Alt/Option**.

**View code** provides a route-specific `main.ts`, the shared adapter, and its
supporting files. Only library import paths are converted to public package
imports. Preserve the file layout, including `demo-data.ts` and the recursive
`SvelteTreeArea.svelte`. This is a multi-file example, not a standalone snippet.

Use a package matching the validated source; a local unreleased candidate is not
an npm publication. The example requires Vite TypeScript and `?raw` support,
React/React DOM with automatic TSX compilation, Vue, or Svelte with `.svelte`
compilation as appropriate. The demo stylesheet includes global page styles;
select the `.cs-demo-*` rules needed when integrating into an existing app.

Call `mountExample(container, bridge)` after the DOM container exists. Supply
`publishModel`, `publishEvent`, and `publishOperation` callbacks on the bridge.
Use the returned handle for controls, reset, locale updates, and destruction.
For a documentation site, provide the complete file set or separately validate
a reduced example. Switching languages preserves order and selection; fixture
item names such as Research and Design remain unchanged.

The stable `handle` route now compares handle, title, and whole-card activation.
`transition` is Sorting animation; `custom-placeholder` is Drop feedback styles,
comparing default/custom CSS and acceptance across two lists. Rejection hides
its placeholder and marks the target and dragged element separately. Do not
present the library as handle-only or conflate rejection with its placeholder.
The [2026-09-22 GIF](./playground-preview.md) captures slots, drag start modes,
feedback CSS, per-list state updates, and subtree movement in Chromium. It does
not cover every example or represent Safari behavior. Keep the open Safari
title-drag selection issue from the [handle guide](./user/09-handle-acceptance.md)
when adapting this material for a documentation site.
