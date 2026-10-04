<script setup lang="ts">
import { ref } from 'vue';
import { SortableArea } from 'comins-sortable/vue';
const items = ref([{ id: 'a', title: 'A' }]);
</script>
<template>
  <!-- expect-error TS2322 -->
  <SortableArea :model-value="items" area-id="bad-key" item-key="missing"><template #item="{ item }"><div>{{ item.title }}</div></template></SortableArea>
  <!-- expect-error TS2339 -->
  <SortableArea :model-value="items" area-id="bad-slot" item-key="id"><template #item="{ item }"><div>{{ item.missing }}</div></template></SortableArea>
  <!-- expect-error TS2322 -->
  <SortableArea :model-value="items" area-id="bad-copy" item-key="id" :copy-item="() => 'invalid'"><template #item="{ item }"><div>{{ item.title }}</div></template></SortableArea>
  <!-- expect-error TS2322 -->
  <SortableArea :model-value="items" area-id="bad-update" item-key="id" @update:model-value="(value: readonly number[]) => value"><template #item="{ item }"><div>{{ item.title }}</div></template></SortableArea>
</template>
