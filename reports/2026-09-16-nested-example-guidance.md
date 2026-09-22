# 중첩 상태와 하위 트리 예제 안내 구분

- 작업일: 2026-09-16 KST
- 브랜치 / 기준: `codex/0.1.3-stability` / `044d35f` 위 로컬 수정
- 범위: 예제의 목적과 조작 결과를 구분하는 UI·문서 수정. 기존 미커밋 작업을 보존했다.

## 변경

- `nested-controlled`의 표시 이름을 **목록별 상태 제어**로 변경했다. 부모·자식 배열을
  별도로 갱신하는 구조, 자식 순서 뒤집기, 부모 목록으로 항목을 이동하는 흐름을 설명한다.
- `tree`의 표시 이름을 **하위 트리 이동**으로 변경했다. 초기 3단계 구조와 Review를
  Design 아래로 옮길 때 Document·Observe가 함께 이동하는 결과를 설명한다.
- 두 예제에 한·영 초기 구조 도식, 조작 순서, 기대 결과를 추가했다. 두 예제 모두
  제어형이며 같은 엔진과 순환 방지를 사용한다는 공통점도 명시했다.
- 도식은 **초기 데이터 구조 요약**으로 표시한다. 현재 상태는 실제 카드 배치에서
  확인하며 도식을 실시간 데이터로 표현하지 않는다.
- 기존 경로·드래그 동작·공개 API는 유지했다. 이 작업에서는 예제 안내만 변경했다.
  앞선 카드 색상 띠 제거도 유지하며, 새 안내 패널에는 색상 띠를 추가하지 않았다.

변경 파일:

- `example/src/app/NestedExampleGuide.tsx`
- `example/src/app/PlaygroundApp.tsx`
- `example/src/playground/scenarios.ts`
- `example/src/styles.css`
- `docs/ko/12-nested-tree.md`, `docs/user/12-nested-tree.md`
- `test/playground/playground.spec.ts`, `test/playground/performance.spec.ts`의 표시 이름
- `CHANGELOG.md`, `docs/verification/0.1.3-local-validation.md`, 이 기록

## 이번 검증

| 항목 | 결과 |
| --- | --- |
| `npm run typecheck` | PASS |
| `npm run test:policy` | 51/51 PASS |
| `CI=1 npm run verify:playground -- -- --workers=3` | production build, Chromium·Firefox·WebKit 303/303 PASS |
| `CI=1 npm run verify:performance` | production build, Chromium 1/1 PASS |
| Playwright CLI 화면 확인 | 4개 어댑터 × 2개 예제 × 한·영 = 16개 안내 확인 |
| 자식 순서 뒤집기 실제 클릭 | 4개 어댑터에서 child는 Release·Review, todo는 Research·Design·Build 유지 |
| 모바일 표시 | 375×812에서 페이지 가로 넘침 없음, 안내 패널 확인 |

전체 브라우저 게이트는 새 패널을 포함한 중첩 이동·하위 트리 이동과 순환 방지
회귀를 포함한다. 마지막 확인을 위해 개발 서버를 `http://127.0.0.1:4003`에 다시 실행했다.

스크린샷(로컬 증거):

- [목록별 상태 제어 · 한국어](../output/playwright/2026-09-16-guide-nested-controlled-ko.png)
- [목록별 상태 제어 · English](../output/playwright/2026-09-16-guide-nested-controlled-en.png)
- [하위 트리 이동 · 한국어](../output/playwright/2026-09-16-guide-tree-ko.png)
- [하위 트리 이동 · English](../output/playwright/2026-09-16-guide-tree-en.png)
- [모바일 안내](../output/playwright/2026-09-16-guide-mobile.png)

게이트 로그: `/private/tmp/sortable-0916-guide-policy.log`,
`/private/tmp/sortable-0916-guide-playground.log`,
`/private/tmp/sortable-0916-guide-performance.log`.

## 범위와 잔여

- 이번 UI 변경에 Core 단위·패키지 E2E·실제 Safari 검증은 다시 실행하지 않았다.
- WebKit 결과를 실제 Safari 또는 실물 터치 검증으로 간주하지 않는다.
- 이번 작업은 미커밋 로컬 변경이다. 원격 반영·릴리스·게시를 수행하지 않았다.
