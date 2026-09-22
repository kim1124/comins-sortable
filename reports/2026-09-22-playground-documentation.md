# Playground 설명과 구현 정합성 수정

- 작업일: 2026-09-22 KST
- 기준: `codex/0.1.3-stability`, `044d35f` 위 기존 로컬 수정 보존
- 범위: Playground 설명·API·소스 보기·언어 전환 및 관련 한영 문서

## 변경

1. `scenarioById(exampleId, adapterId)`에서 어댑터에 맞는 제목·설명·API를 반환한다.
   React/Vue의 Host 컴포넌트와 Svelte/Vanilla의 직접 DOM 등록을 구분한다.
   사용하지 않는 disabled/ignore 및 API가 아닌 개념 표시는 제거했다.
2. Vanilla의 `nested-controlled`는 목록별 DOM 갱신으로 안내한다. React·Vue·Svelte의
   배열 상태 갱신과 구분하고 README, 문서 인덱스, 한영 중첩·Host 가이드를 정정했다.
3. 코드 보기에 예제별 `main.ts`, 실제 파일명, 공통 데이터·타입·스타일과 Svelte 재귀
   컴포넌트를 제공한다. 공개 패키지 import로 변환하고 Vite·프레임워크 컴파일 조건을
   명시했다. 단일 파일 예제로 오인하지 않도록 다중 파일 구성임을 안내한다.
4. 보조키 복제의 영문 제목을 Alt/Option으로 정정했다.
5. 런타임의 locale 갱신 경로를 추가하여 재마운트 없이 트리·목록 안내를 변경한다.
   현재 순서와 선택을 유지하며, 로딩 중 전환한 언어도 마운트 완료 시 반영한다.

변경 파일: `example/src/playground/{scenarios,types,runtime-host,source-files}.ts`,
`example/src/app/{PlaygroundApp,NestedExampleGuide}.tsx`, 네 어댑터 및
`SvelteDemo.svelte`, `example/src/styles.css`, Playground 회귀 테스트와
`helpers/source-bundle.ts`, README·CHANGELOG·관련 docs 및 이 기록.

기존 카드 스타일·초기화·피드백 수정과 GIF, 별도 승인 로고·파비콘 작업은 보존했다.
이번 작업은 라이브러리 Core, 공개 API, 패키지 버전과 의존성을 변경하지 않았다.

## 검증

- 수정 전 @docs 8건 실패: 어댑터 API 불일치, 파일 선택 UI 부재, 언어 전환 후 내부
  문구 미갱신을 확인했다. 수정 후 동일 Chromium 8건 통과.
- 표시된 파일만으로 네 어댑터 예제를 esbuild/Svelte compiler와 현재 dist 공개
  entry에 연결하여 컴파일했다. 처음 누락된 CSS 경로를 검출한 뒤 공개 경로로 수정했다.
  검증 helper의 raw import 캐시 충돌도 실제 소스와 raw 파일을 구분하여 정정했다.
- `npm run verify`: 라이선스, 정책 51/51, 타입 검사, 단위 272/272, 빌드, 공개 타입 통과.
- 전체 Playground: Chromium·Firefox·WebKit 327/327 통과. 첫 실행은 별도 로고 변경을
  반영하지 않은 기존 `co` 마커 검사만 세 브라우저에서 실패했다(324 통과). 브랜드의
  실제 링크를 검사하도록 테스트 계약을 정정한 후 전체를 재실행했다.
- 성능 검사: Chromium 1/1 통과. 반복 후 heap 5.18 MB, DOM 504, listener 380,
  live node 154. 브라우저별 전체 성능 보증은 아니다.
- 한영 사용자 문서 검사 9/9, 타입 검사, `git diff --check` 통과.
- 직접 Chromium 조작: Vanilla 자식 순서 뒤집기, Svelte 탭 전환, 트리 순서 변경 후
  영어 전환, 소스 파일 선택을 확인했다. 390×844 화면에서 문서 가로 넘침 없음.

코드 보기의 마지막 여백·select 스타일 변경은 기능 전체 검사 이후의 저위험 CSS
정리이며, production 재빌드와 관련 @docs 24/24 시나리오를 추가로 통과했다.

로그: `/private/tmp/sortable-doc-{red,green,verify,playground,playground-final,performance,final-style,guides}.log`.

직접 조작 스크린샷:

- [Vanilla DOM 안내](../output/playwright/2026-09-22-doc-vanilla.png)
- [트리 언어 전환](../output/playwright/2026-09-22-doc-locale.png)
- [Svelte 소스 파일](../output/playwright/2026-09-22-doc-source.png)
- [모바일 코드 보기](../output/playwright/2026-09-22-doc-mobile.png)

## 검증 범위와 잔여

- 소스 묶음 검증은 컴파일 검사다. 외부 프로젝트에 설치한 최종 tarball의 소비자
  실행이나 네 프레임워크의 모든 호스트 설정을 검증한 것으로 해석하지 않는다.
- 이번에는 패키지 E2E·tarball·실제 Safari·실물 터치 검증을 다시 실행하지 않았다.
- 9월 16일 GIF는 당시 React 화면 기록이다. 이번 소스 패널·어댑터별 안내의 새 촬영본이 아니다.
- 로컬 미커밋 변경이며 원격 push·태그·Release·npm 발행은 수행하지 않았다.
