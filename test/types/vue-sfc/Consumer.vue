<script setup lang="ts">
import { ref } from 'vue';
import { SortableArea, SortableRoot } from 'comins-sortable/vue';
type Task = { id: string; title: string };
const items = ref<Task[]>([{ id: 'a', title: 'A' }]);
const numeric: readonly { id: number; title: string }[] = [{ id: 1, title: 'One' }];
const receive = (next: readonly Task[]) => { items.value = [...next]; };
</script>
<template>
  <SortableRoot>
    <SortableArea v-model="items" area-id="tasks" item-key="id" class="tasks" :style="{ color: 'black' }" tag="section" :component-props="{ class: 'tasks' }" :copy-item="(item) => ({ ...item, id: `${item.id}-copy` })" @update:model-value="receive">
      <template #header>Tasks</template>
      <template #item="{ item, index }"><div>{{ item.title.toUpperCase() }} {{ index.toFixed() }}</div></template>
      <template #footer>End</template>
    </SortableArea>
    <SortableArea :model-value="numeric" area-id="numeric" item-key="id">
      <template #item="{ item }"><div>{{ item.id.toFixed() }} {{ item.title }}</div></template>
    </SortableArea>
  </SortableRoot>
</template>
