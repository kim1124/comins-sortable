# 0.1.2 Linux CI 드래그 결함 수정

- 작업 일시: 2026-09-11 13:00 KST
- 대상: `codex-0.1.2-quality-verification`, `f50001c` 이후 변경
- PR: https://github.com/kim1124/comins-sortable/pull/24
- 정책: Comins Contract v1.8

## 원인과 수정

PR의 첫 Verify 실행에서 Package와 E2E 238개는 통과했으나 Playground는
270개 통과, 6개 실패였다. Performance는 선행 실패로 건너뛰었다.
macOS production preview의 관련 10개 사례는 통과했으므로, 별도 임시 소스
복사본과 공식 Playwright 1.62.1 Ubuntu 24.04 이미지로 Linux에서 조사했다.
컨테이너는 arm64이며 GitHub의 x64 러너와 아키텍처까지 같지는 않다.
저장소의 의존성이나 lockfile은 변경하지 않았다.

Linux에서 동일한 6건이 재현되었다. 텍스트 선택 후 핸들을 누르면 기본
`dragstart`가 정렬 활성화보다 먼저 시작했다. Chromium은 `pointercancel`을
보냈고, WebKit은 이후 포인터 이동을 전달하지 않아 초기 placeholder가 남았다.
선택 드래그의 이벤트 대상은 Element가 아닌 Text 노드일 수도 있었다.

Core의 PointerSensor가 정렬 대상으로 수락한 마우스 입력을 처리하는 동안만
기본 `dragstart`를 취소한다. 기존 AbortController로 release, cancel, unmount,
destroy 시 리스너를 해제한다. 선택 범위를 지우거나 pointerdown 기본 동작을
취소하지 않으므로 일반 텍스트 선택과 포커스 동작을 유지한다. 수락하지 않은
입력과 touch/pen 입력에는 이 기본 드래그 차단을 등록하지 않는다.

Safari 실제 조작에서는 빠른 드래그가 가끔 원래 위치에 놓이는 별도 조건도
관찰했다. 마지막 이동 프레임이 활성화만 수행하고 끝난 뒤 pointerup이 오면
목적지 계산이 생략되는 경로였다. 단위 및 Chromium 회귀 테스트로 실패를
확인한 뒤, 마지막으로 처리한 좌표와 보조키를 기록하여 아직 처리하지 않은
release 입력만 계산한다. 이미 처리한 입력의 onDrag 콜백은 반복하지 않는다.

## 변경 파일

- `src/core/pointer.ts`: 기본 드래그 차단 수명과 누락된 최종 위치 계산.
- `test/unit/core/pointer.test.ts`: 차단 경계·해제·최종 좌표 회귀 및 release 계약.
- `test/playground/playground.spec.ts`: 단일 이동 프레임 회귀와 실제 활성 항목 확인.
  기존 본문 선택 테스트는 카드가 화면에 들어온 뒤 좌표를 측정하도록 보강했다.
- `CHANGELOG.md`: 두 결함 수정 기록.
- 이 리포트.

## 검증

| 단계 | 결과 |
| --- | --- |
| Linux 원본 관련 10개 | 4 통과, 기존 CI와 동일한 6 실패 |
| 실제 카드 좌표로 보강한 핸들 사례 | Chromium·WebKit 2개 모두 수정 전 실패 |
| 기본 드래그 차단 단위 회귀 | 수정 전 실패, 수정 후 통과 |
| 단일 이동 프레임 회귀 | 단위·Chromium 수정 전 실패, 수정 후 통과 |
| 포인터·기존 이벤트 순서 계약 | 30/30 통과 |
| 최종 `npm run verify` | 정책 51/51, 단위 249/249, typecheck, build, public types 통과 |
| 최종 Linux 관련 회귀 | Chromium·Firefox·WebKit 18/18 통과 |
| 중간 Linux 전체 게이트 | 기본 드래그 차단 후 E2E 238/238, Playground 276/276, 성능 1/1 통과 |
| 실제 Safari 26.6.2 | 네 어댑터에서 이동 → Desi 부분 선택 → Cmd+C/Cmd+V → 재이동 통과 |

중간 Linux 전체 결과는 최종 위치 계산 보완 전의 기록이다. 최종 코드의 전체
게이트는 PR에 push한 커밋의 Verify 결과로 확인한다. 최종 Playground 대상은
새 회귀 3개가 추가된 279개다. PR 본문에 원격 완료 결과를 갱신한다.

Safari 검증은 실제 마우스·키보드로 수행했다. 주소 입력란에 붙여넣은 `Desi`를
확인했으며 검색이나 URL 이동은 하지 않았다. 드래그 전후 카드 순서를 AX로
확인했다. Selection API로 선택을 주입하지 않았다. 실제 터치 기기와 Safari의
보조키를 누른 채 클릭하는 입력은 이번 검증에 포함하지 않았다.

## 새 패키지 산출물

- 파일: `comins-sortable-0.1.2.tgz`
- SHA-256: `c77d883dea06b78d5f456ef157201c7414fc3a34ee08d5366fa0d460ffd37df2`
- 최종 수정의 빌드 결과로 정확히 한 번 pack하고, 그 파일의 내용·라이선스·export
  검사와 추출 디렉터리 Gitleaks 검사를 통과했다.
- 이전 준비 기록의 `1fc731c7...` tarball은 이번 런타임 수정을 포함하지 않는다.
- 동일한 새 tarball의 consumer 검사도 통과했다. 최소 지원 framework peers를
  설치한 격리 환경에서 5개 JS 진입점 import와 CSS resolve를 확인했다.
  모든 peer 버전이나 별도 소비 앱 UI를 인증하는 검사는 아니다.
- 버전은 0.1.2와 Unreleased를 유지했다. merge, publish, tag, Release는 별도 단계다.

로그, 원본 실패 trace, 진단 이벤트와 새 tarball은 로컬 임시 폴더
`sortable-0.1.2-preparation`에 보관했다. 기존 미추적 산출물 두 개는 변경하지 않았다.
