# 공개 Playground 기능·성능 검토 — 2026-10-19

상태: 로컬 Playground 검토 완료. 검토 수행 중 원격 갱신 중지.

## 순서 정정

공개 Playground 기반 성능 검토를 끝내기 전에 push와 PR #46 생성을 진행한 것은
잘못된 순서 판단이었다. 합성 benchmark 36조건과 별도 heap fixture 8건을 공개
화면 성능 검토의 대체 근거로 사용하지 않는다. 이번 결과를 먼저 검토하고,
검토 완료 전에는 추가 원격 갱신을 진행하지 않는다. 이미 생성한 PR을 병합하거나 발행하지 않았다.

## 대상과 수집 경계

- 현재 런타임: 코드 커밋 `676df18a9faba5ebbc24030d9cc6d83e3e00b573`.
  현재 브랜치 `a307cea`와 런타임 소스는 같다. 후속 차이는 진단 EOF와 보고서다.
- 비교 기준: main `07015743f8588b50d0d5118fa9640dad34c96ef4`의 독립 설치·빌드.
  두 사본은 같은 lockfile, Playwright 1.64.0, Chromium 156.0.8078.4를 사용한다.
- 실제 built 공개 `/examples/...` 화면에서 Vanilla·React·Vue·Svelte를 조작한다.
  CPU 1×/4×, 기본 정렬·두 목록·그리드·트리·기본 feedback·사용자 renderer·
  auto-scroll 56조건. 조건당 warm-up 2회 후 실제 mouse 조작 10회 수집.
  기준에는 새 renderer 기능이 없어 48조건만 직접 비교한다.
- 매 동작마다 실제 시작 area/item, 현재 geometry와 목적지 hit, 최종 모델/DOM,
  drop/escape 사유 및 marker 정리를 검사한다. 실패한 경로의 시간을 성공 자료에
  포함하지 않는다. 키보드 정렬 구현은 범위 밖이며 Escape는 포인터 drag 취소에만 쓴다.
- 활성화는 threshold pointermove부터 공개 runtime의 dragStart 상태 속성 관측까지,
  종료는 pointerup/Escape부터 afterDrag 상태 해제 관측까지의 시간이다.
  MutationObserver 관측 시점으로 callback 단독 실행 시간과 같지 않다.
- 두 rAF 후 시간, frame cadence, 50ms 초과 long task와 CDP main-thread 지표를
  별도로 수집한다. 이 값은 실제 모니터 표시 시점이나 사람의 체감 지연을 직접
  측정한 것이 아니다. 테스트 입력·UI 관측 오버헤드가 포함된 지표도 구분한다.
- 고정된 성능 SLA를 새로 만들지 않는다. 조건당 10표본의 p95는 표본 최댓값이므로
  회귀 의심 조건은 집중 반복으로 재확인한다. 제품 기능 assertion의 PASS를 모든
  성능 특성의 PASS로 표현하지 않는다. 공개 예제의 실제 항목 수를 기록하며,
  이 결과로 5,000항목 공개 화면 성능을 주장하지 않는다.

## 공개 화면 자원 반복

새 실행의 기존 Playground 자원 gate 5건은 모두 PASS(3.2분)다.
React 전체 기능 순회와 네 어댑터의 drag/cancel·중첩·renderer mount/unmount 반복을
포함한다. remount가 포함되므로 장수 동일 화면 보유 검증과 구분한다.

추가로 네 어댑터 각각 초기화·화면 전환 없이 같은 공개 Area DOM을 유지하며
사용자 renderer로 실제 이동·취소를 20회 warm + 100회 반복한다. 두 프레임과
두 번째 GC 후 heap·DOM·listener를 읽고 기존 자원 허용치를 유지한다.
타이밍 수집기는 별도 페이지이며 이 heap 수집에 설치하지 않는다.

## 수집기 점검 기록

- 첫 수집기의 탐색/grep 및 evidence 경로 설정을 점검·보완했다. 제품 실패가 아니다.
- 공개 ‘데이터 초기화’가 renderer 옵션도 끄는 것을 소스에서 확인했다.
  첫 실행의 renderer 조건 8건은 실제 새 경로를 검증하지 못했으므로 최종 결과에서
  제외한다. 최초 실행은 ignored 진단 증거로만 보존한다.
- 매 반복 초기화 직후 옵션을 켜고 aria-pressed, 실제 overlay 및 placeholder 내용까지
  확인하도록 수정했다. 수정 후 수집기를 양쪽 사본에 동일하게 고정하여 전체 조건을
  새로 수집한다. 원시 JSON·스크린샷·collector/source hash는 ignored 로컬 증거에 보존한다.

## 결과

- PASS: 새 공개 Playground 자원 gate 5건(3.2분).
- PASS: 후보의 화면 성능 56조건 + 동일 화면 renderer 자원 4조건, 합계 60건(7.3분).
- PASS: 기준 main의 공통 48조건(4.1분). 기능이 없는 renderer 8건과 현재 전용
  장수 화면 4건은 명시적으로 skip했다. 통과 건수에 포함하지 않는다.
- 후보와 기준의 소스·수집기 해시를 확인했다. 원격 CI나 합성 fixture 결과를
  이번 공개 화면 측정값으로 대체하지 않았다.

각 조건당 10회 측정한 p95 중 최댓값은 다음과 같다. 조건 집합의 최댓값이며
같은 단일 조건의 전후 비교나 엔진 단독 실행 시간이 아니다.

| CPU | 대상 | 활성화 관측 p95 최대 | 종료 관측 p95 최대 | frame interval p95 최대 | 50ms 초과 long task |
|---|---|---:|---:|---:|---:|
| 1× | 기준 공통 24조건 | 0.8ms | 30.2ms | 16.8ms | 0 |
| 1× | 후보 28조건 | 1.0ms | 30.4ms | 16.8ms | 0 |
| 4× | 기준 공통 24조건 | 2.4ms | 24.5ms | 16.8ms | 0 |
| 4× | 후보 28조건 | 3.7ms | 35.2ms | 16.8ms | 0 |

CPU 4×의 최초 소표본에서 일부 종료 지연이 10~12ms 증가했다. 기준과 후보를
교대로 3배치 실행하고, 조건당 30표본을 합산하여 재검토했다. 제품·수집기는
수정하지 않았으며 결과 파일을 배치별로 보존했다. 다음 표는 정확히 같은 조건의
pointerup부터 afterDrag 속성 해제까지 관측 p95다.

| CPU 4× 조건 | 기준 | 후보 | 차이 |
|---|---:|---:|---:|
| Vanilla 기본 feedback | 6.2ms | 6.6ms | +0.4ms |
| Vanilla 트리 | 6.2ms | 7.2ms | +1.0ms |
| Vanilla 그리드 | 5.9ms | 6.4ms | +0.5ms |
| React 두 목록 | 23.0ms | 23.7ms | +0.7ms |

각 반복의 기능 assertion이 모두 통과했다. 집중 반복 24조건 실행(4조건×2revision×3배치)
모두 통과했고, frame interval p95는 16.7~16.8ms, long task는 0이었다.
최초 10~12ms 차이는 동일한 크기로 지속 재현되지 않았다. frame 경계·실행 시점
변동의 가능성이 있지만 정확한 인과를 증명한 결과는 아니다. 큰 종료 회귀로
확정하거나 모든 조건의 성능 향상으로 요약하지 않는다.

동일 화면·Area DOM을 유지하는 공개 renderer 20회 warm + 100회 후속 결과:

| 어댑터 | warm → 최종 heap | DOM nodes | listener |
|---|---:|---:|---:|
| Vanilla | 4.320 → 4.592MiB | 598 → 598 | 216 → 216 |
| React | 4.523 → 4.795MiB | 620 → 620 | 359 → 359 |
| Vue | 4.992 → 5.329MiB | 627 → 627 | 216 → 216 |
| Svelte | 4.858 → 5.168MiB | 695 → 697 | 216 → 216 |

heap 증가 0.27~0.34MiB, DOM +0/+2, listener 증가 0으로 기존 허용량 안이었다.
heap이 전혀 늘지 않았거나 무한 반복에서도 안정화된다고 주장하지 않는다.
이동·취소·실제 renderer host·모델/DOM 순서·종료 사유·marker 정리를 확인했다.

로컬 ignored 증거는 `.local/playground-performance-review-2026-10-19/`에 보존한다.
`candidate-results.json`/`baseline-results.json`, 원시 `candidate-data`/`baseline-data`,
스크린샷, `focus/` 배치별 결과, `ui-comparison.json`/`focused-comparison.json`,
source/collector manifest로 범위와 수집기를 식별한다.

## 검토 결론과 다음 단계

공개 Playground의 실제 동작·반복 자원·화면 성능 검토를 먼저 완료했다.
이번 표본에서 지속 재현되는 큰 지연 악화나 기존 허용량을 넘는 자원 증가는
확인하지 못했다. 제품 코드나 공식 gate를 완화하지 않았다.
이제 기존 원격 승인 범위에서 CI의 정확한 결과를 확인하며, 이번 보고서의
로컬 검토와 원격 CI 결과는 따로 기록한다.

## 범위와 잔여 위험

native Safari/물리 장치 및 CPU 에뮬레이션과 다른 실제 저성능 장치는 미검증이다.
동적 transform 진단 실패는 보류한 지원 범위이며 이번 결과로 해소됐다고 하지 않는다.
공개 예제·신뢰 renderer 범위의 관측이며 모든 소비자 callback·DOM의 무누수 보증이나
전체 보안 감사가 아니다. 제품 소스·공식 테스트·CI 설정은 이번 검토에서 변경하지 않는다.
