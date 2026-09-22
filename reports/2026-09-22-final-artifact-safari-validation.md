# 0.1.3 휴먼 리뷰 수정 후 패키지·Safari 검증

- 일시: 2026-09-22 KST
- 기준: `423a01c98fb613233042fe7d7104e2cb29d6c175` 이후 현재 로컬 변경 포함.
- 요청 범위: 검증. 제품 코드·테스트 계약은 변경하지 않았다.
- 결론: 정확한 패키지 검증 통과. 네이티브 Safari에서 제목 드래그 후 텍스트 선택
  잔류 결함 1건을 재현하여 전체 통과로 판정하지 않는다.

## 정확한 패키지

현재 소스를 새로 빌드한 뒤 `npm run verify:package-artifact`로 생성한 동일 tarball을
`npm run test:consumer -- <artifact>` 및 추출 디렉터리 Gitleaks 검사에 사용했다.

- 패키지 allow-list, 공개 export 파일, 라이선스: 통과.
- 임시 소비자 설치 후 root/core/React/Vue/Svelte import 및 CSS resolve: 통과.
- 소비자 peer: React/React DOM 18.2.0, Vue 3.5.0, Svelte 5.0.0.
- 추출 파일 Gitleaks: 통과. 원시 탐지 출력은 저장·노출하지 않았다.
- SHA-256: `04c3a7abaea0b5aef3092bc164413b5819e7c924ac02b37d61ebc1cb485e53c0`.
- 소비자 검증 후에도 위 해시 유지.
- 증거: `output/release/2026-09-22-verified-epcl0xwd/`의 tarball,
  `build.log`, `artifact.log`, `consumer.log`, `artifact-evidence.json`.

소비자 검증은 설치·모듈 import 검사이며 네 어댑터 전체 런타임 통합 검증은 아니다.
커밋 전 working tree의 artifact이며 발행·원격 쓰기는 수행하지 않았다.

## 네이티브 Safari 직접 조작

Safari 26.6.2 앱을 직접 조작했다. WebKit 자동 테스트 결과와 구분한다.
화면·접근성 관찰 증거: `output/playwright/2026-09-22-native-safari-final/`.

| 시나리오 | 결과 | 증거 |
| --- | --- | --- |
| Vanilla 두 목록 슬롯: Research/Design/Build 모두 오른쪽 이동 후 Build 복귀 | header → Build → footer, 수 표시 0/4 → 1/3 | `vanilla-empty.png`, `vanilla-refilled.png` |
| React 동일 슬롯 시나리오 | 동일하게 슬롯 사이 복귀 | `react-empty.png`, `react-refilled.png` |
| React 카드 전체: Build 설명에서 위로 이동 | Build가 첫 항목으로 이동 | `react-card-mode.png` |
| React 제목 영역: 제목에서 위로 이동 | 순서 변경 성공, 본문 선택 잔류 실패 | `react-title-mode.png`, `react-title-fresh-repro.png`, `react-title-fresh-repro.txt` |
| React 기본 핸들 모드에서 본문 선택 | Product discovery 선택, 정렬 이벤트 0 | `handle-text-selection.png`, `handle-text-selection.txt` |
| React 피드백 예제: 허용 상태에서 Build 이동 | 4/1 → 3/2, change 및 afterDrag/drop | `feedback-accepted-drop.png`, `feedback-accepted-drop.txt` |
| 동일 예제: 대상 허용 끈 뒤 Design 이동 시도 | 3/2 유지, afterDrag/not-accepted | `feedback-rejected-drop.png`, `feedback-rejected-drop.txt` |

피드백 예제 첫 시도는 페이지 하단에서 레이아웃 높이·스크롤 변동으로 대상 좌표가
벗어나 afterDrag/outside로 취소되었다. 전체 화면에 목록이 들어오도록 페이지를 축소한
뒤 새 좌표로 허용/거부를 확인했다. 완료 후 원래 배율로 복원했다.
드래그 중간 Placeholder/outline 프레임은 이번 Safari에서 별도 촬영하지 않았다.
이 표는 Vue/Svelte 네이티브 Safari 전체 범위나 터치 기기 검증을 의미하지 않는다.

## 발견 결함: 제목 드래그 후 선택 잔류

- 우선순위: P2, 사용자 조작·복사 UX 결함. 이번 재현에서 데이터 손실은 관찰하지 않았다.
- 경로: `/examples/handle/react`.
- 재현: 새로고침 → 제목 영역 선택 → 세 번째 Build 제목을 첫 카드 위로 드래그.
- 기대: 순서가 변경되고 의도하지 않은 본문 선택은 남지 않는다.
- 실제: Build가 첫 항목으로 이동하나 여러 카드의 본문이 파란색으로 선택되어 남는다.
  카드 전체 → 제목 전환 후에도, 새로고침 직후 제목 모드에서도 재현했다.
- 기본 핸들 모드로 바꿔도 기존 선택이 남는 것을 추가 관찰했다.
- 확정된 코드 사실: `example/src/styles.css`는 제목에 user-select:none을 적용하고,
  본문은 text, dragStart 이후에는 전체 본문 선택 억제 스타일을 적용한다.
  `src/core/pointer.ts`는 활성화 이후 pointermove만 preventDefault하며,
  `example/src/playground/runtime-host.ts`는 dragStart/afterDrag에서 CSS 상태를 토글한다.
- 원인 후보: 활성화 전 선택 시작 또는 종료 시 선택 억제 해제와 Safari 선택 범위가
  맞물리는 타이밍. 실제 이벤트·선택 범위 추적 없이 어느 지점인지 확정하지 않는다.
- 기존 드래그 모드 회귀는 순서와 핸들 복귀 후 의도적 텍스트 선택을 검사하지만,
  제목 드롭 직후 의도하지 않은 선택 범위가 비었는지는 검사하지 않는다.
- 다음 수정 시 제목 드롭 직후 선택 잔류 회귀를 추가하고, 일반 본문 선택·복사 보존을
  함께 확인해야 한다. 검증 요청이므로 이번에는 구현을 수정하지 않았다.

이전 단위 274 / Playground 363 / 패키지 E2E 256 결과는 직전 작업의 기록이다.
이번에는 소스 변경 없이 남은 artifact 및 Safari 검증만 수행했다.
