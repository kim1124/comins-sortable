# 핸들 이동과 본문 선택·복사 분리

- 작업 일시: 2026-09-11 11:14 KST
- 작업 저장소: `comins-sortable` (저장소 루트)
- 브랜치: `codex-0.1.2-quality-verification`
- HEAD: `e04c549bec6e6734d9c4121c48bfef688292a03c` 유지
- 공통 정책: Comins Contract v1.8
- 상태: 승인된 로컬 수정 및 아래 검증 완료, 미커밋

## 변경 내용

1. Vanilla, React, Vue, Svelte의 정렬 카드에 핸들을 제공한다. 대상 목록,
   중첩 자식, 재귀 Tree, Vanilla 사용자 정의 복제 카드에도 동일하게 적용한다.
2. 본문의 상시 선택 차단을 제거하고 `user-select: text`와 Safari의
   `-webkit-user-select: text`를 적용한다. 핸들에는 선택 차단과
   `touch-action: none`을 적용한다. 카드 전체의 터치 차단은 제거한다.
3. 실제 `dragStart`부터 `afterDrag`까지 실행 영역의 본문 선택을 차단한다.
   별도 DOM으로 생성되는 Copy preview도 차단한다. 완료·취소·런타임 교체·해제
   시 차단 상태를 제거하며, 이전 런타임의 지연 이벤트가 새 화면을 잠그지 못한다.
   문서 전체의 Selection을 강제로 삭제하거나 전역 body 스타일을 변경하지 않는다.
4. Core의 다중 선택 전에 `handle`/`ignore` 입력 범위를 확인한다. Ctrl 메뉴도
   같은 판정을 사용하므로 명시한 button 핸들은 선택할 수 있고, 본문·일반
   컨트롤·슬롯·별도 자식 영역의 기본 메뉴는 유지된다.
5. 공개 옵션·패키지 버전·의존성은 변경하지 않는다. 핸들이 없는 소비자의
   일반 카드 드래그는 기존 패키지 E2E로 검증했다.
6. 공통 사용 안내, 핸들 예제 설명, 다중 선택 안내와 한국어·영어 문서를 갱신한다.

## 변경 파일

- `src/core/pointer.ts`, `src/core/scope.ts`
- `example/src/adapters/vanilla.ts`, `react.tsx`, `vue.ts`, `SvelteDemo.svelte`,
  `SvelteTreeArea.svelte`
- `example/src/styles.css`, `example/src/app/PlaygroundApp.tsx`
- `example/src/playground/runtime-host.ts`, `scenarios.ts`
- `test/unit/core/selection-input.test.ts`, `test/unit/playground/runtime-host.test.ts`
- `test/playground/playground.spec.ts`, `performance.spec.ts`, `helpers/drag.ts` (신규)
- `docs/ko/09-handle-acceptance.md`, `docs/user/09-handle-acceptance.md`
- `docs/ko/16-advanced-sorting.md`, `docs/user/16-advanced-sorting.md`, `CHANGELOG.md`
- 이 리포트

## 실패 재현과 검증

- 수정 전 focused unit: 신규 4건이 예상대로 실패했다. 본문 입력의 다중 선택
  변경 2건, 명시한 button 핸들의 Ctrl 메뉴 미차단, 런타임 선택 차단 상태 부재다.
- 수정 전 Chromium: 핸들 예제의 Research 본문을 실제 마우스로 선택했지만
  Selection 문자열이 빈 값이었다. 기대값은 `Research`였다.
- 수정 후 focused unit 27/27, 이동·선택·취소 브라우저 회귀 12/12 통과.
- 새 Copy 회귀의 최초 실행에서 Placeholder 삽입으로 대상 카드가 이동한 뒤
  고정 좌표가 다른 카드를 가리키는 테스트 조작 문제가 확인됐다. 기록된
  hit item과 destination rect를 근거로, 목록에 진입한 다음 최신 대상 위치로
  이동하도록 조작을 보정했다. 모델·DOM의 기대 순서는 유지했으며 12/12 통과했다.
- 기존 Playground 테스트는 핸들에서 드래그를 시작하도록 전용 helper를 사용한다.
  패키지 fixture용 공통 helper는 변경하지 않았다. WebKit 전용 새로고침 우회도
  제거하고 본문 선택 후 바로 재이동하도록 검증한다.

| 최종 명령 | 결과 |
| --- | --- |
| `npm run verify` | PASS: policy 50/50, unit 246/246, typecheck, build, public types |
| `npm run verify:playground -- -- --workers=3` | PASS: build 및 276/276 |
| `npm run verify:e2e -- -- --workers=3` | PASS: 238/238 |
| `npm run verify:performance` | PASS: 1/1 |
| `git diff --check` | PASS |

Playground 브라우저 게이트는 Chromium, Firefox, WebKit에서 실행했다. 로컬 개발
서버를 재사용했으며 production Playground build도 명령에 포함되어 통과했다.
이를 별도의 npm artifact/consumer/release 검증으로 간주하지 않는다.

성능 샘플은 warm → repeated에서 Heap 7.02 → 7.47 MB, DOM Nodes 471 → 471,
Event Listeners 381 → 381, live nodes 150 → 150이었다. 제한된 반복 검증 결과이며
장시간 메모리 누수 부재를 보증하지 않는다.

로그와 작업 시작 시 파일 사본: `/private/tmp/sortable-handle-fix-_e0cmy79/`.

## 실제 Safari 검증

Safari 26.6.2에서 CUA의 네이티브 마우스·키보드 입력으로 각 프레임워크의
`/examples/handle/{adapter}`를 조작했다.

| 프레임워크 | 핸들로 Design을 선두 이동 | 이동 후 일부 선택 | Cmd+C / Cmd+V | 새로고침 없는 재이동 |
| --- | --- | --- | --- | --- |
| React | 확인 | `Desi` | 붙여넣은 값 `Desi` 확인 | Research를 다시 선두 이동 |
| Vanilla | 확인 | `Desi` | 붙여넣은 값 `Desi` 확인 | Research를 다시 선두 이동 |
| Vue | 확인 | `Desi` | 붙여넣은 값 `Desi` 확인 | Research를 다시 선두 이동 |
| Svelte | 확인 | `Desi` | 붙여넣은 값 `Desi` 확인 | Research를 다시 선두 이동 |

클립보드 확인은 Safari 주소 입력란에 붙여넣은 값을 읽었으며 검색·탐색은 실행하지
않았다. 이후 페이지에 복귀해 다시 이동하고, 마지막에는 React 핸들 예제로
전환하여 주소와 화면을 정리했다. 페이지 리로드나 Selection API 주입 없이 검증했다.

## 잔여 범위

- 네이티브 Safari의 OS 보조키를 누른 채 클릭하는 조합은 CUA 입력 API 한계로
  이번 직접 조작 검증에 포함하지 않았다. 해당 입력 판정과 다중 선택·메뉴 범위는
  unit 및 Chromium/Firefox/WebKit 자동화에서 검증했다.
- 실제 터치 기기 조작과 별도 npm artifact/consumer 검증은 실행하지 않았다.
- 기존 작업 파일과 미커밋 변경을 보존했다. commit, push, merge, publish는 수행하지 않았다.
