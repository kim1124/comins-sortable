import { h } from 'vue';
import {
  SortableArea,
  SortableRoot,
  type VueSortableAreaProps,
  type VueSortableAreaSlots,
} from 'comins-sortable/vue';
import type { ItemKey } from 'comins-sortable/core';

interface Task {
  id: string;
  title: string;
}

const tasks: readonly Task[] = [{ id: 'a', title: 'A' }];

const itemSlot: VueSortableAreaSlots<Task>['item'] = ({ item, index }) => (
  h('div', { 'data-index': index }, item.title)
);

h(SortableRoot<Task>, {
  onChange(change) {
    const itemId: string | number = change.itemId;
    void itemId;
  },
}, {
  default: () => h(SortableArea<Task>, {
    areaId: 'todo',
    modelValue: tasks,
    itemKey: 'id',
    'onUpdate:modelValue': (next) => {
      const task: Task | undefined = next[0];
      void task;
    },
  }, {
    item: itemSlot,
  }),
});

const invalidControlledProps: VueSortableAreaProps<Task> = {
  areaId: 'todo',
  // @ts-expect-error Vue v1 is controlled only
  defaultValue: tasks,
  modelValue: tasks,
  itemKey: 'id',
};
void invalidControlledProps;

// @ts-expect-error controlled Areas require a stable itemKey
const missingItemKey: VueSortableAreaProps<Task> = {
  areaId: 'todo',
  modelValue: tasks,
};
void missingItemKey;

// @ts-expect-error index callbacks are not a supported ItemKey shape
const indexKey: ItemKey<Task> = (_item, index: number) => index;
void indexKey;

// @ts-expect-error Item keys must resolve to string or number IDs
const invalidKey: ItemKey<Task> = () => ({ id: 'not-an-id' });
void invalidKey;

// @ts-expect-error Vue v1 exposes no public useSortable composable
const useSortable = (await import('comins-sortable/vue')).useSortable;
void useSortable;

// @ts-expect-error Vue v1 exposes no public sortable directive
const sortableDirective = (await import('comins-sortable/vue')).vSortable;
void sortableDirective;
