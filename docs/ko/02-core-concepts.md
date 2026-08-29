# 핵심 개념

Comins Sortable은 pointer interaction과 애플리케이션 상태를 분리합니다.

- **scope**는 하나의 drag lifecycle을 소유하며 등록 범위를 격리합니다.
- **area**는 안정적인 `areaId`로 식별되는 정렬 컨테이너입니다.
- **group**은 area 간 이동·복제 가능 여부를 제어합니다.
- **item ID**는 화면 위치가 아니라 안정적인 업무 식별자입니다.
- **제어형 commit**은 다음 프레임 검증 전에 제안된 배열을 렌더합니다.

프레임워크 어댑터는 영향을 받는 모든 area를 하나의 불변 transaction으로
처리합니다. 이동 시 source와 destination setter를 먼저 실행한 뒤 Root의
`onChange`를 호출합니다. setter 또는 callback이 실패하면 원본 배열을 복구합니다.

Vanilla `createSortable`은 DOM transaction을 처리하지만 consumer의 업무 상태까지
소유하지 않습니다. DOM 순서를 별도 상태로 관리한다면 `onChange`에서 함께
갱신해야 합니다.

일반 이동은 문자열 group을 사용합니다.

```ts
const group = 'tasks';
```

복제나 방향별 수락 정책에는 object group을 사용합니다.

```ts
const group = {
  name: 'tasks',
  pull: 'copy' as const,
  put: ['tasks'],
};
```

[정렬과 이동](./07-reorder-transfer.md), [복제](./08-copy-clone.md),
[Lifecycle과 오류](./14-lifecycle-errors.md)를 함께 확인합니다.
