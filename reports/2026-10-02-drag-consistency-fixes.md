# 드래그 상태 일관성 결함 수정

- 작업 일시: 2026-10-02 16:19 KST 검증 완료 기준
- 기준 커밋: `e4a402ca5d88164171197080f000110e0a2b15eb`
- 범위: 검토된 결함 3건의 로컬 수정, 회귀 검증, 관련 문서 갱신
- 상태: 미커밋·미배포. 패키지 버전은 0.1.3으로 유지하고 변경은 Unreleased에 기록했다.

## 변경 요약

1. 드래그 시작 시 등록 목록의 항목 ID와 DOM 순서를 보관한다. 드롭 시
   출발·도착 목록이 달라졌으면 `rejected / state-not-committed`로 종료하며
   `onChange`와 복사 준비 콜백을 호출하지 않는다. 원래 항목 대신 다른 항목이
   이동하는 것을 방지한다. 외부에서 바꾼 출발 목록은 취소 시에도 보존하며,
   삭제·교체한 항목 DOM을 다시 삽입하지 않는다.
2. 선택 상태 갱신을 변경 이벤트 이전에서 실제 커밋 성공 확인 이후로 옮겼다.
   커밋 거부·변경 콜백 예외 후 옵션을 갱신해도 다중 선택과 Shift 선택 기준을
   유지한다.
3. 기본 드래그 제외 판정에서 브라우저의 실제 편집 가능 상태를 사용한다.
   빈 `contenteditable`, `plaintext-only`, 상속을 처리하고 `false` 하위 영역은
   편집 가능한 부모만을 이유로 차단하지 않는다. 명시적 핸들 우선순위와 사용자
   `ignore`가 기본 제외 규칙을 대체하는 기존 동작을 유지한다.

공개 타입·의존성·빌드 설정을 변경하지 않았다. 드래그 도중 목록이 변경되는
경우 자동으로 새 위치에 맞춰 계속 이동하는 대신 해당 드롭을 거부하는 정책이다.
판정은 드롭 시점의 상태와 시작 시점의 상태를 비교하며, 외부 변경을 즉시
관찰하는 별도 observer는 추가하지 않았다.

## 변경 파일

- 구현: `src/core/scope.ts`, `src/core/pointer.ts`
- 단위 테스트: `test/unit/core/active-list-changes.test.ts`,
  `test/unit/core/selection-lifecycle.test.ts`, `test/unit/core/pointer.test.ts`
- 실제 브라우저 회귀: `test/playwright/review-regressions.spec.ts`
- 문서: `CHANGELOG.md`, `docs/user/01-quick-start.md`,
  `docs/ko/01-quick-start.md`, `docs/user/09-handle-acceptance.md`,
  `docs/ko/09-handle-acceptance.md`, 본 보고서

## 재현과 검증

수정 전 목록 변경·선택 유지 회귀 10건과 편집 가능 판정 단위 테스트의 실패를
확인했다. Chromium 실제 포인터 조작에서도 빈 속성·plaintext-only·false 하위
영역 3건이 기대 동작과 달랐으며, 수정 후 통과했다.

| 최종 검증 | 결과 |
| --- | --- |
| `npm run verify` | PASS: 라이선스, 정책 52건, 타입 검사, 단위 288건, 빌드, 공개 타입 |
| `npm run verify:e2e` | PASS: 289건, Chromium·Firefox·WebKit 및 리소스 검사 |
| `npm run verify:playground` | PASS: 패키지·Playground 빌드 및 363건 |
| `npm run verify:performance` | PASS: Playground 기능 반복 후 메모리·DOM·리스너 안정성 1건 |
| `git diff --check` | PASS |

새 브라우저 시나리오는 엔진별 11건이다. Vanilla 출발 목록 재정렬·콜백 실패 후
선택 유지·편집 영역 5종, 네 어댑터의 애플리케이션 주도 도착 목록 비우기를
검증한다. 드래그는 실제 포인터 입력을 사용하며 외부 상태 변경은 fixture의
DOM 또는 기존 소비자 액션으로 주입했다. 출발 목록 변경은 Core에서 단일 이동,
재정렬, 스왑, 다중 이동, 복사, 추가·삭제·동일 ID DOM 교체까지 검증했다.

초기 브라우저 실행은 sandbox의 로컬 포트 listen 제한으로 실패했으며 허용된
실행 환경에서 동일 검사를 수행했다. 초기 타입 검사의 테스트 코드 오류
(`Array.at` 지원 범위, 선택적 `refreshArea` 호출)는 수정 후 전체 검증을 통과했다.
추가 어댑터 회귀 테스트를 포함한 최종 verify와 E2E를 다시 실행했다.

## 잔여 범위

- 실제 Safari 및 Galaxy 실기기는 이번 작업에서 재검증하지 않았다. WebKit
  통과를 실제 Safari 검증으로 간주하지 않는다. 기존 Safari 제목 드래그의
  본문 선택 잔상은 이번 수정 대상에 포함하지 않았다.
- 성능 검사는 리소스 안정성 기준이며, 대규모 목록의 포인터 활성화 지연에 대한
  별도 벤치마크는 수행하지 않았다.
- 커밋·원격 반영·릴리스 아티팩트 검증·배포는 수행하지 않았다.

## 후속 릴리즈 준비

위 상태는 결함 수정 완료 시점의 기록이다. 이후 같은 날 0.1.4 후보 버전과
릴리즈 문서를 준비했으며, 후속 검증과 배포 경계는
[0.1.4 릴리즈 준비](./2026-10-02-0.1.4-release-preparation.md)에 기록했다.
