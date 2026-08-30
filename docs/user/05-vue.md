# Vue Adapter

Vue uses `v-model` on `SortableArea` and an item slot for direct sortable
children.

```vue
<script setup lang="ts">
import { ref } from 'vue';
import { SortableArea, SortableRoot } from 'comins-sortable/vue';

type Item = { id: string; label: string };
const items = ref<Item[]>([
  { id: 'task-1', label: 'Plan' },
  { id: 'task-2', label: 'Build' },
]);
</script>

<template>
  <SortableRoot>
    <SortableArea v-model="items" area-id="tasks" item-key="id">
      <template #item="{ item }">
        <div>{{ item.label }}</div>
      </template>
    </SortableArea>
  </SortableRoot>
</template>
```

`v-model` handles the `update:modelValue` controlled commit. Areas in one root
share its scope. Use `@change` on `SortableRoot` for the complete immutable
transaction and `:on-error` for an application error boundary.

Use `tag` for an intrinsic tag or component host and `componentProps` for host
attributes. The host must forward its element so the adapter can register it.

Playground: <http://127.0.0.1:4003/examples/simple/vue>
