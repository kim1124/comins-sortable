# Comins Sortable Documentation

This directory separates current user guidance from historical implementation
plans and design records.

이 디렉터리는 현재 사용자 가이드와 과거 구현 계획·설계 기록을 분리합니다.

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
| [10 Animation and Auto-scroll](./user/10-animation-auto-scroll.md) | [10 애니메이션과 자동 스크롤](./ko/10-animation-auto-scroll.md) | `transition`, `transitions`, `auto-scroll` |
| [11 Custom Hosts and Slots](./user/11-hosts-slots.md) | [11 사용자 host와 slot](./ko/11-hosts-slots.md) | `table`, `table-column`, `third-party`, `footer-slot`, `header-slot`, `two-list-slots` |
| [12 Nested Lists and Tree](./user/12-nested-tree.md) | [12 중첩 목록과 Tree](./ko/12-nested-tree.md) | `nested`, `nested-controlled`, `functional-third-party`, `tree` |
| [13 Placeholder Styling](./user/13-placeholder.md) | [13 Placeholder 스타일](./ko/13-placeholder.md) | `custom-placeholder`, `skeleton-placeholder` |
| [14 Lifecycle and Errors](./user/14-lifecycle-errors.md) | [14 Lifecycle과 오류](./ko/14-lifecycle-errors.md) | all examples |

Every Playground route uses:

```text
http://127.0.0.1:4003/examples/<example>/<adapter>
```

`<adapter>` is `vanilla`, `react`, `vue`, or `svelte`. Use **View code** in the
Playground to compare the same feature across adapters.

## Historical records

`superpowers/specs` and `superpowers/plans` preserve decisions and evidence from
their recorded implementation stages. They are not current user guides.

`superpowers/specs`와 `superpowers/plans`는 당시 구현 단계의 결정과 증거를
보존하는 이력 문서이며 현재 사용자 가이드가 아닙니다.
