# Tree API 및 Placeholder 작업 리포트

- 작업 일시: 2026-08-25 (Asia/Seoul)
- 브랜치: `codex-tree-placeholder`
- 기준: Comins Contract v1.7

## 요약

- framework-neutral 공식 `createSortableTree` public API를 추가했다.
- Area `placeholder` 옵션에 consumer `className`과 `default | skeleton` preset을 추가했다.
- 공개 CSS variable과 reduced-motion skeleton drag feedback을 추가했다.
- Tree, Custom Placeholder, Skeleton Placeholder를 네 adapter Playground에 추가해 전체
  route를 20개에서 23개로 확장했다. desktop parity 기준은 17개로 유지한다.

## 주요 변경 파일

- `src/core/tree.ts`, `src/core/model.ts`, `src/core/feedback.ts`, `src/core/scope.ts`
- `src/react/*`, `src/vue/*`, `src/svelte/sortable.ts`, `src/styles.css`
- `example/src/adapters/*`, `example/src/playground/scenarios.ts`, `example/src/styles.css`
- `README.md`, `CHANGELOG.md`, `docs/superpowers/specs/*`
- `test/unit/core/tree.test.ts`, `test/unit/core/feedback.test.ts`,
  `test/playground/playground.spec.ts`, public type fixtures

## 검증

- `npm run verify`: 통과
  - policy 29/29
  - unit 202/202
  - typecheck, package build, public type fixtures 통과
- 저수준 브라우저 회귀: Chromium, Firefox, Chromium resource project 138/138 통과
- Playground 전체 회귀: Chromium, Firefox 78/78 통과
- 신규 Tree/Placeholder focused matrix: Chromium 8/8, Firefox 8/8 통과

## 잔여 범위

- virtualization은 제외가 아니라 보류다.
- keyboard sorting/accessibility는 구현 목록에서 제외한다.
- actual Safari와 Playwright WebKit 신규 검증은 요청에 따라 수행하지 않았다.
- physical touch/pen 및 모바일 인증은 후순위다. 전체 회귀에 포함된 기존 360px overflow
  test 통과는 모바일 기능 인증으로 해석하지 않는다.
- remote push/PR, merge, publish, version/tag/Release는 수행하지 않았다.
