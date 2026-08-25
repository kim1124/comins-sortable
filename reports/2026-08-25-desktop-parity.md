# 2026-08-25 Comins Sortable 데스크톱 패리티 완료

## 작업 일시

- 2026-08-25 (Asia/Seoul)

## 요약

- Comins Contract v1.7 기준으로 Vue.Draggable 동작 패리티 17개를 Vanilla,
  React, Vue, Svelte adapter와 Playground에 구현했다.
- Core에 framework-neutral FLIP animation, scroll/resize invalidation,
  nested parent metadata와 descendant-cycle rejection을 추가했다.
- adapter에 table row/column, component host, header/footer non-item sibling,
  nested 및 controlled nested state 계약을 추가했다.
- Playground는 parity 17개와 Comins 추가 example 3개, 총 20개 route를 제공한다.
- `CHANGELOG.md`와 package artifact 범위에 behavior/public API 변경을 기록했다.

## 주요 변경 파일

- Core: `src/core/model.ts`, `src/core/scope.ts`, `src/core/animation.ts`
- Framework binding: `src/framework/bindings.ts`,
  `src/framework/controlled-transaction.ts`
- Adapters: `src/vanilla`, `src/react`, `src/vue`, `src/svelte`
- Playground: `example/src/adapters`, `example/src/app`,
  `example/src/playground/scenarios.ts`, `example/src/styles.css`
- 검증: `test/unit`, `test/types`, `test/playground/playground.spec.ts`
- 문서: `README.md`, `CHANGELOG.md`, parity design spec

## 검증

- focused typecheck 및 animation/lifecycle/binding/navigation unit: 18/18 통과
- 신규 데스크톱 패리티 Chromium adapter matrix: 4/4 통과
- `npm run verify`: 통과
  - policy 29/29
  - unit 193/193
  - license, typecheck, package build, public type fixture 통과
- `npm run verify:e2e`: Chromium, Firefox, Playwright WebKit 205/205 통과
- `npm run verify:playground`: production build 및 3-engine 93/93 통과
- 브라우저 게이트의 첫 sandbox 실행은 `127.0.0.1:4175`와
  `127.0.0.1:4003` bind `EPERM`으로 중단됐다. 동일 소스 상태를 권한 허용
  환경에서 재실행해 모두 통과했다.

## 잔여 리스크

- Playwright WebKit 통과는 실제 Safari 인증을 의미하지 않는다. Safari remote
  automation 보안 설정을 action-time 승인한 뒤 실제 Safari evidence를 추가해야 한다.
- physical touch/pen 및 모바일 장치 인증은 maintainer 결정에 따라 후순위로 보류한다.
- publish, version, tag, GitHub Release는 수행하지 않았다.
