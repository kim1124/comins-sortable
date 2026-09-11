# 드래그 활성화 식별 및 단일 입력 검증 보강

- 작업 일시: 2026-09-08 10:37 KST
- 브랜치: `codex-0.1.2-quality-verification`
- HEAD: `e04c549` 유지
- 공통 정책: Comins Contract v1.8
- 상태: 테스트 도우미 수정·검증 보강 완료, 제품 결함으로 전체 게이트 미통과

> 위 상태와 아래 실패 수는 Core 수정 전 기록이다. 후속 구현 및 전체 게이트
> 통과 결과는 [Core 수정 보고서](2026-09-08-core-drag-fixes.md)에 기록했다.

## 요약

v1.8 적용을 재확인한 뒤 기존 계획의 다음 단계인 드래그 검증을 진행했다.
`AGENTS.md`는 로컬 `main`과 일치하며 managed block은 v1.8이다.

기존 도우미의 중앙 입력이 중첩 부모 대신 자식을 활성화하는 문제를 먼저
재현하고 수정했다. 실제 source 식별, polling 중 재입력 제거, 모델·DOM 및
작업 위치 검사를 보강했다. 단일 입력 검증에서 기존 Core 선택자·스크롤
결함이 드러났으므로 전체 정상 또는 릴리스 준비 완료로 보고하지 않는다.

## 이번 변경

- `test/playwright/helpers/drag.ts`: 노출된 source의 hit-test, handle 지원,
  실제 활성화 검사, Copy 관측, 단일 경로 포인터 이동, 읽기 전용 polling,
  좌표·hit·placeholder 실패 진단, 직접 자식 DOM 순서 검사.
- `test/playground/playground.spec.ts`: Nested 부모 식별·정렬, Tree 왕복,
  Thresholds 동작 차이, Grid first/last·행 경계, 다중 선택, Swap,
  Accept 거부·reset·remount, 주요 operation의 source/destination/item 검사.
- `example/src/app/PlaygroundApp.tsx` 및 `example/src/adapters/`의
  Vanilla·React·Vue·Svelte 구현: 공개 drag-start callback의 source를
  숨겨진 Playground 관측 출력에 전달. route 전환 시 관측 상태 초기화.
- `example/vanilla/main.ts`, `example/react/main.tsx`, `example/vue/main.ts`,
  `example/svelte/App.svelte`: `?nested-parent` fixture에서 공개 `parent`
  옵션을 설정하여 부모의 자기 자식 host 진입을 실제 포인터로 검증.
- `test/playwright/nested.spec.ts`: 네 어댑터의 순환 거부, 상태 불변,
  종료 이유·자원 정리 검사와 hit-test 진단.
- `test/playwright/rollback.spec.ts`: 등록 유지·등록 해제·DOM 제거에 맞는
  명시적 종료 DOM 검사. 모델 불변 검사는 유지.
- `test/playground/performance.spec.ts`: 같은 source 식별 도우미 및 DOM
  검사를 적용. 기존 성능 기준은 변경하지 않음.
- `docs/verification/0.1.2-test-gap-audit.md`: 이전 기록을 보존하고 이번
  관측과 실패·미도달 검증을 추가.

## 재현과 검증

### 활성화 RED → GREEN

- Chromium에서 네 어댑터 모두 요청 `todo/research`, 실제 `child/review`로
  식별자 회귀가 실패했다. source rect, viewport, 입력점, hit와 실제 source를
  관측했다. 서버 바인딩 권한 오류는 환경 실패로 분리하고 동일 명령을
  localhost 바인딩이 허용된 환경에서 실행했다.
- 도우미 수정 후 Nested 식별 및 기본 Move·Copy·Handle 집중 검증 13/13 통과.
- 추가 Chromium 동작 검증의 초기 28건은 21 통과·7 실패였다. Grid 4건과
  reset이 선택까지 해제한다는 테스트 가정 3건을 분리했다. 다중 선택의
  독립 setup 수정 후 네 어댑터 집중 검증이 통과했다.

### 최종 게이트

| 실행 | 결과 |
| --- | --- |
| `npm run verify` | 통과: license, 정책 50/50, 단위 224/224, 타입, build, public types |
| `CI=1 npm run verify:e2e` 최초 | 181 통과·36 실패 |
| 종료·unmount 집중 재검증 | 세 브라우저 24/24 통과 |
| `CI=1 npm run verify:e2e` 최종 | 187 통과·30 실패 |
| `CI=1 npm run verify:playground` | 201 통과·15 실패 |
| `CI=1 npm run verify:performance` | 1 실패, Grid 이동에서 중단 |
| 최종 `npm run typecheck`, `git diff --check` | 통과 |

초기 E2E 실패 중 6건은 새 DOM 검사가 종료 후에도 등록 속성 및 DOM 존재를
요구한 테스트 오류였다. 종료 유형별 기대값을 명시하고 수정하여, 최종 전체
재실행에서 해소했다. 제품 실패를 숨기기 위해 추가 포인터 입력을 넣거나
정렬 기대값을 변경하지 않았다.

### 미해결 제품 결함과 수정안

1. **Area 기준 선택자 판정 오류.**
   `src/core/scope.ts:directNonItemHit()`는 자식 요소의
   `matches(':scope > *')`를 검사한다. 실제 브라우저 관측은
   `areaScopedMatch: true`, `itemScopedMatch: false`이며 정상 item과 preview에
   `not-accepted`가 붙는다. 세 브라우저에서 Vanilla·Svelte 기본 이동·geometry·
   순환 거부 30건이 실패한다.
   수정안은 등록 area에서 조회한 직접 sortable item의 멤버십으로 판정하는
   것이다. 같은 패턴의 `directItemFromHits()`도 확인하고, header/footer 슬롯
   거부를 유지해야 한다. 상대 선택자와 일반 선택자 회귀를 함께 검증한다.
2. **외부 스크롤 이후 좌표 캐시 갱신 누락.**
   `src/core/scope.ts:move()`에는 자체 auto-scroll 결과에 대한 갱신만 있으며,
   외부 스크롤의 invalidation 경로가 없다. Grid 마지막→처음 이동에서 실제
   포인터는 첫 카드 위지만 placeholder는 19번째 앞에 남는다. 네 어댑터와
   세 브라우저에서 12건 실패한다. 독립 Core fixture에서도 좌표 이동과 scroll
   이벤트 후 기대 정렬이 반영되지 않는 RED를 확인했다.
   수정안은 활성 세션에서 문서·스크롤 컨테이너의 scroll을 관측하고 영향받은
   geometry를 dirty로 표시하여 다음 판정 전에 갱신하는 것이다. 종료·취소·
   destroy 시 리스너 해제, 변경 없는 프레임의 캐시 재사용, auto-scroll 및
   placeholder 안정성 회귀를 함께 검증해야 한다.
3. **WebKit 다중 선택 목적지 불일치 3건.**
   포인터는 `measure` 위인데 placeholder가 `release` 앞에 남는다. 외부
   스크롤 후 발생하는 같은 계열의 증상이지만, 2번 수정으로 해결되는지는
   아직 검증하지 않았다. 독립 결함으로 남을 가능성을 유지한다.

성능 시나리오는 2번과 동일한 Grid 단계에서 중단되어 heap·DOM·listener
안정성 기준의 최종 측정에 도달하지 않았다. 따라서 성능 회귀 또는 누수
발생 여부는 이번 실행만으로 판정하지 않는다.

## 보존 및 잔여 범위

- 작업 시작 snapshot과 비교하여 HEAD·index가 동일함을 확인했다. 기존의
  광범위한 미커밋 변경을 유지했으며 `src/` 제품 소스는 이번 작업에서
  변경하지 않았다. 신규 의존성·공개 API·패키지 버전 변경 없음.
- Core 수정은 기존 테스트 보강 계획의 제품 동작 변경으로 범위가 확대되어
  확인을 요청한 상태다. 답변 없는 상태에서 제품 수정을 승인으로 간주하지 않는다.
- 실제 Safari·OS 입력, exact npm artifact·consumer 릴리스 인증은 미수행.
- commit·push·merge·배포·publish·Release는 미수행.
