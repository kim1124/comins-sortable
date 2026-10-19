# Sortable 메모리 보유 결함 수정 계획

작성일: 2026-10-19. 상태: 로컬 구현 및 계획한 검증 완료.
기준: `main`, HEAD `07015743f8588b50d0d5118fa9640dad34c96ef4` + 기존 미커밋 변경.
로컬 미게시 Comins Contract v1.12와 모듈 검증 절차를 적용한다.

## 목표와 경계

1. 장수 scope의 상태 이력이 사용 횟수에 비례하여 증가하지 않게 한다.
2. 이미 종료한 Core/Vanilla 해제 함수를 소비자가 계속 보관해도 내부 scope와
   제거된 fixture DOM을 보유하지 않게 한다.
3. 상태 전이, 종료 사유·횟수, DOM 복원, 같은 ID 재등록 보호를 유지한다.

두 수정을 독립 변경 단위로 순차 진행한다. 공개 API·옵션·export·peer 범위·런타임
의존성·패키지 버전은 변경하지 않는다. 기존 renderer/Safari/Governance 변경을
보존한다. 동적 transform, 키보드, 3D, 프레임워크 hook/composable, 편의 기능은
이번 수정 범위에서 제외한다. commit·원격 쓰기·발행은 이 계획의 실행 항목이 아니다.

## 근거와 위험

- 현재 `SessionMachine.history`는 완료/취소당 4개, pending 포기당 2개씩 증가한다.
  Chromium의 pending 100,000회 후 history 200,001개, backing store 1,064,944 bytes를
  확인했다. pointermove 빈도에 따른 증가는 아니다.
- public wrapper만 유지한 destroy에서는 내부 객체가 회수됐다. 호출 완료 disposer를
  유지하면 closure context가 SessionMachine/DOM을 보유했고, 참조 제거 후 회수됐다.
- Vanilla의 별도 반환 closure도 registered.element를 보유하므로 Core 수정만으로
  전체 보장을 선언하지 않는다. 정상 React/Vue/Svelte unmount의 누수는 확인되지 않았다.
- 이력 제거 위험은 낮다. disposer 수정은 종료 순서·재진입·예외에 영향이 있어 중간이다.
- 기존 remount soak의 성공과 별개로 동일 scope 검증이 필요하다. 기존 GC 안정화
  절차와 허용량을 완화하여 통과시키지 않는다.

## 단계 0. 기준과 검증기 고정

**변경 대상:**
- 신규 `test/playground/memory-retention.spec.ts`
- 신규 `test/playground/helpers/retention-fixture.ts`, `heap-snapshot.ts`
- `playwright.performance.config.ts`, `.github/workflows/verify.yml`
- `test/verification-routing.node.mjs`

- [x] 기존 dirty/untracked 목록과 관련 source/test/config/lock 해시를 고정한다.
  기존 ignored 분석 JSON·heap snapshot은 수정 전 증거로 보존한다.
- [x] 독립 checkout에 후보 변경을 정확히 반영하고 `npm ci --ignore-scripts`로 설치한다.
  기존 작업 폴더의 node_modules/dist를 삭제하거나 공유하지 않는다. 미커밋 overlay는
  검증 커밋과 구분하고 해시 manifest로 식별한다.
- [x] 메모리 fixture는 빈 페이지에서 built `dist/core.js`와 `dist/index.js`를 사용한다.
  Playwright route fulfillment로 해당 페이지/ESM을 제공하여 공개 Playground UI에
  진단 기능을 넣거나 별도 서버·의존성을 추가하지 않는다. 임시 코드·로그가 fixture
  DOM/세션을 잡지 않도록 event 배열·ElementHandle·console 객체 보유를 피한다.
- [x] 수집기는 표준 heap snapshot JSON metadata로 전체 SessionMachine 수와 history
  속성/크기를 각각 센다. history 부재를 객체 0개로 판정하지 않는다. 원시 snapshot과
  fixture/source/dist/수집기 해시를 `playwright-report/memory-retention/<run-id>/`에 저장한다.
  이 경로는 ignored이며 테스트가 초기화하는 test-results 밖이다.
- [x] 기존 Performance 설정의 testMatch에 새 suite를 포함한다(1 worker, retries 0).
  CI 변경 경로에 새 spec/helper와 `src/vanilla/*`를 넣고 routing 테스트로
  Vanilla만 변경된 경우도 Performance가 실행됨을 확인한다. artifact 업로드에는
  기존 benchmark JSON과 새 메모리 증거 경로를 모두 넣고 실패 시에도 보존한다.
  package script·lockfile 변경은 필요하지 않다.
- [x] 수정 전 후보에서 history 증가 및 완료 disposer 보유가 검출되는지 확인한다.
  검증기 자체 오류/fixture 미실행은 결함 재현으로 처리하지 않는다.

### 고정할 메모리·동작 계약

| 항목 | 조건 | 판정 |
|---|---|---|
| 장수 scope | Core/Vanilla 각각 remount·reset 없이 pending 10,000회 warm-up 후 100,000회씩 3배치 | post-warm retained heap 최대-최소 1MiB 이내, 대상 보유 경로/개수도 함께 확인 |
| 활성 세션 | 두 item의 실제 reorder/commit와 취소를 각각 반복 | model/DOM 순서·종료 사유·callback 횟수 확인. 단일 item noop로 대체 금지 |
| 입력 대조 | capture stub 없는 Playwright mouse로 클릭·commit·취소 각각 최소 20회 | bulk 진단과 같은 상태/종료 계약 확인 |
| GC | 모든 샘플에 동일한 두 프레임·두 번째 강제 GC 적용 | 초기 heap과 정확히 같아야 한다는 조건은 사용하지 않음 |
| live scope | 등록을 유지하고 반복 종료 | 해당 SessionMachine 1개 유지, production history 저장 없음 |
| 종료 후 보유 | public handle/완료 disposer를 계속 보유하고 fixture DOM 제거 | 해당 SessionMachine 0개, DOM·listener가 빈 fixture 기준으로 회수 |
| disposer 단독 | 개별 unregister 후 다른 live 등록 요소와 scope/DOM 참조를 없애고 disposer만 보유 | Core/Vanilla 모두 내부 scope/fixture DOM 회수 |

1MiB는 기존 자원 허용량을 유지하는 값이며 수정 전 양성 대조에서 실제 증가를
검출해야 한다. 검출 실패 시 진단·횟수·보유 경로를 점검하고 허용치를 올리지 않는다.
대량 합성 입력/capture stub 사용 여부를 기록하고 실제 브라우저 입력 결과와 분리한다.
Vanilla는 초기 area를 자동 등록하므로 추가 area만 unregister한 채 초기 area를 document에
남겨 두지 않는다. disposer 단독 대조에서는 초기 area를 포함한 모든 fixture DOM을
제거하고 다른 강한 참조도 해제한다. 다른 유효 등록으로 유지되는 scope를 누수로 오판하지 않는다.

## 단계 1. production 이력 저장 제거

**대상:** `src/core/session.ts`, `test/unit/core/session.test.ts`,
`test/diagnostics/session-history.node.mjs`.

- [x] history 필드와 transition의 push를 제거한다. current와 전이 유효성 검사는 유지한다.
  ring buffer, reset 옵션, 새로운 observer API를 추가하지 않는다.
- [x] 기존 상태 그래프 unit 3개를 호출 직후 state 관찰로 바꾼다. commit/cancel/abandon과
  잘못된 전이 거부를 유지한다. 진단 스크립트도 제거된 필드에 의존하지 않게 수정한다.
- [x] 집중 unit으로 이력 제거를 확인했다. 장수 scope heap은 단계 2까지 반영한 최종 통합
  후보에서 검증했으며, 이력 제거 단독 중간 후보의 heap acceptance는 수행하지 않았다.

## 단계 2. Core/Vanilla disposer 참조 해제

**대상:** 신규 `src/core/dispose-once.ts`, `src/core/scope.ts`,
`src/vanilla/create-sortable.ts`, 신규 `test/unit/core/dispose-once.test.ts`,
`test/unit/core/scope.test.ts`, `test/unit/core/resource-lifecycle.test.ts`,
`test/unit/vanilla/create-sortable.test.ts`.

- [x] scope 밖 module-level factory가 nullable cleanup cell만 캡처하도록 한다.
  cell은 cleanup 호출 전에 비운다. registerArea 내부의 지역 함수만 null로 바꾸는
  방식이나 this를 보유하는 기존 ResourceBag 반환 함수를 대체재로 쓰지 않는다.
- [x] Core ScopeArea에 동일 disposer를 저장한다. 개별 unregister와 scope.destroy가
  모두 이 함수를 사용하여 외부 반환 함수의 cell을 해제한다. 전체 destroy는 먼저
  기존 destroyed 사유로 drag를 종료하고 area들을 정리한다.
- [x] Vanilla 외부 wrapper에도 독립 cell을 적용한다. 내부 disposer 목록을 등록 객체
  identity로 관리하여 개별 해제 시 제거하고, 전체 destroy 시 모두 비운다.
  scope.destroy 오류가 있어도 Vanilla의 wrapper/areas 정리를 마친다.
- [x] cleanup의 listener·animation·selection·registry·area/attribute 정리는 오류가
  있어도 모두 시도한다. 소비자 callback 오류는 기존 onError 계약을 유지하고,
  동기 정리 예외는 남은 정리를 마친 후 첫 오류를 다시 전달한다. 새 AggregateError
  또는 공개 오류 API를 도입하지 않는다. public wrapper의 internal 참조도 finally로 끊는다.
- [x] cell/area 종료 표시는 사용자 callback보다 먼저 처리한다. 중복 호출·상호 재진입
  시 종료 callback이 늘어나지 않고 unmounted/destroyed 사유가 유지되어야 한다.
- [x] 같은 areaId의 이전 disposer는 새 등록을 건드리지 않도록 identity guard를 유지한다.
  종료 callback 안에서 같은 ID 재등록을 새로 허용하는 기능 확장은 하지 않는다.

### 집중 회귀

- [x] 독립 once helper: 정상 1회, 반복 호출, 재진입, 예외 후 재호출.
- [x] unregister→destroy, destroy→이전 unregister, 반복 destroy/unregister.
- [x] pending/dragging/commit 검증 대기 상태에서 해제·destroy, callback 오류.
- [x] 같은 ID 재등록 후 이전 disposer 호출: 새 listener·registry·attribute 보존.
- [x] 여러 area 중 하나의 정리 실패에도 나머지 자원과 참조 해제.
- [x] Core/Vanilla public handle 및 disposer 보유 heap 대조 전체 통과.

## 단계 3. 통합 검증과 기록

집중 unit은 기존 방식으로 실행한다:

```sh
node --import tsx --test test/unit/core/dispose-once.test.ts test/unit/core/session.test.ts test/unit/core/scope.test.ts test/unit/core/resource-lifecycle.test.ts test/unit/vanilla/create-sortable.test.ts
```

- [x] 마지막 의미 있는 변경 후, 단계 0~2의 build 산출물이 남은 사본을 재사용하지 않고
  최종 소스를 반영한 별도 fresh checkout을 준비한다. dist/node_modules/fixture 생성물이
  없는 시작 상태를 확인하고 `npm ci --ignore-scripts` 후 `npm run verify`를 정식
  순서로 실행한다. 사전 build로 빌드 전 타입 검사의 오류를 가리지 않는다.
- [x] `npm run verify:e2e`, `npm run verify:playground`, `npm run verify:performance`를
  순차 실행한다. heap/성능 수집과 다른 build/browser 작업을 동시에 수행하지 않는다.
- [x] 동일 source/lock/config의 기존 성공 증거는 재사용한다. 실패는 제품·검증 계약·
  실행 환경으로 분류하고 수정 후 영향받은 검사만 재실행한다. 검사 계약 변경 시
  source/수집기를 다시 고정하고 해당 전체 gate를 재실행한다.
- [x] `CHANGELOG.md` Unreleased와 작업 보고서에 변경 파일, 기준 해시, 전후 heap,
  live/종료 객체 수, 재사용/신규 결과, 실패·미실행 범위를 기록한다.
- [x] 현재 변경의 민감정보·diff 검사를 수행한다. 릴리스 후보가 되는 경우에만 별도로
  exact artifact/소비자 검증을 갱신하며 이번 계획을 발행 승인으로 해석하지 않는다.

## 완료 기준

두 결함의 수정 전 검출과 수정 후 통과가 고정된 검증기에서 확인되고, 상태 전이·종료
계약 및 Core/Playground/Performance gate가 통과해야 한다. history 제거만 완료하거나
Core만 수정한 상태를 전체 수정 완료로 처리하지 않는다. 남은 객체의 보유 경로가
불명확하면 분석 상태로 유지하며 코드 정적 검토만으로 GC 회수를 선언하지 않는다.

## 실행 결과

[작업 보고서](../../../reports/2026-10-19-memory-retention-fix.md)에 기록했다.
동일 검증기의 수정 전 8 FAIL → 수정 후 8 PASS를 확인했다.
최종 fresh 설치에서 verify(정책 77·unit 331), Core E2E 301,
Playground 749, Performance 13건이 통과했다. 단독 단계 1 heap 실행은
생략하고 최종 통합 후보에서 history 부재와 disposer 회수를 각각 검증했다.
원격 CI·발행 및 native Safari는 수행하지 않았다.
