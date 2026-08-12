import { SortableArea, SortableRoot } from 'comins-sortable/react';
import type { ItemKey } from 'comins-sortable/core';

interface Task {
  id: string;
  title: string;
}

const tasks: readonly Task[] = [{ id: 'a', title: 'A' }];

<SortableRoot<Task> onChange={(change) => {
  const itemId: string | number = change.itemId;
  void itemId;
}}>
  <SortableArea
    areaId="todo"
    items={tasks}
    itemKey="id"
    onItemsChange={(next) => {
      const task: Task | undefined = next[0];
      void task;
    }}
  >
    {(item, index) => <div data-index={index}>{item.title}</div>}
  </SortableArea>
</SortableRoot>;

<SortableArea
  areaId="todo"
  // @ts-expect-error React v1 is controlled only
  defaultItems={tasks}
  items={tasks}
  itemKey="id"
  onItemsChange={() => undefined}
>
  {(item) => <div>{item.title}</div>}
</SortableArea>;

// @ts-expect-error index callbacks are not a supported ItemKey shape
const indexKey: ItemKey<Task> = (_item, index: number) => index;
void indexKey;

// @ts-expect-error Item keys must resolve to string or number IDs
const invalidKey: ItemKey<Task> = () => ({ id: 'not-an-id' });
void invalidKey;

// @ts-expect-error React v1 exposes no public useSortable hook
const useSortable = (await import('comins-sortable/react')).useSortable;
void useSortable;
