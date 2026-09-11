# Comins Sortable Documentation

This directory separates current user guidance from historical implementation
plans and design records.

이 디렉터리는 현재 사용자 가이드와 과거 구현 계획·설계 기록을 분리합니다.

The user guides describe the `0.1.2` candidate on `main`. npm currently serves
`0.1.1`; use the repository Playground to try multi-drag, thresholds, grid, and
swap before 0.1.2 is published.

사용자 가이드는 `main`의 `0.1.2` 후보를 기준으로 합니다. 현재 npm 배포본은
`0.1.1`이므로 새 고급 정렬 기능은 저장소 Playground에서 확인합니다.

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

## Verification records

- [0.1.2 merged runtime, browser evidence, and publication boundary](./verification/0.1.2-release-candidate.md)
- [0.1.2 performance and memory verification](./verification/0.1.2-performance.md)
- [0.1.2 test gap audit](./verification/0.1.2-test-gap-audit.md)
- [Playground GIF source and capture details](./playground-preview.md)

The performance investigation and test gap audit are historical records. The
candidate record above identifies the latest merged runtime and its evidence.

성능 조사와 테스트 누락 분석은 과거 기록입니다. 최신 병합 런타임과 검증 범위는
위의 0.1.2 후보 기록에서 확인합니다.

## Historical records

`superpowers/specs` and `superpowers/plans` preserve decisions and evidence from
their recorded implementation stages. They are not current user guides.

`superpowers/specs`와 `superpowers/plans`는 당시 구현 단계의 결정과 증거를
보존하는 이력 문서이며 현재 사용자 가이드가 아닙니다.
