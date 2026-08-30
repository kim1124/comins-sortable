# Svelte Adapter

Svelte uses the `sortable` action. A shared scope is required for transfer
between areas.

```svelte
<script lang="ts">
  import { sortable } from 'comins-sortable/svelte';

  type Item = { id: string; label: string };
  let items: Item[] = [
    { id: 'task-1', label: 'Plan' },
    { id: 'task-2', label: 'Build' },
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

The action updates its registration when options change and releases it when
the element is destroyed. Without a supplied scope it owns a private one-area
scope. Use `createSortableScope` and pass the same `scope` to multiple actions
for transfer, root lifecycle callbacks, or one atomic `onChange`.

The action treats direct children as items by default. Set `item` when the host
also contains non-item children.

Playground: <http://127.0.0.1:4003/examples/simple/svelte>
