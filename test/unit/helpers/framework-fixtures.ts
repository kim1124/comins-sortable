import type { FrameworkSortableChange, SortableChange } from '../../../src/core.js';
import {
  BindingRegistry,
  type FrameworkAreaBinding,
} from '../../../src/framework/bindings.js';
import { ControlledTransaction } from '../../../src/framework/controlled-transaction.js';

export interface Task {
  id: string;
}

interface ControlledArea<T> {
  items: readonly T[];
  setItems?: (items: readonly T[]) => void;
}

interface ControlledFixtureOptions<T extends Task> {
  todo: ControlledArea<T>;
  done?: ControlledArea<T>;
  onChange?: (change: FrameworkSortableChange<T>) => void;
}

interface RenderedAreaOptions {
  renderedItemCount?: number;
  placeholderCount?: number;
  element?: Element | null;
}

export function ids(items: readonly Task[]): readonly string[] {
  return items.map((item) => item.id);
}

export function renderedArea<T extends Task>(
  areaId: string,
  group: string,
  initialItems: readonly T[],
  options: RenderedAreaOptions = {},
): FrameworkAreaBinding<T> {
  let items = initialItems;
  const element = options.element === undefined
    ? renderedElement(
      options.renderedItemCount ?? initialItems.length,
      options.placeholderCount ?? 0,
    )
    : options.element;

  return {
    areaId,
    group,
    getItems: () => items,
    getItemId: (item) => item.id,
    setItems: (next) => {
      items = next;
    },
    getElement: () => element,
  };
}

export function controlledFixture<T extends Task>(
  options: ControlledFixtureOptions<T>,
): {
  transaction: ControlledTransaction<T>;
  readonly todo: readonly T[];
  readonly done: readonly T[];
} {
  const registry = new BindingRegistry<T>();
  const states = new Map<string, readonly T[]>();
  const register = (areaId: string, input: ControlledArea<T>): void => {
    states.set(areaId, input.items);
    registry.register({
      areaId,
      group: 'tasks',
      getItems: () => states.get(areaId) as readonly T[],
      getItemId: (item) => item.id,
      setItems: (items) => {
        states.set(areaId, items);
        input.setItems?.(items);
      },
      getElement: () => renderedElement((states.get(areaId) ?? []).length),
    });
  };

  register('todo', options.todo);
  if (options.done !== undefined) {
    register('done', options.done);
  }

  const fixture = {
    transaction: new ControlledTransaction(registry, options.onChange ?? (() => undefined)),
    get todo(): readonly T[] {
      return states.get('todo') as readonly T[];
    },
    get done(): readonly T[] {
      return states.get('done') as readonly T[];
    },
  };
  return fixture;
}

export function throwingControlledFixture(): {
  transaction: ControlledTransaction<Task>;
  change: SortableChange;
  readonly todo: readonly Task[];
  readonly done: readonly Task[];
} {
  let shouldThrow = true;
  const fixture = controlledFixture({
    todo: { items: [{ id: 'a' }, { id: 'b' }] },
    done: {
      items: [{ id: 'c' }],
      setItems: () => {
        if (shouldThrow) {
          shouldThrow = false;
          throw new Error('done setter failed');
        }
      },
    },
  });
  return {
    ...fixture,
    change: {
      operation: 'transfer',
      itemId: 'b',
      source: { areaId: 'todo', index: 1 },
      destination: { areaId: 'done', index: 1 },
      orders: [
        { areaId: 'todo', itemIds: ['a'] },
        { areaId: 'done', itemIds: ['c', 'b'] },
      ],
    },
  };
}

function renderedElement(itemCount: number, placeholderCount = 0): Element {
  const children = [
    ...Array.from({ length: itemCount }, () => fakeChild(false)),
    ...Array.from({ length: placeholderCount }, () => fakeChild(true)),
  ];
  return { children } as unknown as Element;
}

function fakeChild(placeholder: boolean): Element {
  return {
    hasAttribute: (name: string) => (
      placeholder && name === 'data-comins-sortable-placeholder'
    ),
  } as unknown as Element;
}
