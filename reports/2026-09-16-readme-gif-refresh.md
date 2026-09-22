# 0.1.3 README·CHANGELOG·GIF 갱신

- 작업일: 2026-09-16 KST
- 기준: `codex/0.1.3-stability`, `044d35f` 위 최신 로컬 수정
- 범위: 0.1.3 변경 사항 문서 반영과 실제 Playground GIF 재촬영

## 반영 내용

- README에 선택 정리·시간 기반/RTL 자동 스크롤·드롭 미리보기 개선 요약을 추가했다.
  GIF 대체 텍스트와 장면 설명을 새 촬영 내용에 맞췄다. 공개 이미지 URL에는
  `v=0.1.3` 쿼리를 사용했다. 원격 파일 갱신은 향후 원격 반영 시 적용된다.
- CHANGELOG에 카드 색상 띠 제거, 예제명·안내 패널 변경, GIF 재촬영을 기록했다.
- 문서 인덱스와 한·영 자동 스크롤·중첩/트리·Placeholder·고급 정렬 가이드에서
  해당 GIF 장면으로 연결한다. 현재 검증 문서는 새 촬영과 과거 자동 검증을 구분한다.
- GIF 촬영 기록에 소스 지문·자산 해시·프레임 수·재생 시간·검증 결과를 갱신하고,
  0.1.2 시점의 이전 GIF 이력도 보존했다.

변경 파일: `README.md`, `CHANGELOG.md`, `docs/README.md`,
`docs/assets/sortable-playground.gif`, `docs/playground-preview.md`,
한·영 `10-animation-auto-scroll.md`, `12-nested-tree.md`, `13-placeholder.md`,
`16-advanced-sorting.md`, `docs/verification/0.1.3-local-validation.md`, 이 보고서.

## 실제 촬영 결과

headed Chromium, React, English, 1440×1100 화면에서 Playwright CLI로
마우스·보조키·버튼·스크롤을 직접 조작했다. 애플리케이션 상태를 주입하지 않았다.

1. Build 선택 → 초기화 후 선택 0 → Shift+Review 후 Review만 선택 → Review만 선두로 이동.
2. 자식 순서 뒤집기 후 child는 Release·Review, todo는 Research·Design·Build 유지.
   한 번 더 눌러 자식 순서를 복원했다.
3. Review를 Design 하위로 이동한 뒤 Document·Observe는 Review 하위에 유지.
   Research 하위에는 Release가 남았다.
4. 스크롤 경계에서 미리보기 hidden, scrollHeight 720·scrollTop 390·clientHeight 330 확인.
   재진입 시 미리보기 복원, Research를 마지막 항목으로 이동했다.

새 GIF: 1080×825, 원본 PNG 97개, 인코딩 프레임 95개, 27.76초, 1,956,821 bytes.
읽기 쉬운 재생을 위해 정지 구간을 조정했으며 실제 스크롤 속도 측정 자료는 아니다.

- GIF SHA-256: `e33ff9ba7c12df7e13e5bc349ada18fadb20122f29be294da6cee4107bdd66f1`
- 런타임 소스 지문: `4a5d0397491ad6ab86648788bc234abcf76db6fc57af0dcf40c56eed5441210e`
- [새 GIF](../docs/assets/sortable-playground.gif)
- [디코딩 프레임 검토 시트](../output/playwright/2026-09-16-gif/decoded-contact-sheet.png)
- 로컬 원본·이전 GIF·인코더·소스 지문·장면별 검증 manifest:
  `output/playwright/2026-09-16-gif/`
- 촬영 로그: `/private/tmp/sortable-gif-{reset,lists,tree,scroll}.log`

## 검증과 범위

- `npm run check:licenses`: PASS. 동일한 first-party/MIT 문서 자산 선언을 유지한다.
- `npm run test:policy`: 51/51 PASS. 한·영 가이드, 예제 타입, 공개 API 및 문서 링크 포함.
- GIF 95개 프레임 전체 디코딩: 크기, 프레임별 양수 duration, 총 재생 시간, 무한 반복 설정 PASS.
- 각 장면의 시작·조작·결과를 시각 검토했다.
- 이번 작업은 문서와 GIF 변경이다. 기존 Core·전체 브라우저·성능 게이트를 다시 실행하지 않았다.
- 실제 Safari, 터치/고주사율 장치, 정확한 배포 아티팩트의 검증을 대신하지 않는다.
- 커밋·원격 push·배포는 수행하지 않았다. 기존 미커밋 작업과 산출물은 보존했다.
