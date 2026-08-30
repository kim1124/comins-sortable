# Svelte 어댑터

Svelte는 `sortable` action을 사용합니다. area 간 이동에는 공유 scope가
필요합니다.

```svelte
<script lang="ts">
  import { sortable } from 'comins-sortable/svelte';

  type Item = { id: string; label: string };
  let items: Item[] = [
    { id: 'task-1', label: '계획' },
    { id: 'task-2', label: '구현' },
  ];

  $: options = {
    areaId: 'tasks',
    items,
    itemKey: 'id' as const,
    onItemsChange: (next: readonly Item[]) => { items = [...next]; },
  };
</script>

<div use:sortable={options}>
  {#each items as item (item.id)}
    <div>{item.label}</div>
  {/each}
</div>
```

action은 option 변경 시 등록을 갱신하고 element가 해제될 때 등록도 해제합니다.
scope를 제공하지 않으면 area 하나만 포함하는 private scope를 소유합니다. 여러
action 사이의 이동, Root lifecycle callback, 하나의 atomic `onChange`가 필요하면
`createSortableScope`를 생성해 같은 `scope`를 전달합니다.

기본 item selector는 host의 직접 자식 전체입니다. host에 비정렬 자식도 있다면
`item`을 별도로 지정합니다.

Playground: <http://127.0.0.1:4003/examples/simple/svelte>
