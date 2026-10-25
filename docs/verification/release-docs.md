# 버전 변경과 문서 자동 갱신

`CHANGELOG.md`가 릴리스 설명의 원본이다. 제품 기능·API 설명은 해당 영문·국문
사용자 가이드에서 관리한다. 자동화는 구현이나 테스트 결과를 추측해 작성하지 않는다.

## 다음 버전 준비

1. CHANGELOG의 `Unreleased` 변경을 새 `## 0.x.y` 절로 옮긴다. 아직 게시하지 않은
   후보에는 배포일을 쓰지 않는다. `### Highlights`와 `### 주요 변경`에 각각 영문·국문
   요약을 bullet로 작성하고, 상세 변경과 알려진 제한을 같은 버전 절에 기록한다.
2. `docs/verification/0.x.y-local-validation.md`를 작성한다. 현재 코드·기록된 증거·
   새 검증·실패·미실행·배포 상태를 구분한다. 영향받은 사용자 가이드와 예제도 수정한다.
3. 버전만 로컬에서 올린다. 다음 명령은 commit/tag/push/publish를 만들지 않는다.

   ```sh
   npm version 0.x.y --no-git-tag-version
   ```

4. npm `version` lifecycle이 새 manifest 버전을 읽어 `npm run docs:sync`를 실행한다.
   README 제목 바로 아래 영문 요약, 문서 인덱스의 영문·국문 요약,
   `docs/releases/latest.md`의 전체 변경 사항이 생성된다. 생성 블록 밖의 문구는 유지한다.
5. `npm run check:docs`와 변경에 맞는 검증을 실행한다. `npm run verify`에도
   동기화 검사가 포함된다. 원격 Docs CI는 문서 변경만 있는 경우에도 검사한다.

문서를 수정한 뒤 다시 생성하려면 `npm run docs:sync`를 실행한다.
버전 설명·번역·검증 문서가 없거나 생성 마커가 손상되면 문서를 쓰기 전에 실패한다.
단, npm은 lifecycle보다 먼저 package/lock 버전을 변경하므로 실패 시 해당 버전은 이미
바뀌었을 수 있다. 원본 문서를 보완한 뒤 `npm run docs:sync`를 실행하면 된다.
`--ignore-scripts`로 버전을 바꾸거나 manifest를 직접 편집했다면 자동 실행되지 않으므로
동일 명령을 직접 실행한다. 배포 단계의 `--ignore-scripts`는 이 문서 생성을 대체하지 않는다.

## 자동화 범위

자동 생성 대상은 README·문서 인덱스의 요약 블록과 최신 릴리스 문서다. API 의미,
브라우저 지원 범위, 예제, 과거 검증 보고서는 자동으로 재작성하지 않는다. 기능 변경 시
관련 가이드를 먼저 갱신하고 검증하며, 과거 보고서는 당시 결과로 보존한다.
다른 Comins 모듈·문서 사이트의 갱신 및 공개 게시에는 해당 저장소의 별도 작업이 필요하다.

README와 CHANGELOG는 npm 패키지에 포함되지만 문서 디렉터리는 기존 패키지 경계에
따라 GitHub에서 제공한다. 문서 갱신 성공은 npm 게시 완료나 native 장치 검증을 의미하지 않는다.
