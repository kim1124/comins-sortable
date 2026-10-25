# Native Safari 메모리 검증

대상은 production Playground의 같은 runtime이다. Chromium 또는 Playwright WebKit의 성공으로 native Safari 결과를 대체하지 않는다.

## 분석 도구

```sh
node --test test/diagnostics/safari-memory-analysis.node.mjs
node scripts/analyze-safari-memory.mjs --manifest .local/run/manifest.json --output .local/run/summary.json
```

manifest는 `schemaVersion: 1`, `kind: product | control`, `head`, `browserVersion`, `assets`, `classMap`, `snapshots`를 갖는다. 경로는 manifest 파일의 폴더 기준이다. `assets` 항목은 `path`와 SHA-256인 `sha256`을 갖는다. `snapshots` 항목은 `path`, `inspectorSessionId`, `phase`를 갖는다. 제품 분석은 정확한 빌드 자산의 SessionMachine/AreaRegistry/GeometryCache 클래스명을 `classMap`에 지정한다. 제품 없는 대조군은 빈 매핑을 사용한다. 매핑은 해당 자산 소스를 별도로 확인해야 하며 도구가 소스의 클래스 의미까지 자동 증명하지 않는다.

한 manifest에서는 같은 Inspector 연결과 같은 힙 ID 공간의 snapshot만 비교한다. 전체 페이지 탐색 또는 재연결 후에는 target ID가 같아도 ID가 재사용될 수 있으므로 새 manifest와 세션 ID를 사용한다. 도구는 동일 ID의 클래스가 달라지면 비교를 거부한다. 이 검사는 ID 연속성의 완전한 증명이 아니며, 클래스가 같은 ID 재사용까지 자동 검출하지는 못한다. prototype/클래스가 실행 중 바뀐 경우도 보수적으로 비교를 중단한다. 원본 해시·총 self-size·코드 블록·raw 클래스 수·Reader 속성이 있는 전역·같은 세션 내 추가/제거 ID를 출력한다. 총량과 개수만으로 전체 PASS를 출력하지 않는다.

출력은 새 파일만 허용한다. 기존 파일과 symlink/hardlink는 거부하므로 재실행은 새 출력 파일명을 사용한다. 입력 snapshot·자산·manifest는 수정하지 않는다.

Inspector v3 node는 `[id,size,classIndex,flags]`, edge는 `[from,to,typeIndex,nameOrIndex]`이다. internal/object/element flag는 dead가 아니다. `Document` 클래스 수는 실제 native 문서 수가 아니며, prototype/wrapper와 제품이 소유한 DOM을 구분한다. Reader 전역의 두 속성은 분류 근거이며 브라우저 내부 생성 원인의 단독 증명은 아니다. raw 형식에 없는 native 객체 주소·리스너 개수·소스 위치는 미확인으로 남긴다. Inspector 또는 외부 도구가 보유한 객체를 제품 누수로 자동 분류하지 않는다.

## 수집 계약

1. 소스 HEAD와 미커밋 overlay, lockfile, production 자산·수집기 해시 및 브라우저 버전을 기록한다. 원본은 `test-results` 밖의 ignored `.local/safari-memory-followup/<run-id>/`에 보존한다. 공유 보고서에는 개인 경로·원시 heap을 넣지 않는다.
2. `test/fixtures/safari-memory/counter.html`과 `history.html`을 격리 빌드의 임시 preview 루트에 복사하여 사용한다. 두 파일은 history 호출 외의 입력·카운터·텍스트 변경이 같다. 각각 20회씩 3배치, Inspector 연결/분리 조건과 실행 순서를 기록한다. 분리 실행의 재연결 전후 ID는 비교하지 않는다.
3. 공개 React handle 예제에서 실제 reorder 20회 워밍업, idle 기준 snapshot 5개, reset/remount/URL 변경 없이 100회씩 3배치 수행한다. 실제 source area/item·목적지·순서·drop·marker 정리를 확인한다. CUA/장치 입력 오류는 제품 실행 실패와 분리한다.
4. 각 snapshot을 같은 Inspector 수집 방식으로 확보하고 그 방식의 GC 보장을 확인·기록한다. 이후 증가를 보고 baseline 범위·입력 횟수·허용량을 바꾸지 않는다. 이벤트 로그 포화·모듈 로딩과 코드 블록 증가를 구분한다.
5. 실제 예제 전환 후 종료된 runtime의 instance ID·분리 DOM wrapper·클로저·리스너 유지 경로를 확인한다. 살아 있는 다른 scope와 사용자 보유 handle을 구분한다. native 자원 관측이 없으면 미검증이다.
6. React부터 판정하고 Vue→Vanilla→Svelte에 같은 계약을 적용한다. 제품 소유 자원의 잔존 경로가 재현되면 집중 회귀 RED→최소 수정→GREEN 후 영향 게이트를 실행한다.

객체·retainer·소스 귀속, 장기 반복, native 자원 관측이 빠졌으면 전체 메모리 판정은 INCOMPLETE이다. Inspector를 닫아 총량이 줄었다는 사실만으로 전체 무누수를 선언하거나 URL/라우팅을 우회하지 않는다. 총량 상승이나 일정한 클래스 수만으로 제품 결함·PASS를 단정하지 않는다. 기존 Chromium의 1MiB 허용치를 새 Safari 합격 기준으로 사용하지 않는다.

## 2026-10-24 후속 결론

전용 PID 수동 재현에서 Vue lifecycle과 Sortable 객체는 회수됐고 잔존 DOM 155개는
Inspector/Reader의 native Strong 보유 경로에 연결됐다. Inspector 연결 해제 후 GC에서
Reader와 해당 native DOM이 회수됐다. 이 사례를 Vue 정리 누락으로 분류하지 않는다.
과거 124개의 주소 복원 및 모든 native 경로의 무누수 인증은 수행하지 않았다.
최종 범위와 방법의 한계는 [0.1.7 검증 상태](./0.1.7-local-validation.md)를 따른다.
이 후속 결론은 위의 포괄적 수집 계약 전체가 완료됐다는 뜻이 아니다.
