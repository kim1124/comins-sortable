import {
  createSortableScope,
  sortable,
  type SvelteActionReturn,
  type SvelteSortableOptions,
} from 'comins-sortable/svelte';

interface Task {
  id: string;
  title: string;
}

const tasks: readonly Task[] = [{ id: 'a', title: 'A' }];
const scope = createSortableScope<Task>({
  onChange(change) {
    const item: string | number = change.itemId;
    void item;
  },
});

const options: SvelteSortableOptions<Task> = {
  scope,
  areaId: 'todo',
  items: tasks,
  itemKey: 'id',
  onItemsChange(next) {
    const task: Task | undefined = next[0];
    void task;
  },
};

const action: SvelteActionReturn<Task> = sortable(document.createElement('div'), options);
action.update(options);
action.destroy();

// @ts-expect-error areaId is required
sortable(document.createElement('div'), { items: tasks, itemKey: 'id', onItemsChange: () => undefined });

// @ts-expect-error items are required
sortable(document.createElement('div'), { areaId: 'todo', itemKey: 'id', onItemsChange: () => undefined });

// @ts-expect-error onItemsChange is required
sortable(document.createElement('div'), { areaId: 'todo', items: tasks, itemKey: 'id' });

const invalidKey: SvelteSortableOptions<Task> = {
  areaId: 'todo',
  items: tasks,
  // @ts-expect-error itemKey must resolve to a stable ID
  itemKey: () => ({ id: 'a' }),
  onItemsChange: () => undefined,
};
void invalidKey;

const invalidCallback: SvelteSortableOptions<Task> = {
  areaId: 'todo',
  items: tasks,
  itemKey: 'id',
  // @ts-expect-error the callback accepts Task arrays only
  onItemsChange: (next: readonly string[]) => undefined,
};
void invalidCallback;

interface OtherTask { id: number }
const otherScope = createSortableScope<OtherTask>();
const incompatibleScope: SvelteSortableOptions<Task> = {
  areaId: 'todo',
  items: tasks,
  itemKey: 'id',
  onItemsChange: () => undefined,
  // @ts-expect-error Scope brands preserve their item type
  scope: otherScope,
};
void incompatibleScope;

// @ts-expect-error v1 exposes no component API
const component = (await import('comins-sortable/svelte')).SortableArea;
void component;

// @ts-expect-error v1 exposes no attachment API
const attachment = (await import('comins-sortable/svelte')).attachment;
void attachment;
