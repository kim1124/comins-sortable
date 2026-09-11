# 0.1.2 사용자 문서와 Playground GIF 갱신

- 작업 일시: 2026-09-11 14:41 KST
- 작업 브랜치: `codex/0.1.2-documentation`
- 기준: `main`의 `a176f03` (PR #24 병합), Comins Contract v1.8

## 변경

- README: 0.1.2 주요 변경, 25개 예제 × 네 어댑터, 지원 peer 범위,
  핸들 기반 React 시작 예제, 검증 명령, 실제 Safari 증거 범위를 정리했다.
- 영문·국문 가이드: 배포본과 후보의 차이, 텍스트 복사와 핸들 입력,
  외부 스크롤, 목록 Host·slot 예제, Tree 렌더 구조, Grid·Swap 차이를 갱신했다.
- 테이블 행·열 중심 Host 예제를 현재 제공하는 목록과 비정렬 slot 예제로
  교체했다. 일반 Host API를 테이블 정렬 지원 근거로 확대하지 않았다.
- `docs/assets/sortable-playground.gif`: 실제 React Playground의 목록 이동,
  다중 선택, Swap Grid, Tree 하위 이동 네 장면으로 교체했다.
  결과는 1080 × 750, 107프레임, 21.9초, 1,034,026바이트다.
- `docs/playground-preview.md`에 촬영 출처·조작·결과·갱신 절차를 기록했다.
  기존 `LICENSE_SCOPE.json`의 first-party/MIT/`example/` 선언이 계속 적용된다.
- 문서 목차, CHANGELOG, 새 후보 검증 현황을 연결했다. 과거 성능·테스트
  조사에는 최신 현황 링크만 갱신하고 당시 실패와 측정값은 보존했다.

## 검증

| 검증 | 결과 |
| --- | --- |
| 정책 검사 | 51/51 통과, 문서 계약·상대 링크·공개 export 포함 |
| 영문·국문 전체 기능 예제 | 18개 TypeScript 검사 통과 |
| README React 예제 | 별도 TypeScript 검사 통과 |
| 라이선스·diff whitespace | 통과 |
| 패키지 build | 통과 |
| GIF | 모든 프레임 decode·크기·반복·재생 시간 검사 및 장면별 육안 확인 |
| 새 tarball | 파일 목록·라이선스·export 검사 및 추출 Gitleaks 통과 |
| 동일 tarball 소비자 검사 | 최소 지원 peers에서 5개 JS export import·CSS resolve 통과 |

GIF의 목록 이동과 다중 이동은 실제 결과 순서를 확인했다. Swap Grid는 두 셀만
교환되고 나머지 18개 위치가 유지되었다. Tree 첫 촬영은 고정 포인터 좌표가
레이아웃 변화 뒤 루트 Area를 가리켰다. release 직전 실제 target bounds와
hit Area를 대조해 확인한 뒤, 현재 목적지를 따라가는 촬영 입력으로 보완했다.
최종 장면은 `tree-children-design` 진입과 Review·Document·Observe 보존을 확인했다.
제품 코드나 데모 모델을 주입·변경하여 결과를 만들지 않았다.

첫 package 생성은 sandbox의 npm cache 쓰기 제한으로 파일을 만들지 못했다.
캐시 접근이 허용된 환경에서 같은 gate를 실행해 tarball 하나를 생성했다.
새 파일의 SHA-256은
`fdf1d894a65fed1bdffb71856b1ef7633f4b846f503d4f92453cd7b565885268`이다.
추출 README·CHANGELOG·dist의 일치를 확인했다. 이전 `c77d883d...` 파일은
갱신한 문서를 포함하지 않으므로 최종 문서 산출물로 재사용하지 않는다.

## 잔여 경계

PR #26의 첫 CI는 Gitleaks와 공개 identity 검사를 통과했지만 추적 자산 검사에
실패했다. 초기 촬영 안내 `docs/assets/README.md`가 `assets` 경로 규칙에 따라
미등록 자산으로 분류되었다. 준비 단계의 라이선스 검사 당시 새 안내 파일은
미추적 상태여서 `git ls-files` 기반 검사에 포함되지 않았다.

동일 커밋의 로컬 라이선스 검사로 실패를 재현한 뒤, 문서를 일반 문서 경로로
옮기고 링크를 수정했다. 검사기·정책·GIF 자산 선언은 변경하지 않았다.
새 경로를 추적 상태에 넣어 라이선스, 정책 51/51, 문서 링크 93개 검사를 통과했다.
이 변경은 npm에 포함되는 README·CHANGELOG·dist를 바꾸지 않으므로 위 tarball의
내용과 검증 근거는 유지된다.

런타임·의존성·설정·테스트 계약은 변경하지 않았다. 전체 단위·브라우저·성능
게이트는 이번 문서 작업에서 재실행하지 않았으며, `a176f03`의 성공 기록과
이번 문서·GIF 검증을 구분한다. 네 어댑터의 실제 Safari 입력 결과는 기존
2026-09-11 기록을 인용했으며 이번 GIF는 Chromium의 React 촬영이다.

로컬 커밋 이후 push·PR·main 병합, npm stage/publish와 태그·Release는 별도 단계다.
기존 미추적 작업 파일은 유지했다. 원본 촬영·실패 take·검증용 파일은 로컬 임시
작업 폴더에 보관하고 배포 패키지에는 포함하지 않았다.
