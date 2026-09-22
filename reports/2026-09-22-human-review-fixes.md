# 0.1.3 휴먼 리뷰 후속 수정

- 작업일: 2026-09-22 KST
- 기준: `codex/0.1.3-stability`, `423a01c` 이후 로컬 변경
- 요청: 빈 슬롯 목록의 미리보기/삽입 위치, 예제 명칭, 드래그 시작 영역, 피드백 CSS,
  DOM Host 설명 및 실제 기능과의 일치 여부 보완.
- 수정 전 직접 재현과 스크린샷은 로컬 `output/playwright/2026-09-22-human-review/`에 보존.

## 변경

- Core는 마지막 항목 뒤의 비정렬 경계를 기억하여 목록을 비운 뒤에도 footer 앞에
  Placeholder를 배치한다. Vanilla DOM transaction도 같은 경계 계산을 사용한다.
- React는 header / items 배열 / footer를 독립된 자식 위치로 렌더링하여 항목 수 변경
  시 footer DOM이 교체되는 원인을 제거했다. 추가 wrapper DOM은 만들지 않는다.
- 직접 조작에서 추가 발견한 Vanilla 항목 수 표시도 DOM 결과에 맞춰 갱신한다.
  목록을 비우면 0/4, 한 항목을 돌려놓으면 1/3으로 표시되는 것을 확인했다.
- `handle` 경로는 전용 핸들 / 제목 / 카드 전체를 전환한다. 전환은 현재 순서를
  유지하고, 초기화는 핸들 모드로 복원한다. 다른 예제의 핸들·본문 선택 방식은 유지한다.
- `custom-placeholder` 경로는 두 목록 사이에서 수락 여부와 기본/사용자 스타일을
  비교한다. 허용 Placeholder와 거부 대상·드래그 요소의 표시를 구분하고 CSS를 제공한다.
- `단일 전환`은 `전환 효과`, 함수형 중첩은 `사용자 컴포넌트 중첩`, Vanilla/Svelte의
  DOM Host는 `사용자 컨테이너 연결/중첩`으로 명확히 했다. 컨테이너 구조를 화면에 제시한다.
- README, 문서 색인, DOC 재사용 안내, 한·영 핸들/Host/Placeholder 가이드와 CHANGELOG를
  갱신했다. 테두리 shorthand는 색상만 아닌 두께·스타일을 함께 지정한다.

주요 변경 파일:

- `src/core/item-boundary.ts`, `src/core/scope.ts`, `src/vanilla/dom-transaction.ts`, `src/react/SortableArea.tsx`
- `example/src/adapters/`의 공통 데이터 및 네 어댑터
- `example/src/app/ExampleGuides.tsx`, `PlaygroundApp.tsx`, `example/src/playground/scenarios.ts`, `types.ts`, `styles.css`
- `test/unit/core/feedback-destination.test.ts`, `test/unit/vanilla/dom-transaction.test.ts`, `test/playground/`
- 위 사용자 문서 및 아래 라이선스 기록·검사 파일

## 라이선스 검사 누락 보완

이전 커밋이 승인된 SVG 로고를 추적하기 시작하면서 `verify`의 라이선스 단계가 실패했다.
이전 검증 시에는 미추적 SVG가 tracked material 검사 대상에 포함되지 않았다.
Governance 승인본과 같은 SHA-256임을 확인하고 `LICENSE_SCOPE.json` 및
`reports/2026-09-22-brand.md`에 출처·해시·사용 범위를 기록했다.

`scripts/check-licenses.mjs`에는 first-party SVG의 증거 파일과 해시 검증을 추가했다.
검사 제외나 우회는 추가하지 않았으며, 승인 바이트와 다르면 실패하는 회귀 검증을 포함한다.
고정 scope를 검사하는 기존 정책 테스트도 이 자산 기록에 맞췄다. 의존성·버전 변경은 없다.

## 검증 기록

- Core/Vanilla 단위 회귀: 원래 코드에서 실패, 수정 후 12/12 통과.
  Core 테스트의 첫 초안은 이전 drop 완료 프레임을 기다리지 않아 수정했고,
  원래 Core로 다시 실행하여 Placeholder index 2 vs 기대 1 실패를 확인했다.
- React 경계 재현: 비운 뒤 기존 footer의 isConnected=false 실패 확인 후 수정.
- 신규 예제: 옵션 선택기와 두 번째 목록이 없는 기존 화면에서 실패 확인.
- 신규 브라우저 시나리오: Chromium 12/12 통과. 후속 전체 게이트에도 포함.
- `npm run verify`: 라이선스, 정책 52/52, 타입, 단위 274/274, 패키지 빌드, 공개 타입 통과.
- `CI=1 npm run test:playground -- --workers=3`: Chromium/Firefox/WebKit 363/363 통과.
- Vanilla 항목 수: 수정 전 비운 목록에 `3 items`가 남아 실패, 수정 후 전체
  슬롯 회귀에서 네 어댑터의 0/4 및 1/3 표시를 함께 검증하여 통과했다.
- 패키지 E2E: Chromium/Firefox/WebKit 256/256 통과. 마지막 Playground 항목 수
  표시 변경은 이 패키지 런타임에 영향을 주지 않는다.
- 성능: 1/1 통과. 반복 실행 전후 DOM 506, 이벤트 리스너 380, document 2,
  live node 154 유지. JS Heap 5.03 → 5.25 MB. 이는 마지막 Vanilla 수 표시 변경
  전 실행한 React 25개 예제 반복 검증이다.
- 최종 `verify`와 브라우저 게이트를 동시에 실행한 시도에서는 정책 테스트의
  Playground 재빌드가 미리보기 파일을 교체하여 서버가 ENOENT로 종료했다.
  연결 거부가 반복되어 해당 실행을 중단하고, 빌드 완료 후 CI 전용 서버로
  브라우저 게이트를 순차 재실행하여 363/363 통과했다. 제품 회귀와 구분한다.
- 사용자 문서 검사 9/9, `git diff --check`, 변경분 Gitleaks 검사 통과.
  최종 로그는 아래 증거 폴더의 `verify.log`, `playground.log`, `package-e2e.log`,
  `performance.log`, `docs.log`에 보존한다.

## 직접 조작 증거

수정 후 Chromium headed 브라우저에서 실제 포인터/선택기 조작으로 확인했다.
아래 파일은 로컬 `output/playwright/2026-09-22-human-review-fixed/`에 보존한다.

| 시나리오 | 관찰 결과 | 증거 |
| --- | --- | --- |
| React/Vanilla 왼쪽 모두 이동 후 한 카드 복귀 | header → Placeholder → footer, 드롭 후 header → Build → footer | `react-placeholder.png`, `react-dropped.png`, `vanilla-placeholder.png`, `vanilla-dropped.png` |
| Vanilla 항목 수 | 비운 뒤 0/4, 복귀 뒤 1/3 | `vanilla-final-result.txt` |
| React 카드 전체/제목 드래그 | 본문 설명에서 Build 이동, 제목에서 Design 이동, 핸들 모드 복귀 | `card-mode.png`, `title-mode.png` |
| React 허용 사용자 스타일 | Placeholder 3px dotted, visible | `accepted-custom.png` |
| React 거부 사용자 스타일 | Placeholder hidden, 대상 not-accepted, 보라색 3px dashed outline | `rejected-custom.png` |

자동 게이트의 네 어댑터·세 엔진 범위와 위 직접 관찰 범위를 구분한다.

## 검증 경계

- 기억한 footer 경계를 유지하는 수정이다. 최초부터 빈 임의 DOM의 비정렬 요소가
  header인지 footer인지 자동 추론하는 새 API는 추가하지 않았다.
- 기존 GIF는 9월 16일 촬영 당시 장면이다. 이번 비교 컨트롤을 포함한 신규 GIF는 아니다.
- 앞선 tarball·consumer·native Safari 기록은 이번 코드 변경 전 결과이며 그대로
  적용할 수 없다. 발행 전 최종 artifact 기준 검증이 필요하다.
- 기존 로컬 증거와 사용자 소유 `reports/2026-07-27.md`를 보존한다.
- 이번 변경의 커밋, 원격 push, PR 생성, 태그·Release·npm 발행은 수행하지 않았다.
