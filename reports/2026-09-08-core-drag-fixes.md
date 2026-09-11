# 선택자·Copy·외부 스크롤 주요 결함 수정

- 작업 일시: 2026-09-08 11:42 KST
- 브랜치: `codex-0.1.2-quality-verification`
- HEAD: `e04c549` 유지
- 공통 정책: Comins Contract v1.8
- 상태: 승인된 로컬 구현 및 선택한 전체 검증 완료

## 계획 검토 및 구현

사용자의 구현 요청에 따라 기존 검토안을 재확인했다. 추가 사용자 결정 없이
기존 공개 API·의존성·버전과 동작 계약을 유지하는 범위로 진행했다.

1. **등록 area 기준 선택자 판정.** Slot 거부, Swap 대상, 마지막 삽입 경계에서
   자식 요소의 `matches()`를 제거하고 area의 `querySelectorAll()`로 조회한
   직접 등록 항목 집합을 사용한다. 한 번의 목적지 판정 안에서 조회를 재사용하되
   다음 판정까지 DOM 항목 집합을 캐시하지 않는다. 충돌에서 제외한 source도
   등록 항목 집합에는 남겨 footer로 오인하지 않도록 한다.
2. **Copy의 기본 검사와 목적지 검사 분리.** 분리된 복제 요소에 상대 선택자를
   적용하지 않는다. 같은 document·분리 상태·ID 유효성·중복 검사를 유지하고,
   삽입 시 목적지 선택자 및 목적지 ID 해석과의 일치를 확인한다. snapshot은
   삽입 전에 확보하며 오류는 즉시 rollback한 후 전달한다. 소비자 `onChange`는
   유효한 삽입 뒤에만 호출된다. 끝 삽입 시 기존 footer 경계도 사용한다.
3. **외부 스크롤과 드롭 갱신.** 활성 scope의 window 및 등록 area의 ancestor
   scroll offset을 추적한다. 실제 offset이 바뀐 경우에만 scope geometry를
   무효화하고 기존 포인터 프레임에서 재판정한다. 포인터 정지와 늦은 scroll
   알림도 처리하며, 드롭 직전 offset 변화는 최종 포인터 좌표로 반영한다.
   드롭을 처리하는 프레임에서는 추가 auto-scroll을 하지 않는다. 자체 scroll
   결과는 알림 전에 기록하여 중복 예약을 막고, 종료·취소 시 관측을 해제한다.

## 변경 파일

- `src/core/scope.ts`: 등록 항목 기반 판정, scroll 관측·geometry 갱신·종료 처리.
- `src/core/pointer.ts`: 내부 refresh 예약을 포인터 프레임과 통합하고 release
  처리 여부를 내부 move callback에 전달. 패키지 공개 API는 변경하지 않음.
- `src/vanilla/dom-transaction.ts`: 목적지 문맥의 Copy 검사 및 즉시 rollback.
- `example/vanilla/main.ts`: 상대 선택자·Swap·Copy·slot·page scroll의 명시적
  consumer fixture 변형과 실제 Copy source 관측.
- `test/playwright/scoped-items.spec.ts`: 상대 선택자 정렬·Swap·footer 경계,
  정상 Copy·잘못된 Copy 복원·slot 거부.
- `test/playwright/external-scroll.spec.ts`: 정지 포인터의 외부 페이지 스크롤과
  즉시 드롭, 모델·DOM·change 횟수·자원 정리.
- `test/unit/core/scroll.test.ts`: 외부·ancestor scroll, 정지 포인터, 알림 전
  드롭, auto-scroll 중복 방지 및 취소·unmount·destroy 정리.
- `test/unit/vanilla/dom-transaction.test.ts`: 목적지 선택자 불일치 즉시 복원.
- `docs/user/08-copy-clone.md`, `docs/ko/08-copy-clone.md`: Copy 검증 계약 설명.
- `CHANGELOG.md`, `docs/verification/0.1.2-test-gap-audit.md`, 기존 검증 보고서:
  변경 기록 및 수정 전후 증거 구분.

## RED → GREEN 증거

- 브라우저 최초 집중 검증: 선택자 관련 4 실패·1 통과. Core 선택자 수정 후
  정렬·Swap·footer·중첩 거부는 통과했고, Copy만 실제 삽입 단계에서 실패했다.
- Copy 목적지 불일치 단위 회귀: 예외가 발생하지 않아 실패했다. 수정 후 관련
  단위 6/6, 정상·거부 Copy 브라우저 시나리오 모두 통과했다.
- 외부 scroll 회귀: 다음 이동, 정지 포인터 프레임, 알림 전 드롭 3건이 실패했다.
  수정 후 관련 pointer·scope·scroll 집중 단위 43/43 통과했다.
- ancestor 및 auto-scroll 정리 보강 중 신규 fixture의 중복 ID를 수정했다.
  이는 제품 실패가 아닌 테스트 setup 오류였다. 최종 관련 단위 16/16 통과.
- 세 브라우저의 신규 경계 검증 21/21, Grid·다중 선택 집중 검증 24/24 통과.
- 반복 포인터 입력, 기대 정렬 완화, timeout 증가, 테스트 retry 또는 기존
  성능 기준 변경을 사용하지 않았다.

## 최종 검증

| 게이트 | 결과 |
| --- | --- |
| `npm run verify` | 통과: license, 정책 50/50, 단위 235/235, typecheck, build, public types |
| `CI=1 npm run verify:e2e` | 238/238 통과, 35.5초 |
| `CI=1 npm run verify:playground` | 216/216 통과, 39.0초 |
| `CI=1 npm run verify:performance` | 1/1 통과, 11.8초 |
| `git diff --check` | 통과 |

브라우저 게이트는 localhost 바인딩이 허용된 환경에서 실행했다. 이전
Playground 실패 15건과 consumer 실패 30건은 최종 전체 실행에서 해소됐다.

성능 게이트는 모든 React Playground 기능을 두 차례 실행하고 GC 후 비교한다.
이번 warm → repeated 측정은 다음과 같다.

| 항목 | Warm | Repeated | 증가 |
| --- | --- | --- | --- |
| JS heap | 4.66 MB | 4.84 MB | 0.18 MB |
| DOM nodes | 582 | 582 | 0 |
| Event listeners | 343 | 343 | 0 |
| Documents | 1 | 1 | 0 |
| Live nodes | 146 | 146 | 0 |

이는 기존 반복 시나리오의 기준 통과이며 장시간 실행 전체에 대한 무누수
보장을 의미하지 않는다.

## 보존 및 잔여 경계

- 착수 전 파일 snapshot을 기준으로 이번 수정 파일을 구분했다. 기존 미커밋
  변경을 보존하고 HEAD·index를 유지했다. package manifest·lockfile·공개
  exports·패키지 버전과 Governance v1.8 지침은 변경하지 않았다.
- 이번 요청 범위의 알려진 실패와 미실행 필수 게이트는 남아 있지 않다.
- 실제 macOS Safari·OS 입력, exact npm artifact·consumer 릴리스 인증은
  이번 범위 밖이며 실행하지 않았다.
- commit·push·merge·배포·publish·Release는 수행하지 않았다.
