# 현재 코드 기준 README·GIF·문서 갱신

- 일시: 2026-09-22 KST
- 기준: `423a01c` 이후 휴먼 리뷰 수정이 포함된 현재 working tree.
- 범위: README, CHANGELOG, 현재 사용자 문서·검증 색인, 실제 Playground GIF.
- 제품 런타임·공개 API·버전·테스트 계약은 이번 작업에서 변경하지 않았다.

## 대조와 정정

| 대상 | 확인된 차이 | 반영 |
| --- | --- | --- |
| README와 GIF | 이전 선택 초기화·스크롤 장면 및 예제명이 기준 | 현재 5개 장면으로 재촬영, 설명·alt·캐시 키 갱신 |
| README 로고 | npm에서 제외되는 example 경로의 상대 URL | raw repository URL로 통일 |
| 한·영 Quick Start | 모든 카드를 핸들로만 이동한다고 설명 | 기본 핸들과 제목·전체 카드 모드 구분 |
| 한·영 핸들 가이드 | Safari 제목 드래그 후 선택 잔류가 빠짐 | 확인된 환경·재현·미해결 상태 및 전용 핸들 안내 |
| GIF 참조 문단 | 현재 GIF에 없는 초기화·스크롤 장면을 안내 | 해당 Playground 경로로 연결하고 새 피드백 장면 설명 |
| 공개 API 레퍼런스 | README의 삭제된 browser-evidence anchor | 실제 browser-support anchor로 정정 |
| DOC 재사용·검증 색인 | 이전 GIF·검증 범위가 현재처럼 읽힐 여지 | 촬영일·소스·브라우저 범위와 미해결 Safari 결함 명시 |

현재 안내 대상으로 README, docs 색인·참조·캡처 안내, 한·영 16개씩 사용자 가이드를
대조했다. 공개 entry/type 목록과 예제 경로는 기존 검사로 함께 검증했다.
과거 reports, specs, plans 및 릴리스 기록은 당시 증거로 보존한다.

## 새 GIF

- 실제 React·영어 Playground를 headed Chromium에서 조작했다.
- 장면: 빈 슬롯 목록 복귀 → 카드 전체/제목/핸들 전환 → 사용자/기본/거부 CSS →
  목록별 자식 배열 갱신 → Review 하위 트리 이동.
- 원본 153프레임, GIF 147프레임, 1080 × 825, 46.30초, 2,386,636 bytes.
- GIF SHA-256: `13bfd7f330fad4235e9fe0aabeded1a0dc2fd06cd1c9bb22250ae69e144e4dda`.
- 각 드래그의 source/destination, 슬롯 경계, 최종 배열, 거부 시 데이터 유지,
  하위 트리 보존을 확인했다. 상태 주입으로 장면을 만들지 않았다.
- 전체 프레임 decode·크기·duration·loop 검증과 주요 장면 시각 검토 완료.
- raw PNG, 장면 결과, source manifest, contact sheet와 이전 GIF는
  `output/playwright/2026-09-22-docs-gif/`에 보존한다.
- 상세 출처는 `docs/playground-preview.md`에 기록한다.

## 변경 파일

- `README.md`, `CHANGELOG.md`, `docs/assets/sortable-playground.gif`
- `docs/README.md`, `docs/playground-preview.md`, `docs/playground-reference.md`
- `docs/user/` 및 `docs/ko/`의 01, 09, 10, 13, 15, 16 가이드
- `docs/verification/0.1.3-local-validation.md`, 이 기록

## 검증

- 사용자 문서 검사 9/9: 한·영 가이드 쌍, 18개 전체 예제 타입, 25개 Playground
  경로 매핑, 공개 export/type 안내, public import, 상대 링크 검사 통과.
- 사용자 문서·색인 상대 링크와 README heading anchor 추가 확인 통과.
- 라이선스 검사 및 `git diff --check` 통과.
- GIF 5개 실제 조작 장면 검증 통과. 전체 브라우저 회귀 재실행을 의미하지 않는다.
- README/CHANGELOG 변경 후 새 로컬 artifact 생성, 파일·라이선스 gate, 소비자
  설치 및 모듈 import, 추출 파일 Gitleaks 통과.
- tarball 내부 README/CHANGELOG와 현재 파일의 바이트 일치 확인.
- 최신 artifact: `output/release/2026-09-22-docs-nrdkute3/comins-sortable-0.1.3.tgz`.
- artifact SHA-256: `74468553ddea45211cafa1a2dbdf7baa867bd4dbf5fc369816a5063555348fe0`.
- 기존 tarball과 이전 검증 증거는 덮어쓰지 않고 보존했다.

## 잔여 범위

- Safari 26.6.2 React 제목 드래그의 본문 선택 잔류 결함은 미해결이다.
  이번 문서 갱신이나 Chromium GIF를 수정 완료 증거로 사용하지 않는다.
- 단위 274 / Playground 363 / 패키지 E2E 256은 직전 런타임 수정 검증 기록이며
  이번 문서 작업에서 전체 게이트를 반복하지 않았다.
- 아직 커밋·push·PR·태그·Release·npm 발행하지 않았다. README의 raw 이미지 URL은
  변경 파일이 main에 반영되어야 외부에서도 최신 내용으로 표시된다.
