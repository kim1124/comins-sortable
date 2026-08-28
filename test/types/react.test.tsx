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
    as="section"
    areaProps={{ className: 'task-list' }}
    header={<header>Tasks</header>}
    footer={<footer>{tasks.length} total</footer>}
    areaId="todo"
    items={tasks}
    itemKey="id"
    group={{ name: 'tasks', pull: 'copy', put: ['tasks'] }}
    copyItem={(item, context) => ({
      ...item,
      id: `${item.id}-${String(context.destination.areaId)}`,
    })}
    animation={{ duration: 180, easing: 'ease-out' }}
    placeholder={{ className: 'project-placeholder', preset: 'skeleton' }}
    parent={{ areaId: 'root', itemId: 'parent' }}
    onItemsChange={(next) => {
      const task: Task | undefined = next[0];
      void task;
    }}
  >
    {(item, index) => <div data-index={index}>{item.title}</div>}
  </SortableArea>
</SortableRoot>;

<SortableArea<Task>
  areaId="invalid-copy"
  items={tasks}
  itemKey="id"
  onItemsChange={() => undefined}
  // @ts-expect-error copyItem must return the Area item type
  copyItem={() => 'invalid'}
>
  {(item) => <div>{item.title}</div>}
</SortableArea>;

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
