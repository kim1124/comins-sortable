# Sortable Next Quality Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. 기본 실행은 현재 세션에서 순차 진행하며, 체크 표시는 아래 실행 중 조정을 반영한 로컬 구현·검증 결과다. 커밋·원격 반영을 의미하지 않는다.

**Goal:** 기존 공개 API와 드래그 동작을 보존하면서 개발 의존성 보안, 대규모 성능 측정과 병목, Vue SFC 타입 추론, 브라우저 입력 회귀 검증을 보완한다.

**Architecture:** 하나의 Vanilla TypeScript Core와 기존 4개 어댑터 구조를 유지한다. 측정 도구는 테스트 전용으로 분리하고, Core 최적화는 측정된 중복 작업에 한정한다. Vue 수정은 공개 타입 선언을 우선하며 입력 문제는 재현된 계층에서 최소 수정한다.

**Tech Stack:** TypeScript, Node.js, esbuild, Playwright, React, Vue, Svelte. 신규 런타임 의존성 없음.

**Spec:** 이 문서의 [확정 범위](#확정-범위)가 사용자 확정 요구사항이다. 저장소 `AGENTS.md`와 Governance의 Comins Contract v1.8을 함께 따른다.

## Global Constraints

- 런타임 의존성 0개, 선택적 peer 범위 `react >=18.2 <20`, `react-dom >=18.2 <20`, `vue >=3.5 <4`, `svelte >=5 <6`을 유지한다.
- ESM exports는 `.`, `./core`, `./react`, `./vue`, `./svelte`, `./styles.css`를 유지한다.
- 키보드 정렬, Galaxy를 포함한 실기기 검증, 별도 홈페이지 저장소 작업은 제외한다. 기존 Escape 취소 동작의 회귀 검증은 포함한다.
- 가상화, 새로운 공개 캐시/refresh API, 프레임워크 구조 개편, 무관한 메이저 의존성 업데이트는 포함하지 않는다.
- 본문 텍스트 선택·복사를 보존한다. 전역 Selection 초기화와 상시 본문 `user-select: none`을 해결책으로 사용하지 않는다.
- 브라우저 터치 입력, CPU 제한, Playwright WebKit 결과를 Galaxy·Samsung Internet·네이티브 Safari 인증으로 표현하지 않는다.
- 패키지 버전은 현재 `0.1.4`에서 임의로 변경하지 않는다. push, PR 변경/병합, 태그, Release, 배포, publish는 별도 명시 승인 대상이다.
- 각 작업은 독립적으로 검증 가능한 변경 단위로 유지한다. 기존 로컬 커밋과 사용자 변경을 reset하거나 덮어쓰지 않는다.

## Review Focus

1. 드래그 중 source/destination 항목 삭제·교체·재정렬: 외부 변경을 보존하고 오래된 상태로 commit하지 않는다. → Task 3.
2. 중첩 목록, 빈 목록의 pinned header/footer, 스크롤·resize: 정확한 항목을 활성화하고 placeholder와 실제 삽입 위치를 일치시킨다. → Task 2, 3, 5.
3. 취소·destroy·unmount·remount 반복: 프레임/리스너/마커/DOM 참조가 누적되지 않고 소비자 DOM을 보존한다. → Task 2, 3, 5.
4. Vue SFC의 정상·오류 입력: 모델에서 슬롯과 이벤트 타입을 추론하면서 잘못된 key와 반환 타입을 거부하고 기존 `h()` 사용법을 유지한다. → Task 4.
5. 브라우저 스크롤이 터치 제스처를 가져가거나 드래그가 취소된 경우: 오정렬 없이 종료하고 이후 본문 선택이 복구된다. → Task 5.

## 확정 범위

| 순서 | 확정 작업 | 산출물 |
| --- | --- | --- |
| 1 | 개발 의존성 보안 보완 | devalue의 좁은 lockfile 변경과 Svelte 검증 |
| 2 | 대규모 성능·메모리 측정 정식화 | 재실행 가능한 벤치마크, 원시 측정값, 안정성 판정 |
| 3 | 확인된 Core 병목 개선 | 회귀 테스트와 동일 조건의 전후 비교 |
| 4 | Vue 실제 SFC 타입 추론 수정 | SFC 긍정/부정 타입 테스트와 패키지 소비자 검증 |
| 5 | 브라우저 터치·텍스트 선택 검증 | 입력 시나리오, 재현된 결함의 최소 수정, 증거 |
| 6 | 문서·최종 게이트 | 구현 결과와 일치하는 문서 및 미검증 항목 기록 |

Task 1, 4, 5는 독립 검증 단위다. Task 3은 Task 2의 수정 전 기준값 확보 후 진행한다. 성능 수집 중 다른 브라우저 테스트나 빌드를 동시에 실행하지 않는다.

## 기준 상태와 근거

- 계획 작성일: 2026-10-04 KST. 기준 HEAD: `21713d960b8259ae161e063490004dcf71c30c33`, 패키지 `0.1.4`.
- 문서 작성 직전 작업 트리는 clean이며 로컬 `main`은 추적 중인 `origin/main`보다 1개 커밋 앞섰다. 원격을 새로 fetch한 결과는 아니다.
- 현재 `AreaRegistry.itemIds()`는 전체 area ID 검증 후 요청 area를 다시 수집한다. `scope.ts`의 activation과 move 경로에도 항목 순회와 geometry 준비가 있다. 특정 함수 하나가 전체 지연의 원인이라고 확정하지 않는다.
- 기존 `test:types`는 `.ts`와 `.tsx`만 포함한다. 실제 `.vue` 템플릿에서 `item-key="id"` 및 슬롯 `item.title` 실패가 이전 검토에서 재현되었다. 선언 교차 타입만 제거하는 실험은 실패했다.
- 이전 검토의 임시 측정: 단일 목록 5,000개, animation/autoScroll off, Chromium CPU 4배 제한에서 activation 프레임 처리 시간 중앙값 약 44.6ms. 7회 표본의 예비 결과이며 입력 지연 전체·FPS·실기기 결과가 아니다.
- 이전 반복 측정에서는 누수가 확인되지 않았다. 기존 성능 게이트와 브라우저 289개 테스트 통과는 이전 검토 증거이며, 이번 문서 작성에서 재실행한 결과가 아니다.
- devalue `5.9.0 → 5.9.4` lockfile 변경은 앞선 검토에서 PR #31로 확인했다. 구현 직전에 현재 lockfile과 PR 상태를 다시 확인하고 이미 반영됐다면 중복 작업하지 않는다.
- 기존 CI는 lockfile만 바뀌면 Browser/Performance가 생략된다. 새 측정 파일과 타입 테스트가 실제 게이트에 연결되는지 확인해야 한다.

## Task 1: 개발 의존성 보안 보완

**Files:**
- Modify: `package-lock.json`
- Modify: `.github/workflows/verify.yml` — lockfile 변경의 검증 누락 방지에 한정
- Create: `test/verification-routing.node.mjs` — 변경 경로별 실행 대상 계약

**Interfaces:** 공개 API 변화 없음. devalue는 Svelte 개발 도구의 전이 의존성으로 유지하고 직접 런타임 의존성으로 승격하지 않는다.

- [x] **1. 기준 확인:** `npm ls devalue --all`과 lockfile로 설치/선언 버전을 대조한다. 이전에 검토한 PR #31과 별개로 현재 lockfile의 devalue 변경이 `5.9.4`에 한정되는지 확인한다. PR 상태 변경이나 병합은 수행하지 않는다. 의존성 변경 전에 Governance 라이선스·보안 정책의 해당 항목을 읽는다.
- [x] **2. 누락 검증 고정:** 경로 분류 테스트에 `package-lock.json` 변경 시 Package/Browser/Performance가 모두 선택되는 사례를 추가하고 현재 분류에서 실패하는지 확인한다. docs-only 변경은 기존 분류를 유지한다.
- [x] **3. 최소 반영:** devalue lock entry만 갱신하고 CI의 lockfile 경로를 해당 세 게이트에 연결한다. 전체 `npm update`, Svelte/Vite 메이저 변경, PR 병합은 수행하지 않는다. 라이선스 변경과 무관한 lockfile churn이 없는지 확인한다.
- [x] **4. 검증:** `npm ci --ignore-scripts`, `npm ls devalue --all`, `node --test test/verification-routing.node.mjs`, `npm run verify`, `npm run verify:e2e`, `npm run verify:playground`, `npm run verify:performance`를 순차 실행한다. Svelte 정렬·복사·취소가 포함된 결과를 기록한다.
- [x] **5. 완료 판정:** 취약한 기존 버전이 의존성 트리에서 제거되고 관련 게이트가 통과해야 한다. 수정 원인과 개발 도구 영향 범위를 기록하고, 이후 Task와 분리 가능한 변경으로 유지한다.

## Task 2: 재현 가능한 성능·메모리 측정

**Files:**
- Create: `scripts/benchmark-sortable.mjs` — Chromium 구동, 실제 입력, 측정/출력
- Create: `test/performance/fixture.ts` — built package로 만든 단순 목록과 생명주기 제어
- Create: `test/performance/types.ts` — 테스트 전용 측정/fixture 계약
- Modify: `test/playground/performance.spec.ts`, `test/playwright/resource-stability.spec.ts`
- Modify: `package.json`, `.github/workflows/verify.yml`, `test/verification-routing.node.mjs`
- Create: `docs/verification/next-quality-performance.md`

**Interfaces:**
- 테스트 전용 `BenchmarkConfig`: `itemCount: number`, `areaCount: number`, `animation: boolean`, `autoScroll: boolean`.
- fixture는 `mount(config)`, `reset()`, `destroy()`, `readState()`를 제공한다. `readState()`는 active `areaId/itemId`, area별 item IDs, 종료 status/reason, 오류 목록을 반환한다. 라이브러리 공개 export를 추가하지 않는다.
- 새 명령 `benchmark:sortable`: `npm run build && node scripts/benchmark-sortable.mjs`.
- runner 인자: `--suite latency|memory|all`(기본 all), `--output <json-path>`. 기본 출력은 `test-results/benchmark-sortable.json`이며 기존 ignore 경로를 사용한다.
- JSON은 schemaVersion, source HEAD/dirty 여부, Node/Chromium/OS/CPU/viewport, CPU 제한값, 설정, warmup/sample 수, 원시 시간값, median/p95, ID/geometry 호출 수, 단계별 자원 계수, 기능 assertion 결과를 담는다.

- [x] **1. fixture 신뢰성 고정:** package build 결과를 esbuild로 fixture에 묶는다. 실제 마우스 입력 직후 요청한 `areaId/itemId`가 활성화됐는지 확인하고, drop 후 모델/DOM 순서 및 마커 정리를 각각 검증한다. 빈 목적지와 pinned header/footer 위치도 확인한다. 실패한 drag의 시간값은 성공 표본에 섞지 않고 실행을 실패 처리한다.
- [x] **2. 시간 측정 구현:** 100/1,000/5,000개 단일 area와 총 5,000개/10 areas를 측정한다. 각 조건 warmup 5회 후 유효 drag 30회, CPU 제한 1배/4배, 고정 viewport 1100×760으로 실행한다. 기본은 animation/autoScroll off, animation on은 1,000/5,000개에서 별도 측정하며 결과를 혼합하지 않는다.
- [x] **3. 지표 분리:** activation/move/release의 JS 처리 시간, 연속 rAF 간격, 50ms 이상 long task, `getItemId`/`getBoundingClientRect` 호출 수를 기록한다. 모든 move 표본을 함께 보존한다. 대표 5,000개 trace에서 scripting/layout/paint를 확인하되 계측 trace와 시간 비교 실행을 분리한다. callback 처리 시간을 전체 입력 지연으로 명명하지 않는다.
- [x] **4. 메모리 측정 구현:** 1,000개 항목으로 warmup 10회 후 500 drag/cancel cycles, 5회마다 remount, 50회마다 GC 후 표본을 수집한다. 추가로 10회 mount/drag/destroy하고 pointer를 제거된 DOM 밖으로 이동한 뒤 2 rAF와 GC 후 표본을 수집한다. 최초 브라우저 상태가 아니라 instrumentation이 안정화된 warm 상태와 비교한다.
- [x] **5. 자원 판정:** 기존 Playground의 docs/liveNodes 동일, listener 증가 ≤5, DOM nodes 증가 ≤10, heap 증가 ≤1MiB 기준을 유지한다. 반복 fixture의 마커 및 앱이 관리하는 활성 자원은 정리 후 0이어야 한다. 새 soak의 각 종료 표본을 warm 상태와 비교하고 초과 시 계측 참조·환경·제품을 구분한다. 실패 후 임계값을 임의로 늘리지 않으며, 통과도 장기간 무누수 보장으로 표현하지 않는다.
- [x] **6. 게이트 연결:** `verify:performance`가 fresh package build를 포함하도록 수정하고, Performance job에서 기존 테스트 후 새 benchmark를 실행해 JSON을 보존한다. 새 `scripts/benchmark-sortable.mjs`, `test/performance/*`, 관련 설정 변경이 Package/Browser/Performance를 선택하도록 분류 테스트를 보강한다. `package.json` 변경도 이 경로를 선택하게 한다. 실패 중인 prerequisite 때문에 새 job이 조용히 생략되지 않는지 의존 관계를 점검한다.
- [x] **7. 기준값 확보:** `npm run benchmark:sortable -- --suite all --output test-results/baseline.json`을 실행한다. 30회 시간 측정은 동일 환경에서 3개 batch로 반복해 변동 폭을 기록한다. 일반 CI의 절대 ms로 성능을 단정하지 않고, 기능·정리 assertion 실패는 게이트 실패로 처리한다. 이후 최적화 비교용 JSON과 조건을 보존한다.

## Task 3: 측정된 Core 중복 작업 축소

**Files:**
- Modify as supported by profile: `src/core/scope.ts`, `src/core/registry.ts`, `src/core/geometry.ts`
- Modify: `test/unit/core/active-list-changes.test.ts`, `test/unit/core/registry.test.ts`, `test/unit/core/geometry.test.ts`, `test/unit/core/resource-lifecycle.test.ts`
- Modify if coverage is missing: `test/playwright/geometry.spec.ts`, `test/playwright/scoped-items.spec.ts`, `test/playwright/rollback.spec.ts`, `test/playwright/external-scroll.spec.ts`
- Update: `docs/verification/next-quality-performance.md`

**Interfaces:** 공개 signature와 ID 검증/오류 계약을 유지한다. 내부 최적화 단위는 동일 동기 처리 내의 검증된 열거 결과 또는 기존 geometry invalidation 범위로 제한한다. 장수명 DOM/ID 캐시를 신설하지 않는다.

- [x] **1. RED:** Task 2 profile에서 중복이 확인된 경로에 동일 처리 내 중복 ID 수집 또는 dirty가 아닌 geometry 재측정을 검출하는 카운터 테스트를 추가한다. 측정 근거와 감소 대상을 연결하고 현재 구현에서 기대한 실패를 확인한다.
- [x] **2. 보호 동작 고정:** source/destination 삭제·삽입·동일 ID의 다른 DOM 교체·재정렬, callback 내부 변경, group 내 중복 ID, copy/swap/multi, area unregister를 검증한다. 외부 변경 시 오래된 순서를 commit하지 않고 모델과 DOM을 보존한다. onChange 호출 여부뿐 아니라 최종 순서도 assert한다.
- [x] **3. 최소 구현:** profile에서 확인한 중복 작업 순으로 결과를 공유한다. activation부터 release까지 snapshot을 무조건 재사용하지 않는다. release 직전 source/destination 변경 감지, ID 검증, callback 이후 commit 확인을 유지한다. scroll·resize·framework update·placeholder 이동에 따른 무효화와 destroy 시 참조 해제를 보존한다.
- [x] **4. GREEN:** 대상 unit을 `node --import tsx --test <대상 파일>`로 실행하고 관련 browser spec을 `npm run test:e2e -- <대상 spec>`으로 검증한다. 중첩에서 요청한 area/item의 동일성, 빈 목록 삽입 위치, scroll 이후 좌표를 확인한다.
- [x] **5. 효과 판정:** 동일 fixture/build 절차·브라우저·장비에서 Task 2의 3 batch를 재측정한다. 중복 처리 카운터가 감소하고 대상 5,000건의 median/p95가 baseline 변동 폭을 넘어 개선되어야 최적화를 채택한다. 100/1,000건에서 변동 폭을 넘는 악화가 있으면 원인을 조사한다. 효과가 측정 잡음 이내이면 개선 완료로 보고하지 않고 최적화 차이를 보류한다.
- [x] **6. 완료 판정:** 의미 있는 코드 변경 후 `npm run verify`, `npm run verify:e2e`, `npm run verify:playground`, `npm run verify:performance`와 memory suite를 통과하고 효과·회귀·미해결 사항을 기록한다. 공개 API 변경이나 가상화가 필요해지면 이 Task에 포함하지 않고 별도 제안한다.

## Task 4: Vue SFC 타입 추론과 소비자 검증

**Files:**
- Modify: `src/vue/SortableArea.ts`; `src/vue/SortableRoot.ts`는 타입 호환성에 필요한 경우만
- Modify: `test/types/vue.test.ts`, `package.json`, `package-lock.json`, `scripts/consumer-smoke.mjs`
- Create: `test/types/vue-sfc/Consumer.vue`, `test/types/vue-sfc/InvalidConsumer.vue`, `test/types/vue-sfc/tsconfig.json`
- Create: `scripts/check-vue-sfc-types.mjs`
- Update: `docs/ko/05-vue.md`, `docs/user/05-vue.md`

**Interfaces:** `SortableArea`는 modelValue의 요소 T에서 `ItemKey<T>`, item slot, `update:modelValue`, `copyItem`의 타입을 유지·추론한다. 기존 `SortableArea<Task>`/`h()` 및 props/slots/event 선언을 유지한다. 부모 Root가 자식 Area의 T를 자동 추론하는 새로운 계약은 추가하지 않는다.

- [x] **1. 컴파일러 호환성 확인:** 라이브러리의 TypeScript를 낮추지 않고 현재 TypeScript에서 동작하는 vue-tsc를 공식 정보와 작은 fixture로 확인한다. 앞선 검토에서 사용한 다른 프로젝트의 실행 파일에 의존하지 않는다. 추가는 devDependency로 한정하고 검증한 버전을 exact pin한 뒤 license/lock 차이를 확인한다. 호환 버전이 없다면 이 Task만 미완료로 기록한다.
- [x] **2. RED:** Consumer.vue에서 `ref<Task[]>`, `v-model`, `item-key="id"`, slot `item.title`을 컴파일하여 현재 실패를 고정한다. string/number ID, readonly 배열의 props 입력, 타입이 지정된 update handler, header/footer, custom tag를 정상 사례에 포함한다.
- [x] **3. 오류 사례:** 존재하지 않는 item key/slot property, 잘못된 copyItem 반환 타입, update handler 인수를 부정 사례로 작성하고 기대 진단 위치와 코드를 검사한다. 부정 사례는 예상한 컴파일 실패가 성공 조건이며 다른 구문 오류만으로 통과시키지 않는다. 정상 사례의 `any` 처리나 소비자 cast로 결함을 숨기지 않는다.
- [x] **4. 타입 수정:** 실제 SFC 추론이 성립하는 component 타입 선언으로 수정하고 기존 h()·필수 props·slots·event 타입 검증도 통과한다. 단순 교차 타입 제거를 해결책으로 가정하지 않는다. runtime 변경이 필요하면 먼저 이유와 회귀 범위를 기록한다.
- [x] **5. 게이트 연결:** `test:types`에서 기존 tsc와 `node scripts/check-vue-sfc-types.mjs` 모두 성공해야 한다. consumer-smoke는 전달받은 동일 tgz의 타입만 해석하여 SFC 정상/오류 사례를 검증하고 저장소 src나 paths alias를 참조하지 않는다. 기존 Vue 3.5.0 최소 peer와 개발 lock 버전의 Vue를 각각 확인한다. 로컬 타입 검사는 built dist, consumer 검사는 설치된 패키지를 사용한다.
- [x] **6. 완료 판정:** `npm run verify`와 Vue를 포함한 browser 검증을 실행한다. `npm run verify:package-artifact`가 직접 생성·검사하고 출력한 tgz 파일을 `npm run test:consumer -- <동일 tgz>`로 전달한다. artifact checker는 기존 tgz 인자를 받지 않으므로 별도 pack 결과를 검사했다고 보고하지 않는다. 로컬 검증만 수행하며 publish는 하지 않는다.

## Task 5: 브라우저 입력과 선택 복구

**Files:**
- Create: `test/playwright/touch.spec.ts`, `test/playwright/helpers/touch.ts`
- Modify: `playwright.config.ts`, `test/playground/playground.spec.ts`, `test/unit/core/pointer.test.ts`
- Modify only for reproduced defects: `src/core/pointer.ts`, `example/src/playground/runtime-host.ts`, `example/src/styles.css`
- Update: `docs/ko/09-handle-acceptance.md`, `docs/user/09-handle-acceptance.md`

**Interfaces:** Playwright Chromium CDP의 touchStart/touchMove/touchEnd/touchCancel로 실제 브라우저 입력 경로를 사용한다. helper는 locator에서 좌표를 얻고 fixture에서 area/item/종료 결과를 검증한다. DOM에 dispatch한 합성 PointerEvent만으로 터치 브라우저 검증을 대체하지 않는다.

- [x] **1. 대상 분리:** `@touch` 전용 Chromium project에 hasTouch/isMobile을 적용한다. 기존 desktop project와 resource project에서는 해당 태그를 제외한다. device profile 이름을 실기기 증명으로 사용하지 않고 기존 전체 browser suite의 대상 수를 확인한다.
- [x] **2. 터치 검증:** 4 adapters에서 핸들 정렬, 본문 스크롤의 오드래그 방지, 빈 목적지, 경계 autoScroll, touchCancel, 보조 pointer 무시를 검증한다. 브라우저가 스크롤을 처리하면 순서가 유지되어야 하며 cancel 후 change/마커가 없어야 한다. fixture에 없는 조건은 테스트 설정으로 한정하고 제품 demo 기능은 추가하지 않는다.
- [x] **3. 텍스트 선택 검증:** handle/title/card 각 모드에서 drop, Escape 취소, pointer 취소, unmount/remount 이후 선택 억제 해제를 확인한다. 실제 마우스로 본문 일부를 선택하여 `getSelection().toString()`과 대조한다. 본문 선택 가능한 모드/영역을 명확히 하고 드래그 전용 제목 자체까지 선택 가능하다는 새 보장은 하지 않는다. clipboard 권한에 의존하지 않는다.
- [x] **4. 재현과 최소 수정:** 실패 시 조작·adapter·browser 버전·시작/종료 상태·스크린샷/trace를 보존한다. 입력 Core와 Playground CSS/host를 구분하고 RED 확인 후 수정한다. Safari 고유 증상이 WebKit에서 재현되지 않으면 추측으로 수정하지 않고 네이티브 Safari 미확인으로 기록한다. 네이티브 Safari 수동 검증은 이번 계획의 필수 게이트로 두지 않는다.
- [x] **5. 완료 판정:** 새 touch project, Chromium/Firefox/WebKit 본문 선택 시나리오, 기존 pointer unit을 통과한다. 기능 변경 시 `npm run verify`, `npm run verify:e2e`, `npm run verify:playground`를 실행하고 Core 변경이 있다면 Task 2 측정도 재실행한다.

## Task 6: 문서 정합과 최종 검증

**Files:**
- Update as affected: `README.md`, `CHANGELOG.md`, `docs/README.md`, `docs/playground-reference.md`, `docs/playground-preview.md`
- Update: Task 4/5의 한국어·영어 문서 쌍, `docs/verification/next-quality-performance.md`
- Create: `reports/2026-10-04-next-quality.md` — 구현 날짜가 바뀌면 실제 날짜 사용
- Regenerate only if demonstrated UI/behavior changes: `docs/assets/sortable-playground.gif`

**Interfaces:** 새 버전 번호를 가정하지 않고 미릴리즈 변경으로 기록한다. 기존 릴리즈 이력은 보존한다. 성능·브라우저 지원 설명에는 측정 조건과 미검증 범위를 명시한다.

- [x] **1. 문서 업데이트:** 구현한 사항만 반영한다. Vue SFC의 cast 없는 예제, 핸들과 본문 선택의 경계, 측정 조건, 실기기 미검증을 한국어·영어 문서에 맞춘다. 화면 변화 없는 내부 최적화만으로 GIF를 재생성하지 않는다.
- [x] **2. 최종 게이트:** 마지막 의미 있는 변경 후 `npm run verify` → `npm run verify:e2e` → `npm run verify:playground` → `npm run verify:performance` → `npm run benchmark:sortable -- --suite all`을 순차 실행한다. 동일 최종 상태에서 이미 성공한 게이트는 증거를 재사용한다. CI job 사이에서 dist 생성물이 공유된다고 가정하지 않는다.
- [x] **3. 패키지 경계:** 최종 상태에서 artifact checker가 생성·검사한 동일 tgz로 consumer 검증을 통과한다. Task 4 이후 package 출력이 달라졌으면 재검증한다. runtime dependency, optional peers, exports, CSS side effects에 의도하지 않은 변경이 없는지 확인한다.
- [x] **4. 최종 리뷰:** diff 정합·회귀·민감 정보 혼입을 해당 정책에 따라 검토하고 `git diff --check`를 통과한다. 실패는 제품·테스트 계약·환경으로 분류하며 동일 상태의 성공 게이트를 불필요하게 반복하지 않는다.
- [x] **5. 보고:** 작업 일시, 변경 파일, 명령/결과, 측정 JSON/trace, 미완료 항목을 report에 기록한다. 로컬 변경, commit 상태, remote 미반영을 구분한다. 제외한 실기기 검증과 미재현 Safari 증상을 대응 완료로 보고하지 않는다.

## 완료 조건과 실행 경계

- 확인된 Vue 타입 결함과 개발 의존성 문제가 해소되고 관련 회귀 검증이 성공한다.
- 성능/메모리 측정이 재실행 가능하며, 채택한 Core 최적화에는 동일 조건의 개선 증거와 보호 동작 유지 증거가 있다. 미개선 상태를 개선 완료로 표현하지 않는다.
- 브라우저 입력에서 재현한 결함을 수정·검증한다. 재현하지 못하면 검증 추가와 결과 기록을 산출물로 하고 가상의 수정 이력을 만들지 않는다.
- 도구·환경 제한은 해당 Task에만 적용하고 독립 작업은 진행한다. 미실행 게이트를 합격으로 처리하지 않는다.
- 이 문서는 사용자 지정 범위의 확정 계획이며 구현 시작·릴리즈 번호·remote 조작의 승인을 대체하지 않는다. 현재 추가로 결정받을 제품 요구사항은 없다.

## 계획 셀프 리뷰

- [x] 사용자 제외 사항을 전체 Task와 완료 조건에 반영했다.
- [x] 5개 회귀 위험에 대응하는 Task와 구체적인 assertion을 지정했다.
- [x] 기존/신설 명령을 구분하고 측정 전 fresh build와 CI 실행 경로를 명시했다.
- [x] 미확인 누수와 Safari 증상을 확정 결함으로 다루지 않았다.
- [x] runtime 경계, 로컬 검증, 구현 결과, remote 반영을 구분했다.

## 실행 중 확인한 조정

- 별도 worktree 쓰기가 샌드박스에서 거부되어 허용된 checkout의 `codex-next-quality` 브랜치에서 작업한다.
- Playwright는 기본 test-results를 실행 전에 초기화한다. 장기 보존할 로컬 기준값/로그/ledger는 `.local/next-quality/`에 둔다.
- Vue SFC 검사기는 TypeScript 7의 JS API와 호환되지 않아 `typescript-sfc` 별칭의 6.0.3을 개발 전용으로 분리한다. 제품 TypeScript 7은 유지한다.
- Vue 이벤트는 mutable ref의 v-model 할당을 지원하도록 배열 타입을 제공하고, readonly/frozen 입력 롤백에서는 새 배열을 전달한다.
- 비활성 애니메이션의 불필요한 geometry 읽기가 확인되어 `src/core/animation.ts`와 해당 회귀 테스트를 최적화 범위에 추가한다.
- 터치 테스트는 실제 핸들 모드를 갖춘 Playground에 배치한다. 패키지 fixture에 테스트 전용 제품 옵션을 추가하지 않는다.
- README는 설치 다음 소비자 빠른 시작을 우선하며, 로컬 Playground 실행에는 fresh build를 포함한다.

- 벤치마크의 빈 목적지 검증에서 외부 DOM 제거 후 Vanilla footer 삽입 위치 불일치를 재현했다. `dom-transaction.ts`의 등록 시 경계 기억과 공개 어댑터 회귀 테스트를 추가했다.
- 기존 source/destination 외부 변경·geometry·생명주기 보호 테스트는 변경 없이 전체 게이트로 검증했다. 중복 읽기 개선은 `animation.ts`와 `registry.ts`에 한정했다.
- TypeScript 별칭이 `.bin/tsc`를 가리는 문제를 발견하여 일반 typecheck/타입 테스트는 TypeScript 7 실행 파일 경로를 명시했다. SFC 검사만 6.0.3 API를 사용한다.
- 측정 대상 rAF에서 harness 대기 처리를 제외하고 동기 pointerup commit 시간을 별도로 기록한다. 기준 소스의 기존 footer 결함은 결과에 명시하되 수정 전 시간 측정은 계속한다.
- 수정 전 JSON이 Playwright 실행으로 삭제되어, 같은 fixture로 기준 HEAD와 최종 build를 교대로 재측정한다. 최종 기능 게이트를 통과한 이후 다른 build/browser 부하 없이 비교하며, extended soak은 최종 build를 대상으로 실행한다.

## 최종 실행 결과

2026-10-04, 로컬 구현 및 검증 완료. 정책 57개·unit 292개·Core browser 289개·Playground 491개, 패키지/소비자 검사, 기존 자원 게이트, 전후 각 3회 성능 측정과 500회 soak이 통과했다. 표본·drop p95의 한계는 [검증 문서](../../verification/next-quality-performance.md)에 기록했다. 변경 파일과 명령은 [리포트](../../../reports/2026-10-04-next-quality.md)를 따른다. 패키지 0.1.4를 유지하며 변경은 Unreleased로 로컬 개발 브랜치에 보존하며, 원격 미반영 상태다.
