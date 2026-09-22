# Comins Sortable Documentation

This directory separates current user guidance from historical implementation
plans and design records.

이 디렉터리는 현재 사용자 가이드와 과거 구현 계획·설계 기록을 분리합니다.

The user guides describe Comins Sortable's public APIs. Use the
repository Playground to try multi-drag, thresholds, grid, and swap.

사용자 가이드는 Comins Sortable의 공개 API 사용법을 설명합니다.
저장소 Playground에서 다중 드래그, threshold, grid, swap을 확인할 수 있습니다.

## User guides

| English | 한국어 | Playground examples |
| --- | --- | --- |
| [01 Quick Start](./user/01-quick-start.md) | [01 빠른 시작](./ko/01-quick-start.md) | `simple` |
| [02 Core Concepts](./user/02-core-concepts.md) | [02 핵심 개념](./ko/02-core-concepts.md) | all examples |
| [03 Vanilla JavaScript](./user/03-vanilla.md) | [03 Vanilla JavaScript](./ko/03-vanilla.md) | all examples |
| [04 React](./user/04-react.md) | [04 React](./ko/04-react.md) | all examples |
| [05 Vue](./user/05-vue.md) | [05 Vue](./ko/05-vue.md) | all examples |
| [06 Svelte](./user/06-svelte.md) | [06 Svelte](./ko/06-svelte.md) | all examples |
| [07 Reorder and Transfer](./user/07-reorder-transfer.md) | [07 정렬과 이동](./ko/07-reorder-transfer.md) | `simple`, `two-lists`, `empty`, `accept` |
| [08 Copy and Clone](./user/08-copy-clone.md) | [08 복제](./ko/08-copy-clone.md) | `clone`, `custom-clone`, `modifier-copy` |
| [09 Handle and Acceptance](./user/09-handle-acceptance.md) | [09 핸들과 수락 정책](./ko/09-handle-acceptance.md) | `handle`, `accept` |
| [10 Animation and Auto-scroll](./user/10-animation-auto-scroll.md) | [10 애니메이션과 자동 스크롤](./ko/10-animation-auto-scroll.md) | `transition`, `auto-scroll` |
| [11 Custom Hosts and Slots](./user/11-hosts-slots.md) | [11 사용자 host와 slot](./ko/11-hosts-slots.md) | `third-party`, `footer-slot`, `header-slot`, `two-list-slots` |
| [12 Nested Lists and Tree](./user/12-nested-tree.md) | [12 중첩 목록과 Tree](./ko/12-nested-tree.md) | `nested`, `nested-controlled`, `functional-third-party`, `tree` |
| [13 Placeholder Styling](./user/13-placeholder.md) | [13 Placeholder 스타일](./ko/13-placeholder.md) | `custom-placeholder`, `skeleton-placeholder` |
| [14 Lifecycle and Errors](./user/14-lifecycle-errors.md) | [14 Lifecycle과 오류](./ko/14-lifecycle-errors.md) | all examples |
| [15 Public API Reference](./user/15-public-api.md) | [15 Public API 레퍼런스](./ko/15-public-api.md) | package entry points |
| [16 Advanced Sorting](./user/16-advanced-sorting.md) | [16 고급 정렬](./ko/16-advanced-sorting.md) | `transitions`, `thresholds`, `swap`, `grid`, `swap-grid` |

Every Playground route uses:

```text
http://127.0.0.1:4003/examples/<example>/<adapter>
```

`<adapter>` is `vanilla`, `react`, `vue`, or `svelte`. Use **View code** in the
Playground to compare the same feature across adapters.

There are 25 examples for each of the four adapters. Drag the left handle to
sort, and select the body text to copy it. For multi-drag, modifier-click the
handles. Table-row and table-column demos are no longer included.

네 어댑터 각각에 25개 예제가 있습니다. 정렬은 왼쪽 핸들, 텍스트 선택·복사는
본문에서 수행합니다. 다중 선택은 보조키와 핸들 클릭을 사용합니다.
테이블 행·열 데모는 현재 제공하지 않습니다.

In React, Vue, and Svelte **Per-list state control** (`nested-controlled`), change a child array while
keeping the parent order. In **Subtree movement** (`tree`), move Review under
Design with its descendants. Both examples explain their initial data structure,
steps, and expected results. The [Playground preview](./playground-preview.md)
also shows selection reset and scroll-boundary feedback from the 0.1.3 source.

React·Vue·Svelte의 **목록별 상태 제어**(`nested-controlled`)에서는 부모 순서를 유지하면서 자식 배열을
변경하고, **하위 트리 이동**(`tree`)에서는 Review와 그 하위 항목을 Design 아래로
함께 이동합니다. 각 예제는 초기 구조·조작 순서·기대 결과를 설명합니다.
[Playground 미리보기](./playground-preview.md)에는 0.1.3 소스의 선택 초기화와
스크롤 경계 미리보기 동작도 담았습니다.

## Verification records

- [0.1.3 local validation after the Playground reset and feedback fixes](./verification/0.1.3-local-validation.md)
- [0.1.3 earlier artifact and native Safari preparation record](../reports/2026-09-14-0.1.3-preparation.md)
- [0.1.2 runtime, browser evidence, and publication checks](./verification/0.1.2-release-candidate.md)
- [0.1.2 performance and memory verification](./verification/0.1.2-performance.md)
- [0.1.2 test gap audit](./verification/0.1.2-test-gap-audit.md)
- [Playground GIF source and capture details](./playground-preview.md)

The 0.1.3 local validation record covers the latest reset and feedback fixes.
The earlier preparation record's tarball, consumer, and native Safari checks
predate those fixes. The 0.1.2 records remain historical. The refreshed GIF was
captured from the 0.1.3 working source on 2026-09-16. Local validation and
capture do not establish publication status.

0.1.3 로컬 검증 기록은 최신 초기화·미리보기 수정을 포함합니다. 이전 준비 기록의
tarball·소비자·실제 Safari 검증은 이 수정 전 결과입니다. 0.1.2 기록은 이력으로
유지하고, GIF는 2026-09-16의 0.1.3 작업 소스로 다시 촬영했습니다.
로컬 검증과 촬영이 배포 완료를 의미하지는 않습니다.

## Historical records

`superpowers/specs` and `superpowers/plans` preserve decisions and evidence from
their recorded implementation stages. They are not current user guides.

`superpowers/specs`와 `superpowers/plans`는 당시 구현 단계의 결정과 증거를
보존하는 이력 문서이며 현재 사용자 가이드가 아닙니다.

Vanilla uses **Per-list DOM updates** on the same route: it reorders child DOM
and calls `refreshArea`. The descriptions and API labels follow the selected adapter.

같은 경로의 Vanilla 탭은 **목록별 DOM 갱신**입니다. 자식 DOM을 재배치한 뒤
`refreshArea`를 호출합니다. 설명과 API 표시는 선택한 어댑터를 기준으로 합니다.

See [Playground reference and source files](./playground-reference.md) before reusing
these examples in a documentation site. DOC 사이트에서 참조할 때는 위 문서의
어댑터 구분, 소스 파일 구성과 실행 조건을 함께 확인합니다.
