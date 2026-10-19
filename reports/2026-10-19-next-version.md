# 다음 버전 작업 — 2026-10-19

최종 정리: 2026-10-19 10:59 KST.

## 범위와 상태

- 로컬 미게시 Governance v1.12 기준. 패키지 버전 0.1.6 유지, 원격 쓰기 없음.
- 기존 Governance 변경과 2026-10-13 리포트는 보존했다.
- Safari 선택 잔류 개선, 선택형 렌더링 확장, 동적 transform 진단,
  메모리·성능·런타임 취약점 검토 및 타 모듈 편의 기능 비교를 수행한다.
- 키보드 제외. 3D·프레임워크 hook/composable API는 보류한다.
- 로컬 구현 및 지원 범위 자동 검증은 완료했다. 실제 Safari 확인은 잠금 해제 대기다.
  동적 transform 지원과 장기 이력 보유 문제는 검토 결과로 남았으며 수정하지 않았다.

## 변경 표면

- Core: renderer 타입·공개 export, 임시 host와 callback 수명, 옵션 검증,
  callback 재진입 후 상태 보호, 명시 mouse handle의 임시 selectstart 방지.
- React/Vue/Svelte: renderer 옵션 전달 및 옵션 identity 비교.
- Playground: 네 어댑터의 custom-placeholder 렌더링 전환과 예제 스타일.
- 검증: renderer 예외·재진입·500회 단위 반복, 어댑터·타입 검사,
  실제 Playground renderer 및 선택 잔류 회귀, live destination hit 보완,
  renderer를 포함하는 자원 반복, 별도 동적 transform/이력 증가 진단.
- 문서: CHANGELOG Unreleased, 한영 Placeholder·공개 API 가이드,
  [검토 문서](../docs/verification/next-version-review.md).

## 확인된 결과

- 수정 전 WebKit React 제목 드롭에서 본문 선택 잔류 재현.
- 명시한 handle의 accepted mouse attempt에만 selectstart 방지를 추가했다.
  본문 선택 시작은 기존 입력 판정에서 제외되어 정상 선택을 보존하며,
  전역 Selection 삭제는 사용하지 않는다.
- renderer 회귀의 최초 outside 실패는 Placeholder 뒤 레이아웃 변경으로 이전
  목표 좌표가 목록 헤더에 남은 경우였다. 실제 hit·현재 rect 추적 후 helper를
  보완했다. Placeholder 소유 영역만으로 목적지 도달을 판정하지 않는다.
- 개선된 집중 WebKit 진단 16건이 통과했다. 이 실행은 기존 작업 폴더의
  Playwright runner 1.62.1과 격리 후보의 built Playground를 사용한 진단이다.
  lockfile runner 1.64.0의 최종 전체 검증과 구분한다.
- pointer/renderer 집중 단위 40건 통과. renderer 500회 단위 반복은 host·handle·
  listener·frame 정리를 확인하며 browser heap soak과 구분한다.
- 한영 문서 검사 9건 통과. 최초 전체 verify는 공개 타입 목록 누락으로 실패했고,
  해당 문서를 보완했다. 문서 보완 후 격리 사본의 전체 verify가 통과했다. 정책 72건, 단위 316건,
  라이선스·타입·빌드·Vue SFC 양성/음성 타입 검사 모두 통과했다.
- 기준 성능: HEAD 07015743f8588b50d0d5118fa9640dad34c96ef4, 독립 checkout,
  npm ci --ignore-scripts, Chromium 156.0.8078.4, 36조건(12조건×3배치),
  각 30표본 및 기능 assertion 통과. 원시 JSON은 무시된 로컬 증거 폴더에 보존한다.

## 보안 검토

Codex Security Standard scan `62833553-dd62-4b32-884e-1dd184599d25` 완료.
격리 후보의 src 41파일을 대상으로 보고할 취약점을 확인하지 못했다.
Daybreak 접근 권한은 부여되지 않은 상태로 수행했다. [접근 안내](https://chatgpt.com/cyber).
이 제한과 독립 검토자 미사용을 포함한 범위 내 결과다.
CI/release 설정·도구 scripts·예제/테스트·과거 Git 상태·provider 설정·외부 의존성
소스 전체를 감사한 것은 아니다. 모델 용량 오류로 독립 하위 검토자를 사용하지
못했으며 주 세션에서 순차 검토했다. renderer는 신뢰 소비자 JavaScript이고
sandbox나 HTML sanitizer가 아니다.

정확한 소스는 무시된 로컬 증거의 source-manifest.json 및 보안 도구가 고정한
snapshot digest로 식별한다. dependency 설치 감사는 0 vulnerabilities였으며,
정적 소스 검토와 별개로 기록한다. 보안 도구의 스레드 기반 사용량 집계는
5,346,870 tokens(그중 cached input 5,264,896)이다. 스캔만의 신규 사용량이나
요금으로 해석하지 않는다.

## 잔여 검토 결과

- 기준 Chromium 동적 transform 진단 12건 실패. 현재 역행렬 캐시 및 geometry
  갱신 경계의 제한이며 이 진단을 기본 지원 게이트에 섞지 않는다. 상시 observer나
  polling을 추가하지 않았다. 이동·release 재검증과 정지 자동 추적의 성능 계약은
  별도 설계가 필요하다.
- SessionMachine.history는 동일 scope에서 10,000회 상태 cycle 후 40,001개까지
  증가했다. 이번 메모리 검토에서 수정하지 않았다. 기존 remount 포함 soak은
  이 장기 보유 증가를 가릴 수 있다.
- 실제 Safari 27.0.1 CUA 검증은 Mac 잠금 때문에 차단됐다. 자동 WebKit의 성공을
  native Safari 인증으로 표현하지 않는다. 사용자에게 잠금 해제를 요청했다.

## 성능 및 자원 측정

- 후보도 동일 lockfile의 독립 설치와 Chromium 156.0.8078.4에서 36조건
  (12조건×3배치, 조건당 30표본), 기능 assertion 및 page error 0을 통과했다.
- 각 조건의 90표본을 합산한 활성화 callback 시간의 예: CPU 1×, 100항목,
  1영역, animation off 중앙값/p95는 기준 0.4/0.8ms → 후보 0.6/0.8ms다.
  CPU 1×, 5,000항목은 8.4/10.9ms → 7.3/9.3ms, CPU 4× slowdown의
  같은 조건은 37.1/45.7ms → 27.5/33.9ms다.
- CPU 1×, 5,000항목, 1영역, animation off의 move callback p95는
  8.4ms → 9.0ms로 증가했다. 모든 조건을 성능 향상으로 요약하지 않는다.
  입력부터 화면 표시까지의 지연이 아니며 실행 시점 차이에 따른 변동도 있어
  이 차이를 코드 최적화 또는 회귀의 인과 증명으로 해석하지 않는다.
- 후보 500 drag/cancel 반복의 warm/최종 heap은 3.078/3.067MiB,
  listener는 39개 유지, marker는 0이다. 10회 destroy 후 heap 2.726MiB,
  nodes 13, listener 37이었다. 기준 실행은 latency 전용이므로 기준과 후보의
  메모리 비교라고 표현하지 않는다. custom renderer 자원 검사는 별도 gate다.
- 원시 JSON과 합산 비교는 무시된 로컬 증거 폴더에 보존한다. 사용자 환경의
  실제 Safari, 모든 장기 scope, 모든 렌더러 구현의 무누수를 보증하지 않는다.

## 최종 검증

로컬 격리 후보(HEAD 07015743 + 미커밋 변경 overlay)에서 수행한다. 실제 커밋이나
CI 검증으로 표현하지 않는다. 소스 41파일의 SHA-256 동일성을 확인했다.
성능·browser resource 수집 중에는 다른 build/browser 작업을 동시에 실행하지 않는다.

- PASS: npm ci --ignore-scripts (기록된 독립 설치), npm run verify (현재 실행).
- 첫 Core 전체 실행: 289 PASS / 12 FAIL. live DOM hit 조건이 실제 너비 0의 빈 영역
  threshold 계약을 표현하지 못한 검증 helper 문제였다. 현재 좌표가 기본 8px
  임계값 안에 있고, 실제 item이 없고, Core over 표시가 목적지와 일치하는 경우를
  별도로 검사하도록 보완했다. 일반 영역의 live DOM hit 요구는 유지한다.
- 기존 작업 폴더 runner로 잘못 시작한 후속 실행 1회는 중단했다. 최종 수치에서 제외한다.
- PASS: lockfile runner를 사용하는 격리 후보의 Core 브라우저 전체 301건 (46.6초).
- PASS: Playground 전체 749건 (1.7분). Chromium touch 및 Chromium/Firefox/WebKit,
  네 어댑터 renderer 36건과 선택 잔류 12건 포함. npm 중첩 명령의 workers 전달은
  CLI 경고 후 적용되지 않아 실제 7 workers로 실행됐다. 결과 판정에 영향 없는
  실행 옵션 경고이며 4 workers 실행으로 보고하지 않는다.
- PASS: npm run verify:package-artifact. 동일 tgz를 test:consumer에 전달하여
  최소 peer 설치·공개 import·타입·Vue SFC 양성/음성 검사를 통과했다.
- PASS: 동일 tgz를 표준 tar로 추출한 후 Gitleaks 검사. 출력은 상수 결과만 보존했다.
- PASS: 이번 기능 변경 40파일의 Gitleaks 검사 및 git diff --check. 사전 존재
  Governance 파일들은 현재 기능 변경과 분리했다. 최종 source 41파일과 검증 관련
  174파일이 격리 후보와 SHA-256으로 일치했다.
- FAIL: renderer 포함 Playground 자원 검사 (1 worker 단독): 3 PASS / 2 FAIL.
  전체 기능 전환·React·Vue는 통과했지만 Vanilla/Svelte는 warm 대비 DOM node가
  각각 169/204개 증가했다(허용 10). live node 및 listener 조건 이후 DOM 조건에서
  실패했다. 기준 소스의 같은 반복 검사와 비교하여 원인을 분류 중이다.
  허용치를 변경하거나 실패를 무시하지 않았다.
- 기준 소스의 Vanilla/Svelte 비교 실행은 1 PASS / 1 FAIL이었다. Vanilla는 통과했지만
  Svelte는 동일한 DOM +204로 실패했다. 새 renderer만의 회귀로 단정할 수 없다.
  공식 테스트를 변경하지 않은 별도 사본에서 프레임 경계 전후 GC를 비교했다.
- 별도 GC 진단 2건 PASS: Vanilla는 첫 collection 636 → 두 프레임과 두 번째
  collection 후 467, Svelte는 793 → 589로 회수됐다. 각 100-cycle 샘플 모두
  안정화 후 warm 기준과 동일했다. 따라서 처음 관측한 차이는 이 실행 범위에서
  장기 잔류가 아니라 측정 경계의 일시 보유였다. 특정 framework/native 객체의
  정확한 retainer를 heap graph로 판별한 것은 아니다.
- 공식 자원 sampler에도 두 프레임·두 번째 collection을 반영했다. warm과
  후속 sample에 같은 절차를 적용하고 모든 허용치는 유지했다. 전체 자원 gate를
  전체 자원 gate를 재실행해 아래 PASS를 확인했다. 별도 진단과 구분한다.
- PASS: helper 변경 후 격리 후보의 npm run typecheck.
- PASS: 안정화된 공식 자원 전체 5건 (3.1분). 전체 기능 전환 및 네 어댑터의
  각 20회 warm + 100회 후속 반복, 중첩/renderer mount·drag·unmount를 포함한다.
  최종 node 수는 Vanilla 467, React 487, Vue 495, Svelte 589로 각 warm과 동일했다.
  listener도 각각 211/354/211/211로 유지됐다. warm 대비 최종 heap 증가는
  0.38/0.41/0.63/0.58MiB로 기존 1MiB 허용량 안이었다.
  매 5회 remount하므로 장기 동일 scope 이력 증가를 부정하는 결과가 아니다.
- FAIL (별도 지원 범위 진단): 최종 후보의 동적 transform 36건.
  Chromium/Firefox/WebKit × 네 어댑터 × 세 조건에서 좌표 기준을 충족하지 못했다.
  좌표 assertion에서 중단되어 이후 drop/reason/cleanup 검사는 도달하지 못했다.
  이 실패를 정상 정적 transform 회귀 통과 또는 지원 구현 완료로 표현하지 않는다.
- 차단: native Safari (화면 잠금).


## 다음 조치와 로컬 확인

1. Mac 잠금 해제 후 실제 Safari에서 제목 드래그·본문 선택·drop/cancel 정리를 확인한다.
2. 동적 transform은 좌표계 변경 감지·영향 geometry 무효화·release 재검증의
   설계를 먼저 확정한다. 정지 중 자동 추적은 별도 성능 계약으로 결정한다.
3. SessionMachine.history의 배포 경로 보존 제거 또는 테스트 관찰 수단 분리를
   후속 수정으로 잡는다. 이번 검토를 해당 수정 완료로 표현하지 않는다.
4. 편의 기능은 터치 delay/tolerance와 auto-scroll 조절을 우선 후보로 제안한다.
   추가 API·의존성은 이번에 도입하지 않았다.

로컬 예제는 `npm run dev` 후
`http://127.0.0.1:4003/examples/custom-placeholder/react`에서 확인한다.
“사용자 콘텐츠 렌더링”을 켜면 placeholder/overlay 확장을 볼 수 있다.
키보드·3D·프레임워크 hook/composable은 보류 범위를 유지한다.

CI·commit·push·배포·npm publish는 수행하지 않았다. 기존 작업 폴더의 의존성과
생성 산출물, 사전 존재 Governance 변경을 보존했다. 검증용 임시 사본과 로그도
보존하며 이 작업에서 정리 삭제하지 않았다.

## 후속 수정과 원격 진행

위 내용은 최초 검토 시점의 기록이다. 장기 history 및 disposer 참조 보유는
[후속 메모리 수정](2026-10-19-memory-retention-fix.md)에서 해결하고 검증했다.
정식 Governance 적용 및 현재 커밋의 원격 PR·CI 진행은
[원격 진행 보고서](2026-10-19-remote-validation.md)에 기록한다.
