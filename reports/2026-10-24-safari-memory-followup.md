# Safari 메모리 후속 실행 — 2026-10-24

상태: **제품 JS 소유 누수 미재현. Inspector 연결 조건의 native DOM 증가 재현. 전체 native 메모리 수용은 INCOMPLETE.**
기준: `4fcdba1e40c8aaa387611f559780c571e2b1b851` + 아래 미커밋 도구·문서·대조군.
원격 쓰기·패키지 버전·런타임 제품 코드 변경 없음.

## 수행한 변경

- `scripts/analyze-safari-memory.mjs`: Inspector v3 분석 CLI. 세션·자산·매핑을 검증하고 self-size, 코드 블록, raw 클래스 수, Reader 전역 및 동일 세션 ID 증감을 출력한다. native 문서 수나 전체 무누수 PASS를 추정하지 않는다.
- `test/diagnostics/safari-memory-analysis.node.mjs`: 세션 불일치, 자산 해시·매핑·schema, internal flag, control 및 입력/출력 보존 회귀 11건.
- `test/fixtures/safari-memory/counter.html`, `history.html`: URL 변경 외의 입력·카운터·텍스트 처리가 동일한 별도 대조군. 각 60회 진단 입력을 수행했으나 기록 조건이 달라 동등 대조 수용 자료로 사용하지 않았다.
- `docs/verification/safari-memory.md`: 원본·세션·GC·소유 객체·한계 수집 계약. 후속 계획·설계 문서에 실제 진행 상태를 반영했다.

## 검증과 검토

- 초기 분석 계약 6 RED→6 GREEN. 기존 native 원본 3개의 총 self-size 및 클래스 매핑 재집계가 기록과 일치했다. 이는 새로운 native 반복 검증 결과가 아니다.
- 새 격리 clone에 정확한 미커밋 overlay를 적용하고 `npm ci --ignore-scripts`, `npm run verify`, 전용 분석 검사를 실행했다. 설치·공식 verify가 통과했다.
- Sol 6.1/high로 지정한 새 문맥 읽기 전용 검토에서 Important 1건을 확인했다. 출력 경로가 symlink/hardlink이면 입력 원본을 덮어쓸 가능성이 있었다. 합성 원본으로 3 RED를 재현하고 `writeFile`의 독점 신규 생성(`wx`)으로 수정했다. 동일 경로 보호까지 포함하여 출력 보존 검사는 10/10 GREEN이었다. 이후 ID 공간 검사까지 11/11 GREEN이다. 실제 heap 원본은 변경하지 않았다.
- Minor: Reader own-property·특수 클래스 키·실제 ID 증감의 추가 음성 대조는 미추가이다. 검토에서 현재 오판은 발견되지 않았으며 도구가 전체 누수 PASS를 출력하지 않는 한계를 유지한다.

## 새 native React 검증

Safari 27.0.1의 공개 production Playground에서 준비 드래그 20회, 측정 드래그 100회씩 3배치, 실제 handle→simple 예제 전환을 수행했다. 측정 중 reset·remount·URL 변경은 없었다. 매회 최종 순서와 drop 검사가 통과했다. 매회 start payload·live hit·marker를 별도 보존한 기록은 없어 전체 드래그 세부 수집 계약까지 충족했다고 표현하지 않는다.

같은 Inspector 세션에서 idle 기준 5개, 배치 후 3개, 전환 후 1개를 수집했다. 새 분석 도구로 자산 해시·매핑 및 원본을 다시 검증했다. 이 결과는 기존 20회 드래그 증거와 구분되는 새 실행이다.

| 시점 | 총 self-size bytes | 코드 블록 bytes | 코드 외 bytes |
| --- | ---: | ---: | ---: |
| idle 5 | 5,709,222 | 0 | 5,709,222 |
| 100회 | 9,990,846 | 4,130,942 | 5,859,904 |
| 200회 | 10,099,694 | 4,256,342 | 5,843,352 |
| 300회 | 10,114,114 | 4,270,506 | 5,843,608 |

Sol 6.1/high로 배정한 후속 retainer 분석은 다음을 확인했다. 배정 설정과 제공자의 실제 실행 메타데이터 관측은 구분한다.

- 대상 SessionMachine/AreaRegistry/GeometryCache와 캡처 scope ID가 반복 중 동일했다. 실제 예제 전환 후 기존 대상 4개와 scope가 캡처하던 참조 대상 31/31개는 수집되었다.
- 이전 current 객체는 다음 배치 snapshot에서 없어졌다. Function·LexicalEnvironment·Array·Object·Map·Fiber 수는 100→300회 고정이었다.
- 이벤트 LI wrapper는 27개로 유지되며 매 배치 이전 20개가 수집되고 새 20개로 교체되었다. 전환 후 추가 20개도 수집되어 7개가 남았다. 제품 로그의 최대 20개 계약과 일치한다.
- 200→300회 코드 외 증가 256 bytes는 internal SymbolTable 4개와 일치했다. 기준→300회 총 증가 중 코드 블록 범주는 96.95%였으나, 전부 JIT 또는 무해한 증가라고 단정하지 않는다.
- 예제 전환 후 Reader 속성을 가진 신규 전역 4개가 나타났지만 기존 제품 scope는 수집되었다. 전환 후 총량 증가를 종료된 제품 인스턴스 누수로 분류하지 않는다.

**판정: 이 React 조건에서 수정할 제품 누수는 재현되지 않았다. 전체 메모리 수용은 INCOMPLETE이다.** native DOM identity·isConnected·리스너 수를 직접 관측하지 못했고, 코드 증가의 완전한 소스 귀속·평탄화 및 다른 어댑터 조건은 남아 있다. 제품 코드는 변경하지 않았다.

## 새 Vue·Vanilla·Svelte 검증

모두 같은 production 자산에서 준비 성공 20회, 측정 성공 300회와 실제 handle→simple 예제 전환을 수행했다. 각 어댑터의 idle 기준 5개와 100회 단위 힙을 보존했다. 다음은 각 runtime의 마지막 100회 변화이며 어댑터 간 전체 힙을 직접 비교한 표가 아니다.

| 어댑터 | 200→300회 전체 self-size 변화 | 코드 외 변화 | 종료 후 대상 Core·scope·캡처 31개 |
| --- | ---: | ---: | --- |
| React | +14,420 bytes | +256 bytes | 수집 확인 |
| Vue | +35,108 bytes | +1,600 bytes | 수집 확인 |
| Vanilla | −7,080 bytes | 0 bytes | 수집 확인 |
| Svelte | −10,964 bytes | −64 bytes | 수집 확인 |

Vue에는 성공 횟수 외 최초 순서 미변경 입력 4건 및 Escape 취소 2건이 있었다. 취소 후 current가 idle 형태로 복귀하고 관련 일시 객체가 후속 표본에서 수집된 것은 확인했다. 무중단 정렬 300회 PASS로 처리하지 않는다. Vanilla·Svelte에서는 각 1회 최초 AX 관측 지연이 있었고 다음 AX/화면에서 예상 순서와 drop을 확인했다. 이 두 어댑터의 측정에는 취소·초기화·remount가 없었다.

모든 결과는 관측 범위의 제품 JS 소유 객체 안정성에 한정된다. 마지막 구간의 엔진 메타데이터 증가 또는 코드 범주 변화만으로 전체 무누수를 선언하지 않는다.

## 종료 DOM 잔존 후속 조사

Svelte 종료 직후 Core와 action은 수집됐으나 이전 area div가 native/opaque root에 남았다. root로 연결되지 않는 Svelte 객체 집합도 별도로 관측됐다. 같은 페이지에서 추가 idle 2개와 runtime 교체 5회·20회 표본을 수집했다.

- rootless 반응 객체 집합은 후속 교체에서 수집되며, 마지막 종료 세대 1개 수준으로 제한됐다. rootless 기록을 강한 GC root 누수로 분류하지 않는다.
- Inspector 연결·할당 수집 상태의 대상 area realm에서 native root div는 교체마다 3개씩 늘었다. 이는 엄격한 종료 DOM 정리 관측에서 실패이며, 제품 JS의 직접 보유 경로는 확인되지 않았다.
- Inspector를 닫은 별도 대조에서는 초기 종료 1회와 추가 handle→simple 20회를 수행했다. 재연결 후 독립적으로 식별한 대상 realm의 root div/그중 root-only 수는 기준 **3/2 → 3/2**였다. 원래 연결 실험의 65/64와 다르다. 서로 다른 힙의 숫자 ID를 직접 비교하지 않았다.
- **연결 재도전:** 분리 실험 이후 같은 페이지·같은 힙을 유지한 채 Inspector 연결 상태로 20회를 추가하자, 대상 realm root div/root-only는 **3/2 → 62/61**로 증가했다. 별도 live realm은 **17/1**로 고정됐다. 기준 원본 4개의 재내보내기 해시와 주요 ID·클래스 anchor 8개의 연속성도 확인해 다른 VM 비교를 배제했다. 앞선 65/64에 수치를 맞추지 않고 실측 62/61을 기록한다.
- 비교한 구성은 검사 대상 1세트와 별도 live 1세트(Core 클래스별 총 2개)다. 전체 힙의 다른 세대·realm 객체를 검사 대상 누수에 합산하지 않는다. 연결/분리 효과가 재현됐지만 Inspector의 세부 native 보유 소스 위치까지 확정하지 않았다.

이 연결/분리/재연결 대조는 **관측한 DOM 보유 증가와 Inspector 연결·힙 수집 조건의 강한 연관성**을 확인했다. 제품 Core를 선제 수정하는 분기는 선택하지 않았다. 이 결과를 native root가 잡은 주체의 소스 위치까지 확정한 것으로 표현하지 않는다. Safari Inspector·native 접근성·브라우저 내부의 보유 이유는 raw snapshot에 없다. 현재 제품 cleanup 변경을 정당화할 제품 소유의 강한 보유 경로는 재현되지 않았다.

## 분석기 ID 공간 결함 수정과 추가 검증

전체 페이지 탐색 뒤 같은 Inspector 연결과 target ID에서도 숫자 heap ID가 다른 클래스 객체에 재사용된 것을 확인했다. 분석기에 동일 ID의 클래스가 달라지면 비교·출력을 중단하는 검사를 추가했다. 합성 회귀 1 RED→11 GREEN, 실제 잘못된 Svelte→counter 탐색 비교 거부, 동일 힙 5개 실행의 정상 재집계를 확인했다.

이는 ID 연속성의 완전한 자동 증명이 아니다. 동일 클래스 ID 재사용은 검출을 보장하지 못하며, 실행 중 prototype/클래스 변경도 보수적으로 거부한다. 전체 탐색·Inspector 재연결은 별도 manifest와 세션으로 분리하도록 수집 문서를 수정했다. 출력의 `wx` 원본 보존 및 전체 `INCOMPLETE` 판정은 유지했다.

마지막 코드 변경 후 격리 clone의 `npm run verify`와 전용 검사 **11/11**을 다시 통과했다. 구현·검사·수집 문서의 원본/격리 사본 해시가 일치했다. 후속 읽기 전용 검토는 Critical/Important/Minor 각각 0건이며 검토자가 새로 수행한 검사는 `node --check`다. 테스트 11건과 실제 원본 검증은 실행 작업자의 새 결과다.

## 미완료와 환경 상태

처음의 좌표 오류는 새 Safari 창으로 분리하여 복구했고, 이후 Mac 잠금은 사용자 해제 후 검증을 재개했다. 현재 Mac 잠금을 후속 차단으로 보고하지 않는다.

동등 counter/history fixture는 각각 60회 입력했으나 history 쪽 기록 모드가 달랐고 이전 컨텍스트가 힙에 섞인 점을 확인하여 동등 대조 PASS로 사용하지 않았다. Inspector 연결/분리의 정규 대조군 행렬과 역순 반복은 미완료다. 선형 native DOM 보유가 발견된 이후에는 사용자 누수 우선 방침에 따라 해당 경로의 연결/분리 실험을 먼저 수행했다.

native 리스너 직접 계수, 모든 detached DOM의 native identity와 root reason, 코드 증가의 완전한 소스 귀속은 미검증이다. 전체 native 메모리 수용은 INCOMPLETE이다. 제품 코드는 변경하지 않았으며 원격 쓰기도 없다. Safari의 초기 타임라인 5개 항목(스크린샷·네트워크·레이아웃·JavaScript 이벤트·CPU)을 복원하고 Inspector를 닫았다. 개발자 기능 OFF(`Value: 0`)와 검증 탭 복귀를 native UI에서 확인했다.

로컬 원본·어댑터별 retainer 보고서·검증 로그·overlay 해시·장부는 ignored `.local/safari-memory-followup/20261024-execution/`에 보존한다. 공통 Core 자산 SHA-256은 `1d6e3d5e6e31aeddfafe5908de53eadc59b6d65dc96931def84dd282e5dc9ef5`다. source HEAD는 위 기준과 같으며 원본·분석기별 해시는 로컬 manifest에 기록했다. [실행 계획](../docs/superpowers/plans/2026-10-24-safari-memory-followup.md)을 참고한다.
