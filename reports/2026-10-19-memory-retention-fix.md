# 메모리 보유 결함 수정 — 2026-10-19

상태: 로컬 구현 및 계획한 검증 완료.
기준: HEAD `07015743f8588b50d0d5118fa9640dad34c96ef4` + 미커밋 변경 overlay.
로컬 미게시 Governance v1.12 적용. 버전 0.1.6 유지. 원격 쓰기 없음.
[수정 계획](../docs/superpowers/plans/2026-10-19-sortable-memory-retention.md)을 따른다.

## 변경

- `src/core/session.ts`: production history 배열·push 제거. 현재 상태와 전이 유효성 유지.
- `src/core/dispose-once.ts`: scope 밖 독립 once-cell, 재진입 전 참조 해제,
  모든 정리 시도 후 첫 동기 오류 전달.
- `src/core/scope.ts`: 개별/전체 종료가 동일 disposer 사용, finally의 public 내부 참조
  해제, 정리 예외 후 나머지 자원 해제, renderer 예외의 기존 onError 경로 유지.
- `src/vanilla/create-sortable.ts`: 반환 disposer의 identity별 관리·전체 해제 및 기존
  transaction.release 호출로 잔여 transaction 참조 해제.
- 상태 그래프·재진입·중복 호출·같은 ID 재등록·예외·commit 대기 종료 unit과 내부 진단 보완.
- 새 memory-retention suite/fixture/heap 수집기, Performance 설정·CI 경로·증거 업로드
  및 관련 policy/routing 검사 보완. public Playground UI에 진단 기능을 추가하지 않았다.
- CHANGELOG Unreleased 기록. 기존 renderer/Safari/Governance 변경은 보존했다.

## 동일 검증기의 전후 결과

Playwright 1.64.0 / Chromium 156.0.8078.4. Core와 Vanilla 각각 동일 scope에서
pending 10,000회 warm-up + 100,000회씩 3배치. 모든 샘플에 두 프레임·두 번째 GC 적용.
별도로 capture stub 없는 mouse 클릭·실제 commit·취소를 각각 20회 확인했다.

| 대상 | 수정 전 post-warm heap 변동 | 수정 후 | 살아 있는 instance/history |
|---|---:|---:|---|
| Core | 3,511,044 bytes | 24,728 bytes | 1 / history 없음 |
| Vanilla | 3,508,552 bytes | 15,012 bytes | 1 / history 없음 |

수정 전 history는 각각 620,201개, backing store 3,594,492 bytes였다.
완료 disposer를 보관하는 세 종료 순서 모두에서 수정 전 instance 1개가 남았으나,
수정 후에는 해당 instance 0개, DOM nodes 7개로 빈 fixture 기준에 복귀했다.
listener도 빈 fixture 기준과 같았다. 외부 handle 참조 제거 대조도 수행했다.
수정 전 8 FAIL은 의도한 결함 검출이며, 수정 후 같은 검증기 8건이 통과했다.
heap 임계값 1MiB 및 기존 자원 허용치를 늘리지 않았다. live instance 수와 history
존재를 별도로 집계하여 history 제거를 객체 0개로 오판하지 않는다.

합성 pending 입력은 대량 반복용이며 mouse 대조는 실제 브라우저 입력이다.
물리 장치·native Safari 검증이나 모든 소비자 callback/DOM의 무누수를 보장하지 않는다.

## 검토와 실패 처리

- 구현 전 집중 unit RED 4건: 이력 누적 및 정리 중 동기 예외의 누락을 재현했다.
- Astra high로 지정된 독립 reviewer가 committing 상태 renderer.destroy 예외의
  onError 우회 회귀를 발견했다. 세 종료 동작 및 renderer/native 동시 예외 4건을
  RED → GREEN으로 수정하고 읽기 전용 재검토에서 해소를 확인했다.
- 최종 집중 unit 73건 및 typecheck PASS. 정확한 런타임 모델 식별자는 독립 관측 불가.
- 첫 전체 verify는 CI 경로 검사에 새 경로를 추가한 뒤 기존 인접 패턴 기대값이 맞지 않아
  policy 단계에서 실패했다. 기대값을 보완하고 routing/policy 검사를 통과했다.
- 해당 진단 사본에는 policy 실행 생성물이 남아 있어 최종 소스를 새 사본에 반영했다.
  최종 acceptance는 생성물·의존성이 없는 시작 상태에서 독립 npm ci 후 실행했다.

## 최종 검증

- PASS: npm ci --ignore-scripts. 설치 감사 0 vulnerabilities는 정적 보안 검토와 구분한다.
- PASS: npm run verify — 정책 77건, 단위 331건, 라이선스·타입·빌드·Vue SFC 양성/음성 타입.
- PASS: npm run verify:performance — 새 메모리 8건과 기존 자원 5건, 합계 13건 PASS.
- PASS: npm run test:e2e -- --workers=4 (verify:e2e와 동일 suite) — 301건.
- PASS: npm run verify:playground — 공개 Playground 749건.
- PASS: 현재 source 42개·고정 검증기 4개 및 acceptance 관련 179파일 hash parity.
- PASS: 상태 이력 내부 진단 — 10,000회, idle, storesHistory=false.
- PASS: 이번 작업 변경 21개 파일의 Gitleaks 민감정보 검사, git diff --check.
- 미실행: 원격 CI, native Safari, 릴리스 exact-artifact/소비자 게이트 및 새 전체 보안 스캔.
  이들은 현재 로컬 메모리 수정의 검증 결과에 포함하지 않는다.

## 증거와 범위

초기 315파일 manifest와 기존 dirty 목록, 고정 검증기 manifest, 최종 source 42파일
manifest, 수정 전후 JSON·로그·원시 snapshot은 ignored 로컬 증거로 보존한다.
로컬 증거 색인은 `.local/memory-fix-2026-10-19/evidence-locations.json`,
고정 검증기는 `verifier-manifest.json`, 최종 acceptance 대조는
`acceptance-parity-manifest.json`에 기록했다. 독립 검증 사본의 위치는 위 ignored 증거 색인에만 기록한다.
CI는 benchmark JSON과 playwright-report/memory-retention을 실패 시에도 보존하도록
구성했으며 실제 원격 CI 실행 결과를 의미하지 않는다. 기존 node_modules/dist는 보존했다.

이번 범위는 메모리·정리 회귀다. 이전 보안 스캔은 이전 source snapshot을 대상으로
수행한 별도 결과이며 현재 변경의 새 보안 스캔으로 표현하지 않는다.
동적 transform·실제 Safari 잠금 해제 대기·3D·키보드·편의 API는 별도 범위다.
commit·push·배포·publish 및 릴리스 artifact 재생성은 수행하지 않았다.

## 원격 진행 후속

후속 승인에 따른 정식 Governance 동기화와 커밋·기능·성능·CI 검증은
[원격 진행 보고서](2026-10-19-remote-validation.md)에 별도로 기록한다.
위 수치는 메모리 수정 직후의 로컬 overlay 결과다.
