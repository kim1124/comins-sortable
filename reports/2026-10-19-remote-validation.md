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
- 대기: 고정 커밋을 생성물 없는 독립 checkout에서 npm ci --ignore-scripts 후 verify.
- 대기: 고정 커밋의 전체 benchmark 및 패키지/소비자 보완 검사.
- 대기: 현재 전체 변경의 민감정보·공개 Git identity·diff 검사.

## 원격 검증

- 기존 main ruleset은 PR과 Sensitive data CI 성공을 요구한다.
- 대기: 기능 브랜치 push, PR 생성, 마지막 커밋의 Package·Browser·Performance·
  Sensitive data CI 확인.

## 잔여 범위

WebKit 자동화는 native Safari 실기기 검증과 구분한다. native Safari는 기존 화면
잠금으로 미검증이다. 동적 transform 36건의 진단 실패는 보류한 지원 범위이며,
이번 기능 완료나 정적 transform 통과로 덮어쓰지 않는다. 키보드·3D 및 새 편의 API도
범위 밖이다. 현재 변경에 대한 전체 보안 감사 또는 무누수 일반 보증은 아니다.
원시 snapshot·검증 로그·기존 dirty 사본은 ignored 로컬 증거로 보존한다.
