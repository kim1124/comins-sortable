# Playground 선택 초기화와 드롭 미리보기 수정

- 작업일: 2026-09-14 KST, 최종 직접 조작 확인 10:46
- 기준 커밋: `044d35f71178604d6daf0e1f8c6e3710a66a6513`
- 브랜치: `codex/0.1.3-stability`
- 범위: 승인된 두 직접 조작 시나리오의 로컬 수정과 검증. 커밋·원격 반영·배포는 포함하지 않는다.

## 변경

1. React·Vue Playground의 데이터 초기화 시 `SortableRoot`를 다시 생성한다. Svelte는 keyed block으로 등록 영역을 다시 생성하여 선택 ID·표시·범위 기준점을 정리한다. Vanilla는 기존 destroy/remount 초기화를 유지한다. 일반 데이터 갱신의 선택 유지 계약은 변경하지 않았다.
2. 드롭 목적지가 없을 때 삽입 미리보기를 숨기고 재진입하면 복원한다. 이동용 Placeholder는 공간을 유지하여 숨김 때문에 목록 높이와 스크롤 범위가 줄어들지 않도록 한다. 드롭 판정 영역과 자동 스크롤 속도 계산은 변경하지 않았다.
3. 초기화 후 Shift 선택·실제 이동·본문 선택, 자동 스크롤 끝에서 이탈·재진입·취소, 사용자 정의·Skeleton 미리보기 회귀 검증을 보강했다. CHANGELOG와 한·영 Placeholder 가이드를 갱신했다.

변경 파일:

- `example/src/adapters/react.tsx`
- `example/src/adapters/vue.ts`
- `example/src/adapters/SvelteDemo.svelte`
- `src/core/feedback.ts`
- `src/core/scope.ts`
- `test/unit/core/feedback-destination.test.ts`
- `test/playground/playground.spec.ts`
- `CHANGELOG.md`
- `docs/ko/13-placeholder.md`
- `docs/user/13-placeholder.md`
- 이 보고서

## 수정 전 실패와 원인 분류

- Core 회귀 테스트 4/4 실패: 영역 이탈·거부 후에도 미리보기가 숨겨지지 않았다.
- Chromium 신규 시나리오 8개 중 7개 실패: React·Vue·Svelte의 초기화 3개, 네 프레임워크의 스크롤 끝 피드백 4개. Vanilla 초기화는 통과했다.
- 앞선 직접 조작 보고서의 Svelte 초기화 정상 판정은 정정한다. 후속 테스트에서 페이지 로딩을 확인하고 동일 시나리오를 반복하자 Svelte에서도 선택 잔존이 재현됐다. 이 수정에 포함했다.
- 첫 수정 후 초기화 4개와 Core 관련 15개는 통과했다. 브라우저 재진입 실패는 테스트 좌표 문제였다. 작은 viewport에서 컨테이너와 페이지가 함께 스크롤되어 이전 화면 좌표가 목록 밖을 가리켰다. 실제 화면의 `elementsFromPoint`와 갱신된 보드 경계로 확인했다. 원래 재현과 같은 1440×1100 viewport 및 재진입 시 최신 경계를 사용한 뒤 네 프레임워크 모두 통과했다. 이 진단에 따라 제품 코드를 추가 변경하지 않았다.
- 기본 게이트의 첫 typecheck는 새 테스트의 `Array.at` 사용이 저장소 ES2020 lib와 맞지 않아 실패했다. 배열 인덱스로 수정한 후 기본 게이트 전체가 통과했다.

## 검증

| 검증 | 결과 |
|---|---|
| Core 피드백·선택 회귀 | 15/15 PASS |
| Chromium 선택 초기화 | 4/4 PASS |
| Chromium 스크롤 경계·재진입·취소 | 4/4 PASS |
| `npm run verify` | PASS: policy 51/51, unit 272/272, license, typecheck, build, public types |
| `npm run verify:e2e -- --workers=3` | 256/256 PASS |
| `CI=1 npm run verify:playground -- -- --workers=3` | production 빌드 및 Chromium·Firefox·WebKit 303/303 PASS |
| `CI=1 npm run verify:performance` | 1/1 PASS |
| 수정 후 Playground 직접 조작 | headed Chromium, production preview에서 PASS. 아래 증거 참고 |
| `git diff --check` | PASS |

성능 표본의 warm→repeated 비교: Heap 4.74→4.93 MB, DOM 492→492,
이벤트 리스너 378→378, live nodes 153→153. 기존 성능 기준 통과이며 장시간 누수나
모든 장치의 성능을 보장하는 수치는 아니다.

## 수정 후 직접 조작

- React·Vue·Svelte: Build 선택→초기화 후 선택 0개. Shift+Review 후 Review 1개만 선택.
- React: 위 상태에서 Review를 Research 앞으로 직접 이동. Build는 함께 이동하지 않았고, 이동 후 본문 `Revi`를 마우스로 부분 선택할 수 있었다. 클립보드 전송까지 검사한 것은 아니다.
- Svelte: 하단 여백에서 scrollHeight 720px 유지, scrollTop 390px, 미리보기 hidden 확인. 21.5px 안쪽으로 재진입 시 미리보기 복원, 놓으면 Research가 마지막으로 이동. 종료 후 임시 드래그 요소 0개.
- React: 하단 여백에서는 미리보기를 숨기고, 그대로 놓으면 `afterDrag outside`로 취소하며 원래 순서를 유지. 종료 후 임시 드래그 요소 0개.
- 마지막 페이지 콘솔 조회: 오류 0개·경고 0개.
- [스크린샷 10개와 조작 시나리오](../output/playwright/2026-09-14-fixed/README.md).
- production preview는 `http://127.0.0.1:4003`에서 실행 상태로 두었다.

## 증거와 잔여 범위

- 실행 로그: `/private/tmp/sortable-0914-*.log`.
- 최종 게이트 로그 사본: `output/playwright/2026-09-14-fixed/logs/`.
- 수정 후 조작 trace: `.playwright-cli/traces/trace-1789350121360.trace` 및 인접 network·stacks·resources·screencast.
- 수정 전 실패 trace 보존: `/private/tmp/sortable-0914-regression-red-traces.zip`.
- 이전 직접 조작 원본: `output/playwright/2026-09-14-direct/`.
- 기존 `.playwright-cli/`, `output/`, `reports/2026-07-27.md`는 보존한다.
- 이번 검증은 native Safari·실물 터치·고주사율 장치의 직접 조작 인증이 아니다.
- 앞서 생성한 0.1.3 tarball과 소비자 검증 증거는 이번 수정 이전 결과다. 릴리스 단계에서 최신 소스로 아티팩트를 다시 만들고 해당 아티팩트를 검증해야 한다.
- 현재 수정은 미커밋 로컬 작업이다. 버전·의존성·공개 API 추가는 없으며 원격 push, PR, tag, publish를 수행하지 않았다.

## 문서 후속 반영 — 2026-09-14 KST

- README에 Playground 초기화와 드롭 불가 영역의 미리보기 동작을 추가했다.
- 한·영 `10-animation-auto-scroll.md`, `16-advanced-sorting.md`에 스크롤 경계와
  드롭 판정, 명시적 초기화와 일반 데이터 갱신의 차이를 설명했다. Placeholder
  가이드에 이미 반영한 설명과도 맞췄다.
- [0.1.3 로컬 검증 기록](../docs/verification/0.1.3-local-validation.md)을 추가하고
  README·문서 인덱스의 최신 검증 링크를 갱신했다. 이전 준비 보고서와 GIF 촬영
  기록에 검증 시점을 명시하고 CHANGELOG의 문서 변경 항목을 갱신했다.
- 수정 전 직접 조작 보고서 상단에 Svelte 판정 정정을 추가했다. 당시 본문과
  스크린샷은 보존했다. GIF는 기존 기능 소개 장면과 촬영 이력을 유지했다.
- 추가 변경 파일: `README.md`, `docs/README.md`, 위 네 개의 한·영 가이드,
  `docs/verification/0.1.3-local-validation.md`, `docs/playground-preview.md`,
  `reports/2026-09-14-0.1.3-preparation.md`,
  `output/playwright/2026-09-14-direct/report.md`, `CHANGELOG.md`, 이 보고서.
- 문서 갱신 후 `npm run test:policy`: 51/51 PASS. 가이드 예제 18개 타입 검사,
  한·영 문서 쌍, 공개 API·경로 매핑, 사용자 문서 상대 링크 검사를 포함한다.
- 이번 후속 작업은 문서만 변경했다. 위 구현·브라우저·성능 결과는 구현 단계에서
  실행한 결과이며 이번에 다시 실행한 것은 아니다. 커밋·원격 반영·배포는 미실행이다.
