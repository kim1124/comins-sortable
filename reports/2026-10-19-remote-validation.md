# 기능·성능 검증 및 원격 진행 — 2026-10-19

## 범위

사용자 승인에 따라 기존 renderer 확장·Safari 선택 보호·메모리 정리 변경과
Governance v1.12 적용본을 커밋하고 원격 PR·CI를 진행한다. 패키지 버전은 0.1.6을
유지한다. npm publish·Release·태그·배포·PR 병합은 이 작업에 포함하지 않는다.

정식 Governance 기준은 `68309e2d27d4727ee3727a651343963766ff067e`이다.
Contract·managed guidance/config가 일치하며 정식 역할 문서·receipt를 동기화했다.
역할 파일 설치는 실제 세션의 모델 전환을 증명하지 않는다.

## 로컬 검증

- 메모리 수정 완료 후보의 기능 검증: Core E2E 301, Playground 749 PASS.
- 같은 후보의 Performance 13 PASS: 새 메모리 회귀 8 + 기존 자원 5.
- 기존 acceptance manifest의 source 42개·검증기 4개·관련 179파일 해시를 대조하여
  변경 없는 성공 증거를 재사용한다. 이후 변경은 Governance 문서/receipt와
  후속 보고서 및 검토 문서이며 런타임·브라우저 fixture·lockfile은 유지한다.
- PASS: 코드 커밋 `676df18`을 생성물 없는 독립 checkout에서 npm ci --ignore-scripts
  후 verify 실행. 정책 77·unit 331 및 라이선스·타입·빌드·Vue SFC 양성/음성 타입 통과.
- PASS: 코드 커밋 `676df18`의 benchmark 전체 36조건(12×3배치), 조건별 30표본,
  기능 assertion·empty transfer·pageErrors 0·반복 500회·destroy 10회 자원 검사.
  Playwright 1.64.0 / Chromium 156.0.8078.4, dirty=false. 시간 측정 중 다른 로컬
  build/browser 검사는 동시에 실행하지 않았다.
- CPU 1×·5,000항목·1영역·animation off의 activation 중앙값/p95는 기준
  8.4/10.9ms → 현재 7.3/9.3ms였다. move p95는 8.4→9.0ms로 증가했다.
  CPU 4×의 같은 조건 activation은 37.1/45.7ms → 26.8/33.2ms였다.
  기준은 기존 독립 설치의 main `07015743`, 같은 browser·fixture·30표본×3배치다.
  callback 시간이며 입력부터 화면 표시 지연이나 코드 인과·전체 성능 향상을
  증명하지 않는다. 원시 JSON과 조건별 비교는 ignored 로컬 증거에 보존한다.
- 반복 warm/최종 heap은 3.116/3.043MiB, listener 39개 유지, marker 0개.
  destroy 10회 후 heap 2.761MiB·nodes 13·listener 37개였다. 이 fixture 결과를
  모든 소비자 renderer의 무누수 보장으로 일반화하지 않는다.
- PASS: 현재 코드의 exact tgz를 최소 peer 소비자 import·공개 타입·Vue SFC
  양성/음성 검증에 그대로 전달했다. 같은 artifact를 표준 tar로 추출한 후
  Gitleaks 검사도 통과했다. npm 발행은 하지 않았다.
- PASS: 전체 공개 후보 파일 민감정보·공개 Git identity 검사.
- 첫 원격 diff 검사는 새 진단 파일의 EOF 빈 줄 1개로 실패했다. 로컬에서 unstaged
  diff만 검사하여 신규 파일의 커밋 diff를 놓쳤다. 빈 줄을 제거하고 main..HEAD 범위
  검사를 다시 수행해 통과했다. 동작·허용치 변경이 아닌 검증 범위 누락의 보완이다.

## 원격 검증

- 기존 main ruleset은 PR과 Sensitive data CI 성공을 요구한다.
- [PR #46](https://github.com/kim1124/comins-sortable/pull/46) 생성 및 기능 브랜치 push 완료.
- 첫 CI `39196165647`: Sensitive data의 스캔·identity·license·계약 검사는 통과했으며
  마지막 diff 단계에서 EOF 빈 줄로 실패했다. 후속 Browser/Performance는 실행되지
  않은 상태로 성공으로 계산하지 않는다.
- 형식 수정 커밋 `a307ceaa7f9733606aa592ff721e07bc2ea73879`의 CI
  [39196258864](https://github.com/kim1124/comins-sortable/actions/runs/39196258864)에서
  Change scope·Sensitive data·Package 및 Core E2E 통과를 확인했다.
- 마지막 성공 조회 시 Playground 실행 중이었다. 이후 자동 승인 검토 모델의
  용량 부족으로 CI 상태 조회 명령이 두 번 실행되지 않았다. 이 오류는 제품·테스트
  실패나 안전성 판정이 아니다. 우회하지 않았으며 최종 Browser·Performance 및
  mergeability는 당시 미확인이었다.
- 이후 공개 Playground 검토를 선행한 뒤 조회를 재개했다. 아래 성공 결과는 실제
  조회로 확인했으며 이전 미확인 상태와 구분한다.
- PASS: 코드 커밋 `a307cea`의 CI `39196258864` 전체 SUCCESS. Change scope·
  Sensitive data·Package·Browser·Performance가 모두 통과했다.
  원격 Core E2E 301건(2.0분), Playground 749건(13.3분), Performance 13건(4.2분),
  CI의 benchmark 1배치가 통과했다.
- 조회 시 PR head는 `a307cea`, mergeable=MERGEABLE, mergeStateStatus=CLEAN이었다.
  보고서만 추가하는 후속 커밋에서는 모듈 경로 규칙에 따라 코드 job이 skip될 수
  있으며, 위 마지막 코드 커밋의 전체 성공과 후속 문서/보안 검사를 구분한다.

## 잔여 범위

WebKit 자동화는 native Safari 실기기 검증과 구분한다. native Safari는 기존 화면
잠금으로 미검증이다. 동적 transform 36건의 진단 실패는 보류한 지원 범위이며,
이번 기능 완료나 정적 transform 통과로 덮어쓰지 않는다. 키보드·3D 및 새 편의 API도
범위 밖이다. 현재 변경에 대한 전체 보안 감사 또는 무누수 일반 보증은 아니다.
원시 snapshot·검증 로그·기존 dirty 사본은 ignored 로컬 증거로 보존한다.

## 공개 Playground 검토 선행 정정

원격 push/PR을 공개 Playground 성능 검토보다 먼저 진행한 순서 오류를 인정한다.
추가 원격 갱신을 중지하고 [공개 Playground 검토](2026-10-19-playground-performance-review.md)를
로컬에서 먼저 마쳤다. 공개 자원 5건, 후보 60조건, 기준 공통 48조건 및 종료 지연
집중 교대 24조건 실행을 확인했다. 새 renderer 옵션의 매회 실제 host 확인과
초기화 없는 120회 공개 화면 반복을 포함한다. 이후 원격 CI 확인을 재개한다.
