# 현재 작업 브랜치의 Comins Contract v1.8 지침 동기화

- 작업 일시: 2026-09-08 (Asia/Seoul)
- 브랜치: `codex-0.1.2-quality-verification`
- HEAD: `e04c549` 유지
- 공통 정책: Comins Contract v1.8

## 요약

`main`은 `0be429d`에서 이미 v1.8을 채택했지만, 현재 작업 브랜치는 이전
커밋에 있어 v1.7 지침이 남아 있었다. maintainer의 동기화 요청에 따라 공식
`comins-reference` 도우미로 managed guidance를 갱신하고 README 및 정책
검증 테스트의 버전 기대값을 일치시켰다.

## 변경 파일

- `AGENTS.md`: 공식 v1.8 managed block 반영. Module Guidance 보존.
- `README.md`: 공통 Contract 링크의 버전 표기만 v1.8로 변경.
- `test/sensitive-data-gates.node.mjs`: 지침 채택 테스트 이름과 두 버전
  assertion만 v1.8로 변경.
- `reports/2026-09-08-governance-sync.md`: 이번 동기화와 검증 기록.

`.codex/config.toml`은 도우미 실행 전부터 공식 템플릿과 일치하여 내용 변경이
없다. 기존 README·테스트·제품 구현의 미커밋 변경은 보존했다.

## 검증

- 공식 Contract 제목 및 Governance v1.8 CHANGELOG·managed templates 확인.
- `comins-reference` update 성공.
- `AGENTS.md` managed block과 공식 템플릿 일치, 전체 파일과 로컬 `main` 일치.
- Module Guidance 및 `.codex/config.toml` 작업 전후 동일.
- Python `tomllib`으로 프로젝트 config 파싱 및 공식 config와 값 일치 확인.
- 지침 inventory: 대상 `sortable`, 적용 스킬 `comins-reference`, findings 0.
- `npm run test:policy`: 50/50 통과, 실패·skip 0.
- 작업 전후 파일 비교: 기존 파일은 위 세 파일의 지침 버전 부분만 변경.
- `git diff --check`: 통과.

## 잔여 범위

- 지침만 동기화했으며 `main` 전체를 merge하거나 adoption commit을
  cherry-pick하지 않았다. Dependabot 등 해당 커밋의 나머지 변경은 이번 범위가
  아니다.
- HEAD·index와 기존 미커밋 변경을 유지했다. commit·push·PR·publish는 미수행.
- 제품·공개 API·런타임 동작을 변경하지 않아 전체 제품 verify, E2E, 성능 게이트는
  실행하지 않았다. 이번 정책 테스트 통과를 기존 0.1.2 기능 변경의 검증 완료로
  확대하지 않는다.
- 프로젝트 모델 설정은 저장소 trust 등 Codex 로딩 조건의 영향을 받으며,
  파일 일치만으로 현재 세션의 유효 모델을 판정하지 않는다. Governance 준수는
  이 설정 로딩 여부와 관계없이 필수다.
- 드래그 테스트 수정 구현은 시작하지 않았다.
