# 다음 버전 검토와 검증 범위 — 2026-10-19

## 범위

2026-10-19 당시 패키지는 0.1.6이었다. 현재 0.1.7 배포 준비 상태와 Safari 후속 결론은
[0.1.7 검증 상태](./0.1.7-local-validation.md)를 따른다. 정식 Governance v1.12를 기준으로 한다.
키보드는 제외하고, 3D·프레임워크 hook/composable API는 보류한다. 원격 PR·CI 진행은 후속 승인 범위이며 npm 발행은
포함하지 않는다. 버그 재현/기능 구현과 검토 권고를 구분한다.

## 렌더링 확장

선택형 `placeholder.render`·`dragOverlay.render`를 네 어댑터에서 제공한다.
Core가 임시 host·좌표·크기·정리를 소유하고 소비자는 내부만 렌더링한다.
생성·갱신·정리 예외와 cancel/destroy 재진입을 검사한다. 기본 source-owned 경로는
유지한다. 세부 계약과 제한은 [Placeholder 가이드](../ko/13-placeholder.md)를 따른다.

Astra 역할의 읽기 전용 설계 검토를 받았다. 역할 할당과 실제 실행 모델 메타데이터의
독립 확인은 다르다. 구현 중 모델 용량 오류가 발생하여 하위 에이전트를 중단하고
주 세션에서 이어받았다. 임의 모델 대체나 설정 변경은 하지 않았다.

## Safari 선택 잔류

제목 드롭 직후 선택 문자열이 비어 있어야 하는 회귀를 추가했다. 수정 전 WebKit의
React 예제에서 본문 선택 잔류를 재현했다. 명시적 mouse handle의 accepted attempt
동안 `selectstart`를 취소하여 활성화 대기 중 시작되는 선택을 막는다. 기존 Selection을
초기화하거나 본문의 상시 선택을 차단하지 않는다. 실제 Safari 27.0.1 조작은 화면
잠금 때문에 차단됐으며, WebKit 결과를 네이티브 Safari 통과로 표현하지 않는다.

## 동적 transform 진단

기본 게이트와 분리된 진단 명령:

```sh
npm run build
npm run playground:build
npx playwright test --config=playwright.diagnostics.config.ts
```

기준 소스 `07015743f8588b50d0d5118fa9640dad34c96ef4`에서 Chromium 진단 12건이
위치 오차로 실패했다. 네 어댑터에서 `none → rotate/scale`, `scale → rotate/scale`,
포인터 정지 중 scale 변경을 재현한다. 이동 직후 첫 처리 프레임을 관측하여 이후
프레임의 오차 수렴으로 결함이 가려지지 않도록 한다. 이 진단은 지원 확장을 보장하는
acceptance gate가 아니며, 실패를 기본 정적 transform 회귀와 구분한다.
최종 후보도 Chromium/Firefox/WebKit의 같은 진단 36건에서 좌표 assertion으로
실패했다. 이후 drop/reason/cleanup 검사는 도달하지 못했으므로 검증 완료로
표현하지 않는다.

원인: fixed feedback 역행렬을 activation에 캐시하며, 초기 containing block이 없으면
해당 mover를 만들지 않는다. transform만 바뀌면 같은 영역의 geometry 무효화와
정지 pointer refresh가 발생하지 않는다. 이동 중 감지·행렬 재측정·영향 geometry
무효화 및 release 재검증을 함께 설계해야 한다. 기본 MutationObserver·상시 rAF를
암묵적으로 추가하지 않았다. 정지 중 자동 추적은 성능 계약을 별도 결정해야 한다.

## 장기 메모리 증가 요인

초기 조사에서 `SessionMachine.history`의 상태 전이별 누적과 완료 disposer의
closure 참조 보유를 확인했다. 후속 수정에서 production history를 제거하고,
Core/Vanilla의 해제 참조를 일회성 cell로 관리한다. 고정된 browser heap 검증기는
수정 전 8 FAIL, 수정 후 8 PASS를 확인했다. 동일 scope 반복과 종료 disposer 보유를
각각 검사하며, 현재 이력 내부 진단도 `storesHistory=false`를 확인한다.

```sh
npm run build
node test/diagnostics/session-history.node.mjs
npm run verify:performance
```

전후 수치와 범위는 [메모리 수정 보고서](../../reports/2026-10-19-memory-retention-fix.md)를
따른다. 합성 pending 대량 반복과 실제 mouse commit/cancel을 구분하며,
모든 소비자 renderer나 물리 장치의 무누수를 보장하지 않는다.

## 다른 모듈의 편의 기능 비교

공식 문서의 기능/API 비교이며, 다른 라이브러리의 속도 순위를 측정한 결과는 아니다.

| 후보 | 현재 Comins와의 차이 | 우선 검토 |
|---|---|---|
| 터치 지연·입력별 활성화 조건 | 현재 공개 옵션은 이동 거리 기준이며 touch 전용 delay/tolerance 없음 | 높음: 스크롤과 오작동 drag 분리 |
| 자동 스크롤 속도·경계 거리 | `autoScroll`은 boolean, 경계 32px·최대 속도는 내부 상수 | 높음: 보드/모바일 환경별 조절 |
| 드래그 이동 축·영역 제한 | `direction`은 삽입 계산 방향이며 preview 이동 제한과 다름 | 사용 사례 확보 후 |
| 프로그램 방식 다중 선택 | modifier 기반 선택은 있으나 공개 select/deselect API 없음 | 외부 선택 UI와 연동 필요 시 |
| 요약 preview·선택 개수 표시 | 이번 renderer 확장으로 소비자 구현 가능 | 새 엔진 기능 대신 예제 활용 |

근거:

- [dnd-kit 입력 센서](https://dndkit.com/react/guides/sensors/): distance/delay/tolerance와 pointer 유형별 설정.
- [dnd-kit DragOverlay](https://dndkit.com/react/components/drag-overlay/): 원본과 다른 preview 내용.
- [dnd-kit legacy modifiers](https://dndkit.com/legacy/api-documentation/modifiers/): 축·부모/화면 경계 제한. 최신 sensor API와 legacy modifier API를 혼용하지 않는다.
- [SortableJS 옵션](https://github.com/SortableJS/Sortable#options): delay·touch 전용 옵션과 fallback 관련 설정.
- [SortableJS AutoScroll](https://github.com/SortableJS/Sortable/blob/master/plugins/AutoScroll/README.md): scrollSensitivity·scrollSpeed·bubbleScroll.
- [SortableJS MultiDrag](https://github.com/SortableJS/Sortable/blob/master/plugins/MultiDrag/README.md): 프로그램 방식 select/deselect.

이 비교는 검토 후보이며 추가 API 구현 승인을 의미하지 않는다.

## 자원 측정 경계

lockfile의 Playwright 1.64.0·Chromium 156에서 첫 GC 직후 node 수만 읽으면,
다음 두 프레임과 두 번째 GC에서 회수되는 이전 화면의 노드가 포함될 수 있었다.
별도 진단에서 Vanilla 636 → 467, Svelte 793 → 589로 회수되고 100회 반복의
안정화 값은 warm 기준과 같았다. 공식 sampler에도 같은 프레임·GC 절차를 적용한다.
node·listener·heap 허용치를 완화하지 않는다. 이 결과는 실제 장기 scope 이력 증가나
다른 소비자 renderer의 누수 가능성을 부정하는 근거가 아니다.
