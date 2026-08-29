# Vue 어댑터

Vue는 `SortableArea`의 `v-model`과 item slot으로 직접 정렬 자식을 렌더합니다.

```vue
<script setup lang="ts">
import { ref } from 'vue';
import { SortableArea, SortableRoot } from 'comins-sortable/vue';

type Item = { id: string; label: string };
const items = ref<Item[]>([
  { id: 'task-1', label: '계획' },
  { id: 'task-2', label: '구현' },
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

`v-model`이 `update:modelValue` 제어형 commit을 처리합니다. 같은 Root 아래의
Area는 scope를 공유합니다. 전체 불변 transaction은 `SortableRoot`의 `@change`,
애플리케이션 오류 경계는 `:on-error`에서 처리합니다.

`tag`에는 HTML tag 또는 component host를 지정하고 `componentProps`에는 host
속성을 전달합니다. 사용자 component는 adapter가 등록할 실제 element를 전달해야
합니다.

Playground: <http://127.0.0.1:4003/examples/simple/vue>
