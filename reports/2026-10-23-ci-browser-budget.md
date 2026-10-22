# Browser CI 실행 분리와 재검증 — 2026-10-23

## 문제와 변경

PR #46의 실행 `39225144298`은 Core 301건 통과 뒤 Playground 실행 중
Browser job의 20분 제한으로 종료됐다. 해당 Performance는 선행 실패로 생략됐다.
같은 런타임의 독립 로컬 검증에서는 Playground 749건과 성능·메모리 13건이 통과했다.

`.github/workflows/verify.yml`에서 Core와 Playground를 두 matrix 실행으로 나누고
각각 기존 20분 제한을 유지한다. `fail-fast: false`로 다른 suite의 결과도 수집한다.
기존 `Browser` 검사 이름은 집계 job에 유지하며 모든 suite가 성공해야 통과한다.
Performance는 이 집계 결과를 계속 요구한다. 테스트·재시도·자원 허용치는 변경하지 않는다.
각 suite의 로그와 실패 artifact를 업로드하도록 구성한다. 강제 종료나 runner 손실 시
artifact 보존까지 보장하는 구성은 아니다.

workflow 자체가 변경돼도 Package·Browser·Performance를 모두 선택하도록 보완했다.
관련 계약 검사는 routing과 집계 명령의 success/failure/cancelled/skipped 처리를 검증한다.
변경 파일은 workflow와 `test/verification-routing.node.mjs`,
`test/sensitive-data-gates.node.mjs`, 이 보고서다. 의존성·제품 코드는 변경하지 않는다.

## 검증

- 변경 전: workflow 자체 routing과 suite 분리 검사 2건 실패로 기존 구성의 한계를 확인.
- 변경 후: routing/security 계약 검사 22건 PASS.
- 로컬 전체 verify의 첫 실행 PASS. 최종 변경 커밋의 독립 설치·전체 verify는 별도 기록한다.
- 아스트라 읽기 전용 검토: 게이트 약화·실패 은폐 차단 finding 없음.
- 기존 런타임 `888d0a9`의 신규 독립 실행: Playground 749건, 성능·메모리 13건 PASS.
- 합성 benchmark: 12조건×30표본·1배치, 500회 drag/remount·destroy 11회 PASS.
  CPU 4배 지연·5,000항목·애니메이션 ON의 activation/move p95는 54.0/59.2ms로,
  60fps 보장이나 이전 revision 대비 개선·회귀 없음의 근거로 해석하지 않는다.

## Native Safari 추가 확인

잠금 해제 후 동일 검증 빌드를 재시작하고 실제 공개 Playground를 조작했다.
네 어댑터 모두 renderer ON 상태에서 todo의 Build를 done으로 이동해
최종 todo Research/Design/Review, done Release/Build, drop 종료와 시각적 정리를 확인했다.
각 어댑터에서 본문 Interaction system 선택이 가능하고 sort 이벤트 수가 유지됐다.
Svelte에서는 Design의 done 이동을 거부해 not-accepted·순서 불변을 확인한 뒤,
renderer OFF·accept ON의 다음 이동이 drop으로 끝나고 done Release/Design/Build가 됐다.

첫 Vue 시도의 좌표 배율 오해에 따른 무동작과 스크롤 후 outside 종료는 성공 자료에서
제외했다. 현재 좌표를 다시 읽은 성공 이동과 구분한다. 제목 핸들 검증은 이전 기록이며
이번에 다시 실행하지 않았다. 활성 드래그 중 renderer 내용·update·inert 속성,
native Escape/pointercancel 및 Safari heap/frame profiling은 미검증이다.

## 잔여 확인

로컬 성공과 CI 구성 검토만으로 원격 시간 초과 해소를 선언하지 않는다.
수정된 정확한 commit의 원격 Browser 두 suite와 Performance 결과를 확인해야 한다.
병합·배포·publish는 이 작업 범위에 포함하지 않는다.
