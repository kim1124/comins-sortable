# Safari Memory Follow-up Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Safari 관측 증가의 귀속을 검증하고, 제품 누수가 재현되는 경우 그 보유 경로만 수정한다.

**Architecture:** 공개 Playground의 동작을 유지한다. Inspector 증거 분석 및 별도 대조군을 먼저 보완하고, 같은 runtime의 워밍업 이후 증가와 종료 후 회수를 확인한다. 제품 수정 단계는 제품 소유의 잔존 객체·retainer·소스 위치가 확인된 경우에 진행한다.

**Tech Stack:** 기존 Node ESM/`node:test`, TypeScript Core, React/Vue/Vanilla/Svelte Playground, native Safari Web Inspector. 새 의존성 없음.

**Spec:** [원인 재검토 및 설계](../specs/2026-10-24-safari-memory-followup-design.md)

## Global Constraints

- 계획 기준 HEAD `4fcdba1e40c8aaa387611f559780c571e2b1b851`. 실행 시 실제 Git 상태와 관련 파일 해시를 재확인하고 기존 사용자 변경을 보존한다.
- 최초 요청은 계획 작성이었다. 2026-10-24 후속 사용자 승인으로 실행에 착수했다. Task 1은 완료했다. Task 2에서 React 워밍업 20회·측정 300회와 종료 후 retainer 분석을 완료했으며, 사용자 잠금 해제 후 Vue·Vanilla·Svelte까지 성공 정렬 300회와 종료 후 분석을 수행했다. Vue 입력 프로토콜 제한과 native DOM 보유 후속 실험은 아래에 구분한다. 전체 제품 누수 해결 완료를 의미하지 않는다.
- 공개 API·라우팅·의존성·버전 유지. 키보드·3D·프레임워크 API·FPS는 범위 밖이다.
- 기존 성공한 Chromium 결과를 새 Safari 결과로 표현하거나 기존 자원 한계를 완화하지 않는다.
- commit/push/PR/merge/deploy/publish는 계획 실행에 포함하지 않는다. 원격 단계는 별도 승인 범위다.

## Review Focus

1. 재연결로 ID가 바뀌면 객체 소멸로 오판하지 않아야 한다 — Task 1의 세션 경계 음성 대조.
2. 새 minify 이름이나 자산 불일치가 객체 0개 PASS가 되면 안 된다 — Task 1의 매핑 오류 검사.
3. Reader prototype/wrapper 및 internal flag를 실제 문서 수·dead 상태로 해석하면 안 된다 — Task 1의 스키마 대조.
4. URL 고정, 텍스트 변경, URL 변경의 조건 차이가 원인 귀속을 왜곡하면 안 된다 — Task 2의 동등 동작 대조.
5. 총량 평탄화 또는 클래스 수 고정이 종료된 클로저·리스너·DOM 보유를 가리면 안 된다 — Task 2의 종료 ID/retainer 검사 및 Task 3의 실패 재현.

---

### Task 1: 분석·판정 도구와 수집 계약 보완

**Files:**
- Create: `scripts/analyze-safari-memory.mjs`
- Create: `test/diagnostics/safari-memory-analysis.node.mjs`
- Create: `docs/verification/safari-memory.md`

**Interfaces:**
- 입력 CLI: `node scripts/analyze-safari-memory.mjs --manifest <input.json> --output <summary.json>`.
- manifest: `schemaVersion: 1`, `kind: product | control`, `head`, `browserVersion`, `assets`(상대 경로와 SHA-256), `classMap`(SessionMachine/AreaRegistry/GeometryCache의 해당 자산 클래스명), `snapshots` 배열. 각 항목은 `path`, `inspectorSessionId`, `phase`를 갖는다. `product`는 세 클래스 매핑이 필수이고, 제품을 import하지 않는 `control`은 빈 매핑을 허용한다.
- 출력: 원본 해시, 총 self-size, 코드 블록 self-size, raw 클래스 수, Reader 속성 보유 전역 수, 같은 세션 내 ID 교집합/차집합, 누락 관측 목록. 총량만으로 전체 PASS를 출력하지 않는다.

- [x] 작은 합성 Inspector v3 입력으로 회귀 검사를 먼저 작성한다. 서로 다른 세션 ID 비교는 거부, 자산 해시·클래스 매핑 불일치는 실패, flags 1을 dead로 처리하지 않음, prototype 수를 native 문서 수로 표시하지 않음, 총량만 제공된 입력은 전체 판정 INCOMPLETE를 검증한다.
- [x] `node --test test/diagnostics/safari-memory-analysis.node.mjs`로 의도한 계약이 빠진 상태의 실패를 확인한다. 실행 오류를 RED로 계산하지 않는다.
- [x] CLI를 구현한다. 기존 로컬 분석을 참조하되 Apple/WebKit worker 원문을 저장소에 복제하지 않는다. minified 이름을 상수로 고정하지 않고 정확한 자산별 매핑을 요구한다. 기본 출력은 요약으로 제한하고 세부 retainer는 별도 ignored 증거로 보존한다.
- [x] 같은 명령의 GREEN과 기존 원본 재집계 수치 일치를 확인한다. raw snapshot에 없는 native 자원·JS 소스 위치·GC root reason은 추정하지 않는다.
- [x] 수집 문서에 실제 브라우저/세션/소스 해시, 워밍업·입력 횟수, GC 수집 방식, 관측 누락, 공개 Playground/진단 대조군 구분을 명시한다. 기존 `.local` 원본은 변경하지 않는다.

### Task 2: 남은 원인을 구분하는 native Safari 검증

**Files:**
- Create: `test/fixtures/safari-memory/counter.html`
- Create: `test/fixtures/safari-memory/history.html`
- Modify: `docs/verification/safari-memory.md`
- Evidence only: `.local/safari-memory-followup/<run-id>/`

**Interfaces:**
- 두 HTML은 Sortable/프레임워크 import 없이 같은 카운터와 버튼을 사용한다. `counter.html`은 카운터·텍스트만 변경, `history.html`은 동일 동작에 `history.pushState`로 URL 변경만 추가한다.
- Task 1 manifest와 요약 형식으로 기록한다. native 입력 결과는 각 단계의 카운터/URL 및 실제 Playground 순서·종료로 확인한다.

- [ ] 두 대조군 원문을 검사하여 외부 스크립트·제품 import가 없고 history 호출 외 동작이 같은지 확인한다. 두 조건 모두 20회 입력을 3배치 수행하고, 동일 조건의 Inspector 연결/분리 실행을 별도 세션으로 기록한다. 순서를 바꾼 재현 쌍으로 시간·첫 로드 효과를 점검한다.
- [x] 공개 React handle 예제의 같은 runtime에서 실제 reorder 20회를 워밍업한다. 초기 모듈 로드와 이벤트 목록 포화가 지난 뒤 같은 GC 수집 절차로 idle baseline 5개를 확보하고 범위를 기록한다. 이후 증가를 보고 baseline 표본이나 허용 범위를 바꾸지 않는다.
- [x] reset·route 이동·remount 없이 100회씩 3배치 수행한다. 매 배치 같은 GC 수집 절차를 적용하고 snapshot·기능 결과를 저장한다. 워밍업·배치가 확인되지 않으면 표본을 판정에서 제외하고 사유를 기록한다.
- [ ] 같은 세션에서 현재 instance 수/상태, 이전 배치의 불필요한 객체 ID와 retainer, 제거된 임시 DOM 및 이벤트 로그의 상한을 확인한다. post-warm 표본이 baseline 변동 범위를 벗어나 반복 증가하면 평탄화 미확인으로 처리한다. 총 힙/코드만 증가해도 자동 PASS 또는 제품 FAIL로 바꾸지 않고 소스 귀속을 추적한다. 범위 안에 있더라도 제품 소유 자원 회수 증거가 없으면 전체 PASS는 아니다.
- [ ] 실제 예제 전환으로 기존 runtime을 종료한 뒤 대상 인스턴스·분리 DOM wrapper·클로저의 제품 소유 경로가 남는지 확인한다. 다른 살아 있는 scope와 사용자 보유 handle을 구분한다. native DOM/리스너를 직접 확인하지 못하면 미검증을 명시한다.
- [ ] React 결과를 먼저 판정한다. 제품 보유 문제가 있으면 Task 3으로 진행하고 동일 결함을 다른 어댑터에서 조사한다. 문제가 확인되지 않으면 Vue→Vanilla→Svelte 순서로 같은 계약을 검증한다. DOM/리스너 관측 누락이나 설명되지 않은 증가가 있으면 전체 메모리 PASS를 선언하지 않는다.

### Task 3: 결과에 따른 수정 분기

**Files:** 수정 경로는 아래 증거에 따라 선택하며, 미확정 경로를 일괄 변경하지 않는다.

| 검증 결과 | 조치 | 가능한 대상 |
| --- | --- | --- |
| Reader/Inspector 컨텍스트만 증가, 제품 소유 잔존 없음 | 수집 절차·해석·한계 문서 보완. 제품 변경 없음 | `docs/verification/safari-memory.md`, 분석 CLI |
| 코드 블록 증가 후 평탄화, 제품 자원 고정·종료 후 회수 | 제한적 안정성 결과 기록. 제품 변경 없음 | 작업 보고서 |
| 제품 인스턴스/클로저/리스너/분리 DOM이 계속 잔존 | 동일 유지 경로를 실패 회귀로 재현하고 최소 수정 | `src/core/scope.ts`, `src/core/pointer.ts`, `src/core/session.ts`, 해당 어댑터 중 실제 소유 파일만 |
| Playground 로그/runtime이 원인 | 라이브러리 변경 없이 해당 host/로그 소유권 수정 | `example/src/playground/runtime-host.ts`, `example/src/app/PlaygroundApp.tsx` 중 확인된 경로 |
| 귀속 불명 또는 필수 자원 미관측 | INCOMPLETE 유지, 부족한 retainer/실험을 구체적으로 기록 | 원본 증거·수집 문서 |

- [ ] 제품 결함이 재현되면 object→retainer→GC root와 소스 위치를 먼저 기록한다. 해당 파일과 실패 조건을 계획에 추가한 다음, 그 결함의 집중 회귀가 수정 전 실패함을 확인한다. 재현되지 않은 범용 cleanup 변경은 하지 않는다.
- [ ] 실제 소유 지점에서 참조를 해제한다. 기존 종료 사유·예외 처리·재진입·같은 ID 재등록 계약을 유지하고, 같은 검사에서 GREEN을 확인한다.
- [ ] 수정 후 Task 2의 실패했던 native 조건과 영향받는 어댑터를 다시 검증한다. 구현되지 않은 수정안을 완료로 표시하지 않는다.

### Task 4: 변경 범위에 맞는 최종 검증·기록

**Files:**
- Create on execution: `reports/2026-10-24-safari-memory-followup.md`
- Modify only if runtime behavior changes: `CHANGELOG.md`

- [x] 분석 도구만 변경했다면 Task 1 전용 검사와 원본 재집계를 실행한다. 관련 없는 전체 E2E를 요구하지 않는다.
- [x] fixture/테스트 계약 또는 제품 코드를 변경했다면 새 격리 checkout에 검증 대상 파일을 정확히 반영하고 `npm ci --ignore-scripts` 후 `npm run verify`를 정식 순서로 실행한다. 로컬 미커밋 후보라면 overlay 파일별 해시를 기록하고 committed HEAD 검증과 구분한다. 생성물·공유 node_modules를 재사용해 설치 검증을 대체하지 않는다. 향후 원격 push가 승인되면 `docs/verification/workflow.md`의 후보 커밋 격리 검증을 별도로 충족해야 한다.
- [ ] 제품 drag/adapter 변경 시 `npm run verify:e2e`, `npm run verify:playground`, `npm run verify:performance`를 마지막 의미 있는 변경 후 한 번씩 순차 실행한다. 테스트 계약만 바뀌면 해당 게이트를 한 번 실행한다. 측정 중 다른 build/browser 작업을 병행하지 않는다.
- [x] 리포트에 source·자산·수집기 해시, 새 결과/재사용 결과, native/Chromium, PASS/FAIL/INCOMPLETE/미실행, 제품 변경 여부와 잔여 리스크를 구분한다. 원본은 ignored 경로에 보존하고 공개 보고서에는 개인 경로·heap 원문을 넣지 않는다.

## 계획 자체 검토

원인 재검토의 확인/가설/미확인을 분리했고, 각 Review Focus를 위 작업에 연결했다. 외부 브라우저 내부 구현의 정확한 수정 지점과 아직 재현되지 않은 제품 수정 코드는 이 계획에서 정하지 않는다. 실행 우선순위는 분석 계약→동등 대조·장기 반복→증거에 따른 최소 수정→영향 검증이다.

## 2026-10-24 실행 관측

React의 idle 5개·100/200/300회·실제 simple 경로 전환 후 1개, 총 9개 snapshot을 같은 Inspector 세션에서 수집했다. 매 드래그 최종 순서와 drop 검사는 통과했다. 매회 start payload·live hit·marker를 별도 보존한 기록은 없어 해당 세부 수집 계약 전체를 완료로 표시하지 않는다.

Sol 6.1/high로 배정한 후속 분석에서 대상 Core 3종과 캡처 scope ID가 반복 중 유지되고 실제 경로 전환 후 수집됨을 확인했다. 이전 current 및 이벤트 LI도 수집되며, 캡처 대상 31/31개가 종료 후 사라졌다. 200→300회 코드 외 증가 256 bytes는 internal SymbolTable 4개였다. 총량·코드의 완전한 평탄화와 native DOM/리스너 전체 관측은 미완료이므로 전체 판정은 INCOMPLETE이다.

처음의 windowNotFoundAtPosition은 검증 탭을 새 Safari 창으로 분리하여 복구했다. 이후 Vue 착수 시 CUA가 Mac 잠금을 명시적으로 보고하여 사용자에게 해제를 요청했다. 이후 사용자 잠금 해제로 Vue/Vanilla/Svelte 300회 반복 및 종료 분석을 진행했다. 동등 대조군 행렬은 미완료이며 별도 native DOM 보유 대조를 우선했다. 제품 결함이 재현되지 않아 Task 3의 제품 수정 분기는 시작하지 않았다. 최종적으로 Inspector 초기 트랙과 개발자 기능 OFF를 복원했다.

## 추가 실행 — 사용자 잠금 해제 이후

Vue/Vanilla/Svelte도 준비 성공20+측정 성공300회 및 종료 후 분석을 수행했다. Vue는 최초 관측 미변경4건/취소2건으로 무중단 입력 PASS가 아니다. Vanilla/Svelte는 각1건 관측 지연을 다음 AX에서 확인했으며 취소·reset·remount가 없다. 모든 어댑터에서 대상 Core/scope/capture31 종료 수집을 확인했다.

Svelte 같은 페이지 추가idle2+5/20cycle에서 rootless 반응 집합은 다음세대에서 수집됐으나 nativeRoot div는 연결 상태에서3/cycle 증가했다. 제품 JS 보유 주체 미확정이므로 일반 counter/history 행렬보다 Inspector 분리20cycle을 우선했다. 분리 전후 대상realm root/root-only는3/2로 동일했다. 연결 상태 재도전20cycle에서같은힙의대상realm root/root-only가3/2→62/61로증가하고별도live realm은17/1고정됨을확인했다. Inspector조건연관성은재현됐으나native보유주체의내부소스위치는미확정이다. native DOM/리스너 전체 PASS 또는 제품 수정 완료와 구분한다.

분석기는 전체탐색 후 ID재사용 사례를 계기로 동일ID의 클래스 불일치 비교를 거부하도록 수정했다. 합성1 RED→11 GREEN, 실제 unsafe비교거부 및 같은힙5개실행 정상집계를 확인했고 격리verify+전용11/11 및 후속독립검토를 통과했다.

최종 실행 경계: 제품 소유의 강한 누수 경로가 재현되지 않아 제품 변경 분기는 미적용이다. 분석기 ID비교 결함을 수정하고 검증했다. native DOM 증가는Inspector연결/분리/재연결로차이를 재현했으며 전체native리스너·rootreason·정규대조행렬은미완료로남긴다. 초기Safari설정은복원확인했다.
