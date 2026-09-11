# Playground 피드백 수정 및 검증

- 작업 일시: 2026-09-11 08:41 KST
- 작업 저장소: `comins-sortable` (저장소 루트)
- 브랜치: `codex-0.1.2-quality-verification`
- HEAD: `e04c549bec6e6734d9c4121c48bfef688292a03c` 유지
- 공통 정책: Comins Contract v1.8
- 상태: 승인된 로컬 수정과 선택한 전체 검증 완료, 미커밋

## 변경 사항

1. 다중 선택 항목의 Ctrl 컨텍스트 메뉴를 억제한다. 일반 우클릭, 무시 대상
   컨트롤, 비항목 슬롯, 별도 자식 영역의 메뉴 소유권은 유지한다. 우클릭·가운데
   클릭·비주 포인터가 기존 선택을 바꾸던 경로를 차단하고, 영역 해제 시 메뉴
   리스너도 제거한다. 예제에는 macOS Command(⌘), Windows/Linux Ctrl,
   Shift 범위 선택을 안내한다.
2. Thresholds를 '정렬 전환 기준'으로 표시하고, 드래그 시작 거리와의 차이를
   설명한다. Design을 Research 위로 이동하는 기준으로 활성 영역을 색칠하고
   컨트롤 변경 시 경계와 비율을 갱신한다. 0.2·0.8, 반전 on/off의 동일 포인터
   경로에서 결과가 달라지는 것을 모델·DOM과 표시 높이로 검증한다.
3. 메뉴 순서를 스왑 → 그리드 → 스왑 그리드로 변경하고, 모든 어댑터에
   `direction: grid`와 `swap`을 조합한 예제를 추가한다. 다른 행의 두 셀만
   교환하고 나머지 위치를 보존하는 것을 검증한다. 전체 예제는 25개이며
   기존 parity 예제 수 18개는 유지한다.
4. 트리는 독립된 배열 투영 대신 실제 재귀 `children` 상태를 사용한다.
   Research → Review → Document/Observe의 3단계와 빈 Design 자식 영역을
   렌더한다. Review 이동 시 두 하위 항목을 보존하고 부모 관계도 갱신한다.
   중첩 목록의 별도 영역 상태와 트리의 단일 재귀 상태 차이를 한·영으로 설명한다.
5. 실제 하위 트리 이동에서 React의 이전 부모 항목 참조와 Vue의 이전 영역
   등록이 새 DOM 등록과 충돌하는 문제를 수정했다. 새 Host 등록을 framework
   commit 후 microtask로 지연하고 제거는 즉시 처리하며, 폐기된 등록은 취소한다.
   공개 API·패키지 버전·의존성은 이번 작업에서 변경하지 않았다.

## 변경 파일

- Core: `src/core/scope.ts`
- 어댑터 등록: `src/framework/element-ref.ts`, `src/react/SortableArea.tsx`,
  `src/vue/SortableArea.ts`
- Playground 모델·렌더링: `example/src/adapters/demo-data.ts`, `vanilla.ts`,
  `react.tsx`, `vue.ts`, `SvelteDemo.svelte`, `SvelteTreeArea.svelte`
- Playground 화면·탐색: `example/src/app/PlaygroundApp.tsx`, `navigation.ts`,
  `example/src/playground/scenarios.ts`, `example/src/styles.css`
- 단위 검증: `test/unit/core/selection-input.test.ts`,
  `test/unit/framework/element-ref.test.ts`,
  `test/unit/playground/demo-data.test.ts`, `navigation.test.ts`
- 브라우저 검증: `test/playground/playground.spec.ts`, `performance.spec.ts`,
  `test/playwright/helpers/drag.ts`
- 문서: `README.md`, `CHANGELOG.md`, `docs/README.md`,
  `docs/{user,ko}/12-nested-tree.md`, `docs/{user,ko}/16-advanced-sorting.md`,
  `test/user-docs.node.mjs`, 이 보고서

## 실패 분석 및 회귀 증거

- 선택 입력 회귀 단위 4건의 수정 전 실패를 확보한 뒤 관련 39건 통과를 확인했다.
- 초기 트리 브라우저 검사에서 React `INVALID_ELEMENT`, Vue
  `DUPLICATE_AREA_ID`를 확보했다. Host 등록 시점 수정 후 해당 실패는 해소됐다.
- 이후 트리 테스트의 별도 실패는 입력 좌표·fixture 계약이었다. 큰 부모 카드의
  상단이 고정 헤더 뒤로 가려지는 것을 bounding box와 실제 hit target으로
  확인하고 scroll helper의 상단 여백을 보정했다.
- 드래그 중인 부모 내부는 hit test에서 제외되므로 순환 이동 검증은 기존
  nested consumer fixture와 같은 방식으로 자식 Host를 독립 배치했다.
  실제 하위 트리 이동 후 갱신된 논리 부모 관계의 `nested-cycle` 거부를 검증하고
  Host를 원위치에 돌려 모델·DOM과 피드백 정리를 확인한다.
- 포인터 반복, 기대 순서 완화, timeout 증가, retry, 자원 기준 완화는 사용하지 않았다.
- 최종 집중 단위 17/17, 세 브라우저 × 네 어댑터 집중 검증 60/60 통과.

## 최종 전체 검증

| 검증 | 결과 |
| --- | --- |
| `npm run verify` | 통과: license, 정책 50/50, 단위 242/242, typecheck, build, public types |
| `CI=1 npm run verify:e2e` | 238/238 통과, 25.8초 |
| `CI=1 npm run verify:playground` | 252/252 통과, 35.6초 |
| `CI=1 npm run verify:performance` | 1/1 통과, 12.9초 |
| In-app Browser | 전환 영역 표시, 메뉴 순서, 3단계 트리 화면 및 Review 하위 항목 동시 이동 확인 |
| `git diff --check` | 통과 |

전체 브라우저 검증은 localhost 바인딩이 허용된 환경에서 실행했다. 최종
Playground·성능 게이트는 개발 서버를 종료하고 새 빌드의 preview 서버를 사용했다.
두 중첩 npm 명령의 추가 `--output` 옵션은 npm이 인식하지 않아 기본 결과
디렉터리를 사용했다. 테스트 수·검증 결과에는 영향이 없으며 stdout 로그는
아래 별도 파일에 보존했다. 색상 환경 변수 경고도 검증 실패가 아니다.

성능 게이트는 스왑 그리드와 실제 하위 트리 이동을 포함한 25개 React 예제를
두 번 실행하고 강제 GC 후 비교한다. 기존 허용 기준을 유지했다.

| 항목 | Warm | Repeated | 차이 |
| --- | --- | --- | --- |
| JS heap | 4.64 MB | 4.86 MB | +0.22 MB |
| DOM nodes | 470 | 470 | 0 |
| Event listeners | 378 | 378 | 0 |
| Documents | 1 | 1 | 0 |
| Live nodes | 148 | 148 | 0 |

## 로그와 보존 확인

- 착수 snapshot: `/private/tmp/sortable-playground-feedback-before.json`
- 작업 구분 diff: `/private/tmp/sortable-feedback-task.diff`
- 선택 RED/GREEN: `/private/tmp/sortable-selection-{red,green}.log`
- 트리 최초 실패: `/private/tmp/sortable-feedback-focused.log`
- 최종 집중 단위·브라우저: `/private/tmp/sortable-feedback-units-final.log`,
  `/private/tmp/sortable-feedback-browsers.log`
- 최종 전체 게이트: `/private/tmp/sortable-feedback-{verify,consumer,playground,performance}.log`
- 착수 snapshot 대비 HEAD·index, package manifest·lockfile, 기존 관련 없는
  소스 변경을 보존했다. 기존 `.playwright-cli` console 로그의 실행 중 추가분은
  생성 결과로 남겼으며 이전 내용을 삭제하거나 초기화하지 않았다.

## 잔여 경계 및 다음 조치

- 요청 범위에서 알려진 실패와 미실행 필수 검증은 없다.
- 물리 macOS Ctrl 클릭의 네이티브 메뉴와 실제 Safari 인증은 수행하지 않았다.
  자동 검증은 Command/Ctrl 선택 입력과 취소 가능한 contextmenu 이벤트,
  Chromium·Firefox·WebKit 동작을 확인한다.
- 성능 결과는 해당 반복 시나리오의 기준 통과이며 장시간 무누수 보장은 아니다.
- 검증 후 `npm run dev`를 `http://127.0.0.1:4003`에 다시 실행했다.
- 다음 조치는 사용자 화면 확인이다. commit·push·PR·merge·publish·Release와
  exact npm artifact 인증은 수행하지 않았다.
