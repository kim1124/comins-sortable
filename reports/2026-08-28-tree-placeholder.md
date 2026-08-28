# Tree API 및 Placeholder 최신 main 이식 리포트

- 작업 일시: 2026-08-28 (Asia/Seoul)
- 브랜치: `codex-tree-placeholder-2`
- 기준: `origin/main` (`4892ecf`, comins-sortable 0.1.1 candidate)
- 정책: Comins Contract v1.7

## 요약

- 원격 이력 재작성 전 로컬 `codex-tree-placeholder` 구현을 최신 `origin/main`에서 새
  브랜치로 이식했다.
- framework-neutral `createSortableTree` public API를 추가했다.
- Area `placeholder` 옵션에 consumer `className`과 `default | skeleton` preset을
  추가하고 공개 CSS variable 및 reduced-motion 처리를 제공한다.
- Tree, Custom Placeholder, Skeleton Placeholder route를 네 adapter Playground에
  추가해 전체 route를 20개에서 23개로 확장했다. Vue.Draggable desktop parity 기준은
  17개로 유지한다.
- 신규 API와 route 기록을 실제 도입 대상인 `0.1.1 - Unreleased` CHANGELOG 아래에
  배치했다.

## 주요 변경 파일

- Core: `src/core/tree.ts`, `src/core/model.ts`, `src/core/feedback.ts`,
  `src/core/scope.ts`, `src/core.ts`
- Adapters: `src/react/*`, `src/vue/*`, `src/svelte/sortable.ts`
- Playground: `example/src/adapters/*`, `example/src/app/navigation.ts`,
  `example/src/playground/scenarios.ts`, `example/src/styles.css`
- Public surface: `src/styles.css`, `package-boundary.mjs`, `README.md`, `CHANGELOG.md`
- Tests: Core, framework type fixtures, package boundary, Playground unit/E2E

## 검증

- focused unit: 28/28 통과
- `npm run typecheck`, `npm run build`, `npm run test:types`: 통과
- 신규 Tree/Placeholder focused browser matrix: Chromium, Firefox, Playwright WebKit
  24/24 통과
- `npm run verify`: 통과
  - policy 39/39
  - unit 202/202
  - license, typecheck, package build, public type fixture 통과
- `npm run verify:e2e`: 205/205 통과
- `npm run verify:playground`: production build 및 117/117 통과

첫 focused browser 실행은 포트 4003에서 기본 작업공간의 구버전 Vite 서버를
`reuseExistingServer`가 재사용하여 24/24 실패했다. 프로세스 cwd와 현재 build 산출물을
대조해 stale server임을 확인하고 해당 PID만 종료한 뒤 동일 명령을 재실행해 24/24
통과했다. 제품 실패나 재시도 통과로 분류하지 않는다.

## 잔여 범위

- virtualization은 보류한다.
- keyboard sorting/accessibility, 실제 Safari 인증, physical touch/pen 및 모바일 장치
  인증은 이번 범위에 포함하지 않는다.
- Playwright WebKit 결과는 Safari 인증이 아니다.
- 원격 push/PR, publish, version/tag/Release는 수행하지 않았다.
