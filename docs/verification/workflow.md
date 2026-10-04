# 검증 실행 절차

빌드·컴파일러 설정·의존성·검증 fixture를 바꾸면 push 전에 아래 절차를 적용합니다.
일반 문구 수정에는 관련 문서 검사와 빌드 등 영향 범위의 검사만 선택합니다.
성공한 동일 소스의 검증을 이유 없이 반복하지 않습니다.

## 1. 검증할 커밋과 초기 상태 고정

- 변경 범위를 확인하고 로컬 커밋을 만듭니다. 이 커밋을 검증한 후 push합니다.
- 기존 작업 폴더의 `dist`, `node_modules`, 브라우저 산출물을 지우지 않습니다.
  별도 checkout을 사용해 사용자 자료와 실행 중인 환경을 보존합니다.
- 새 checkout에서 의존성을 다시 설치합니다. 기존 `node_modules` 심볼릭 링크는
  CI 설치 검증의 대체물이 아닙니다.

저장소 루트에서 실행합니다. `verification_dir`는 새 임시 폴더이며 원격 쓰기는 없습니다.

```sh
verification_source="$(git rev-parse --show-toplevel)"
verification_head="$(git rev-parse HEAD)"
verification_dir="$(mktemp -d "${TMPDIR:-/tmp}/sortable-verify.XXXXXX")"
git clone --no-local --no-hardlinks --no-checkout "$verification_source" "$verification_dir"
git -C "$verification_dir" checkout --detach "$verification_head"
cd "$verification_dir"
test ! -e dist
test ! -e .playground-dist
test ! -e .example-dist
test ! -e node_modules
npm ci --ignore-scripts
npm run verify
```

이 절차는 **커밋된 파일만** 검증합니다. 미커밋 변경이 있으면 해당 변경까지 검증됐다고
보고하지 않습니다. 검증 폴더와 로그는 완료 후 보존 여부를 확인한 뒤 정리합니다.

## 2. 빌드 전·후 검사 경계 유지

- `typecheck`: 빌드 전 검사이며 생성된 `dist`를 요구하면 안 됩니다.
- `build`: 현재 소스에서 패키지 코드와 선언을 생성합니다.
- `test:types`: 빌드 후 공개 패키지 타입을 검사합니다. `test/performance`처럼
  `dist`를 import하는 fixture도 이 단계에서 검사합니다.
- 검사를 옮겼다면 단순 exclude로 끝내지 않습니다. 별도 검증 사본의 fixture에
  의도적인 타입 오류를 잠시 넣어 후속 검사가 실패하는지 확인하고 원복합니다.
- `npm run verify`의 순서를 임의로 바꾸거나, 먼저 빌드해 놓고 원래 순서가
  깨끗한 checkout에서도 성공했다고 보고하지 않습니다.

2026-10-04 PR #33에서는 기존 로컬 `dist` 때문에 성능 fixture의 빌드 전 import 오류를
놓쳤습니다. CI Package 작업이 실패하고 Browser/Performance는 실행되지 않았습니다.
`658677b`에서 fixture를 빌드 후 타입 검사로 옮겼으며, 깨끗한 소스 재현·오류 검출
대조·전체 CI 성공으로 확인했습니다. 원인과 결과는
[작업 보고서](../../reports/2026-10-04-next-quality.md#pr-ci-follow-up)를 참고합니다.

## 3. 변경 범위에 맞는 브라우저·패키지 검증

- 드래그 동작·어댑터 변경: 실제 영향을 받는 회귀 시나리오를 먼저 실행하고,
  마지막 의미 있는 변경 후 해당 전체 게이트를 한 번 실행합니다.
- Core 브라우저 fixture: `npm run verify:e2e`.
- Playground: `npm run verify:playground`.
- 성능·정리: `npm run verify:performance` 및 필요 시 `npm run benchmark:sortable`.
  시간 비교 중 다른 build/browser 작업을 함께 실행하지 않습니다.
- CI job은 다른 job의 `dist`를 공유하지 않습니다. 각 job의 준비 단계로 필요한
  소스·패키지를 직접 빌드해야 합니다.
- 릴리즈 후보는 artifact checker가 생성·검사한 **동일 tgz**를 소비자 검사에
  전달합니다. 로컬 소스 검사만으로 배포 아티팩트 검증을 대체하지 않습니다.

## 4. 실제 조작이 의도한 경로를 통과했는지 확인

1. 활성화 직후 요청한 `areaId`와 `itemId`가 실제 시작 항목인지 확인합니다.
2. 활성화·placeholder 삽입·스크롤 이후 대상 좌표를 다시 읽습니다. 필요하면
   `elementsFromPoint`와 가장 가까운 등록 Area로 실제 목적지를 확인합니다.
3. 이동 결과뿐 아니라 종료 사유와 change 발생 여부를 확인합니다. 정렬이 그대로라는
   사실만으로 거부 로직이 실행됐다고 판단하지 않습니다.
4. 최종 DOM 순서, 읽을 수 있는 모델 상태, placeholder·dragging·rejection 정리를
   구분해 기록합니다. DOM만 확인했다면 내부 모델까지 확인했다고 보고하지 않습니다.
5. 거부 시나리오는 실제 대상에 도달한 증거와 허용된 이동 대조군을 함께 확보합니다.

공개 tree 예제에서는 부모와 하위 영역이 함께 움직이고 하위 영역이 hit 대상에서
제외됩니다. 자기 하위로 이동을 시도한 뒤 `drop`과 순서 불변을 관측할 수 있습니다.
`nested-cycle` 분기는 별도로 노출된 논리적 하위 영역에서 검증할 수 있지만, 이
fixture 결과를 공개 화면에서 거부 피드백을 봤다는 증거로 사용하면 안 됩니다.
WebKit과 터치 에뮬레이션도 native Safari·Galaxy 실기기 증거로 표현하지 않습니다.

## 5. 실패 처리와 완료 보고

- 실패를 제품 동작, 테스트/검증 구성, 실행 환경으로 구분합니다. 로그 없이
  flaky나 환경 문제로 단정하지 않습니다.
- 원인을 재현한 뒤 최소 수정하고 실패했던 검사와 영향 범위만 재실행합니다.
  보호 조건을 없애거나 허용치를 늘려 통과시키지 않습니다.
- 브라우저가 초기화하는 `test-results` 밖의 무시된 경로에 장기 보존 증거를 둡니다.
  공개 리포트에는 개인 경로·식별자·비밀 값이 없는 요약만 기록합니다.
- 보고 시 커밋, 로컬/CI, 실행 환경, 통과·실패·건너뜀·미실행을 구분합니다.
  선행 job 실패로 건너뛴 검사를 성공으로 처리하지 않습니다.
- PR 마지막 커밋의 검사와 mergeability를 확인합니다. 문서만 추가된 커밋에서
  코드 검사가 의도적으로 생략되면, 마지막 코드 변경의 성공 근거와 현재 문서/보안
  검사를 따로 제시합니다. 로컬 성공만으로 CI 완료를 선언하지 않습니다.
- 병합·배포·publish는 각각의 승인 범위와 결과를 구분합니다.
