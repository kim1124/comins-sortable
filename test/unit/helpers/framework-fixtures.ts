import type { FrameworkSortableChange } from '../../../src/core.js';
import {
  BindingRegistry,
  type FrameworkAreaBinding,
} from '../../../src/framework/bindings.js';
import { ControlledTransaction } from '../../../src/framework/controlled-transaction.js';
import {
  createReactSortableController,
  type ReactSortableController,
} from '../../../src/react/context.js';
import { createReactAreaLifecycle } from '../../../src/react/lifecycle.js';
import {
  createVueSortableController,
  type VueSortableController,
} from '../../../src/vue/context.js';
import { createVueAreaLifecycle } from '../../../src/vue/lifecycle.js';
import type {
  ItemKey,
  SortableAreaOptions,
  SortableChange,
  SortableScope,
  SortableScopeOptions,
} from '../../../src/core.js';

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

export interface ReactAdapterAreaProps<T> {
  areaId: string;
  group?: string;
  items: readonly T[];
  itemKey: ItemKey<T>;
  onItemsChange(items: readonly T[]): void;
  direction?: SortableAreaOptions['direction'];
  disabled?: boolean;
  handle?: string;
  ignore?: string;
  activationDistance?: number;
  emptyInsertThreshold?: number;
  autoScroll?: boolean;
  accept?: SortableAreaOptions['accept'];
}

export function todoProps(): ReactAdapterAreaProps<Task> {
  return {
    areaId: 'todo',
    group: 'tasks',
    items: [{ id: 'a' }, { id: 'b' }],
    itemKey: 'id',
    onItemsChange: () => undefined,
  };
}

export function doneProps(): ReactAdapterAreaProps<Task> {
  return {
    areaId: 'done',
    group: 'tasks',
    items: [{ id: 'c' }],
    itemKey: 'id',
    onItemsChange: () => undefined,
  };
}

export function reactAdapterHarness<T extends Task>(): {
  readonly calls: string[];
  mountRoot(options?: Pick<SortableScopeOptions, 'onAfterDrag'>): void;
  mountArea(props: ReactAdapterAreaProps<T>): () => void;
  updateArea(areaId: string, patch: Partial<SortableAreaOptions>): void;
  transfer(
    itemId: string,
    sourceAreaId: string,
    sourceIndex: number,
    destinationAreaId: string,
    destinationIndex: number,
  ): void;
  beginTransfer(
    itemId: string,
    sourceAreaId: string,
    sourceIndex: number,
    destinationAreaId: string,
    destinationIndex: number,
  ): void;
  cancel(): void;
  registrationCount(areaId: string): number;
  updateCount(areaId: string): number;
  scopeCount(): number;
  items(areaId: string): readonly T[];
} {
  const calls: string[] = [];
  const registrations = new Map<string, number>();
  const updates = new Map<string, number>();
  const states = new Map<string, readonly T[]>();
  const lifecycles = new Map<string, { update(patch: Partial<SortableAreaOptions>): void }>();
  let callbacks: SortableScopeOptions = {};
  let controller: ReactSortableController<T> | null = null;
  let rootMounted = false;
  let scopes = 0;

  const createScope = (options: SortableScopeOptions): SortableScope => {
    scopes += 1;
    callbacks = options;
    return {
      registerArea(_element, options) {
        registrations.set(options.areaId, (registrations.get(options.areaId) ?? 0) + 1);
        let disposed = false;
        return () => {
          if (disposed) {
            return;
          }
          disposed = true;
          registrations.set(options.areaId, (registrations.get(options.areaId) ?? 1) - 1);
        };
      },
      updateArea(areaId) {
        updates.set(areaId, (updates.get(areaId) ?? 0) + 1);
      },
      cancel() {},
      destroy() {},
    };
  };

  const ensureController = (options: Pick<SortableScopeOptions, 'onAfterDrag'> = {}): ReactSortableController<T> => {
    controller ??= createReactSortableController<T>({
      getRootProps: () => ({
        ...options,
        onChange: (change) => calls.push(`change:${change.operation}`),
      }),
      createScope,
    });
    return controller;
  };

  const mountArea = (props: ReactAdapterAreaProps<T>): (() => void) => {
    const activeController = rootMounted
      ? ensureController()
      : createReactSortableController<T>({
        getRootProps: () => ({
          onChange: (change) => calls.push(`change:${change.operation}`),
        }),
        createScope,
      });
    const ownsController = !rootMounted;
    states.set(props.areaId, props.items);
    let lifecycle!: ReturnType<typeof createReactAreaLifecycle<T>>;
    let currentProps: ReactAdapterAreaProps<T> = {
      ...props,
      onItemsChange: (items) => {
        states.set(props.areaId, items);
        calls.push(`set:${props.areaId}:${items.map((item) => item.id).join(',')}`);
        props.onItemsChange(items);
        currentProps = { ...currentProps, items };
        lifecycle.update(currentProps);
      },
    };
    lifecycle = createReactAreaLifecycle({
      controller: rootMounted ? activeController : null,
      createController: rootMounted ? undefined : () => activeController,
      props: currentProps,
    });
    lifecycle.setElement(renderedElement(props.items.length) as HTMLDivElement);
    lifecycles.set(props.areaId, {
      update(patch) {
        currentProps = { ...currentProps, ...patch };
        lifecycle.update(currentProps);
      },
    });
    return () => {
      lifecycle.dispose();
      lifecycles.delete(props.areaId);
      if (ownsController) {
        if (controller === activeController) {
          controller = null;
        }
      }
    };
  };

  const applyTransfer = (
    itemId: string,
    sourceAreaId: string,
    sourceIndex: number,
    destinationAreaId: string,
    destinationIndex: number,
  ): SortableChange => {
    const source = states.get(sourceAreaId) as readonly T[];
    const destination = states.get(destinationAreaId) as readonly T[];
    const item = source[sourceIndex];
    if (item === undefined) {
      throw new Error('missing fixture item');
    }
    const change: SortableChange = {
      operation: sourceAreaId === destinationAreaId ? 'reorder' : 'transfer',
      itemId,
      source: { areaId: sourceAreaId, index: sourceIndex },
      destination: { areaId: destinationAreaId, index: destinationIndex },
      orders: sourceAreaId === destinationAreaId
        ? [{ areaId: sourceAreaId, itemIds: [] }]
        : [
          {
            areaId: sourceAreaId,
            itemIds: source.filter((_entry, index) => index !== sourceIndex).map((entry) => entry.id),
          },
          {
            areaId: destinationAreaId,
            itemIds: [item.id, ...destination.map((entry) => entry.id)],
          },
        ],
    };
    callbacks.onChange?.(change);
    return change;
  };

  return {
    calls,
    mountRoot(options = {}) {
      rootMounted = true;
      ensureController(options);
    },
    mountArea,
    updateArea(areaId, patch) {
      lifecycles.get(areaId)?.update(patch);
    },
    beginTransfer(itemId, sourceAreaId, sourceIndex, destinationAreaId, destinationIndex) {
      applyTransfer(itemId, sourceAreaId, sourceIndex, destinationAreaId, destinationIndex);
    },
    transfer(itemId, sourceAreaId, sourceIndex, destinationAreaId, destinationIndex) {
      const change = applyTransfer(itemId, sourceAreaId, sourceIndex, destinationAreaId, destinationIndex);
      callbacks.onAfterDrag?.({ status: 'dropped', reason: 'drop', change });
    },
    cancel() {
      callbacks.onAfterDrag?.({ status: 'cancelled', reason: 'escape' });
    },
    registrationCount(areaId) {
      return registrations.get(areaId) ?? 0;
    },
    updateCount(areaId) {
      return updates.get(areaId) ?? 0;
    },
    scopeCount() {
      return scopes;
    },
    items(areaId) {
      return states.get(areaId) as readonly T[];
    },
  };
}

function toAreaOptions<T>(props: ReactAdapterAreaProps<T>): SortableAreaOptions {
  return {
    areaId: props.areaId,
    group: props.group,
    item: ':scope > *',
    getItemId: () => 'fixture',
    direction: props.direction,
    disabled: props.disabled,
    handle: props.handle,
    ignore: props.ignore,
    activationDistance: props.activationDistance,
    emptyInsertThreshold: props.emptyInsertThreshold,
    autoScroll: props.autoScroll,
    accept: props.accept,
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

export interface VueAdapterAreaProps<T> {
  areaId: string;
  group?: string;
  modelValue: readonly T[];
  itemKey: ItemKey<T>;
  direction?: SortableAreaOptions['direction'];
  disabled?: boolean;
  handle?: string;
  ignore?: string;
  activationDistance?: number;
  emptyInsertThreshold?: number;
  autoScroll?: boolean;
  accept?: SortableAreaOptions['accept'];
}

export function vueTodoProps(): VueAdapterAreaProps<Task> {
  return {
    areaId: 'todo', group: 'tasks', modelValue: [{ id: 'a' }, { id: 'b' }], itemKey: 'id',
  };
}

export function vueDoneProps(): VueAdapterAreaProps<Task> {
  return {
    areaId: 'done', group: 'tasks', modelValue: [{ id: 'c' }], itemKey: 'id',
  };
}

export function vueAdapterHarness<T extends Task>(): {
  readonly calls: string[];
  mountRoot(options?: Pick<SortableScopeOptions, 'onAfterDrag'>): void;
  mountArea(props: VueAdapterAreaProps<T>): { update(props: VueAdapterAreaProps<T>): void; dispose(): void };
  transfer(itemId: string, sourceAreaId: string, sourceIndex: number, destinationAreaId: string, destinationIndex: number): void;
  beginTransfer(itemId: string, sourceAreaId: string, sourceIndex: number, destinationAreaId: string, destinationIndex: number): void;
  cancel(): void;
  registrationCount(areaId: string): number;
  scopeCount(): number;
  destroyCount(): number;
  items(areaId: string): readonly T[];
  area(areaId: string): VueAdapterAreaProps<T>;
} {
  const calls: string[] = [];
  const registrations = new Map<string, number>();
  const states = new Map<string, readonly T[]>();
  const areas = new Map<string, VueAdapterAreaProps<T>>();
  let callbacks: SortableScopeOptions = {};
  let rootController: VueSortableController<T> | null = null;
  let rootMounted = false;
  let scopes = 0;
  let destroys = 0;

  const createScope = (options: SortableScopeOptions): SortableScope => {
    scopes += 1;
    callbacks = options;
    return {
      registerArea(_element, options) {
        registrations.set(options.areaId, (registrations.get(options.areaId) ?? 0) + 1);
        let disposed = false;
        return () => {
          if (!disposed) {
            disposed = true;
            registrations.set(options.areaId, (registrations.get(options.areaId) ?? 1) - 1);
          }
        };
      },
      updateArea() {},
      cancel() {},
      destroy() { destroys += 1; },
    };
  };

  const controller = (options: Pick<SortableScopeOptions, 'onAfterDrag'> = {}): VueSortableController<T> => {
    rootController ??= createVueSortableController<T>({
      getRootOptions: () => ({ ...options, onChange: (change) => calls.push(`change:${change.operation}`) }),
      createScope,
    });
    return rootController;
  };

  const change = (
    itemId: string,
    sourceAreaId: string,
    sourceIndex: number,
    destinationAreaId: string,
    destinationIndex: number,
  ): SortableChange => {
    const source = states.get(sourceAreaId) as readonly T[];
    const destination = states.get(destinationAreaId) as readonly T[];
    const item = source[sourceIndex];
    if (item === undefined) throw new Error('missing fixture item');
    const next: SortableChange = {
      operation: sourceAreaId === destinationAreaId ? 'reorder' : 'transfer',
      itemId,
      source: { areaId: sourceAreaId, index: sourceIndex },
      destination: { areaId: destinationAreaId, index: destinationIndex },
      orders: sourceAreaId === destinationAreaId
        ? [{ areaId: sourceAreaId, itemIds: [] }]
        : [
          { areaId: sourceAreaId, itemIds: source.filter((_item, index) => index !== sourceIndex).map((entry) => entry.id) },
          { areaId: destinationAreaId, itemIds: [...destination.slice(0, destinationIndex).map((entry) => entry.id), item.id, ...destination.slice(destinationIndex).map((entry) => entry.id)] },
        ],
    };
    callbacks.onChange?.(next);
    return next;
  };

  return {
    calls,
    mountRoot(options = {}) { rootMounted = true; controller(options); },
    mountArea(initialProps) {
      const activeController = rootMounted
        ? controller()
        : createVueSortableController<T>({
          getRootOptions: () => ({ onChange: (next) => calls.push(`change:${next.operation}`) }),
          createScope,
        });
      states.set(initialProps.areaId, initialProps.modelValue);
      let lifecycle!: ReturnType<typeof createVueAreaLifecycle<T>>;
      let current = initialProps;
      const update = (next: VueAdapterAreaProps<T>): void => {
        current = next;
        areas.set(next.areaId, next);
        lifecycle.update(current);
      };
      lifecycle = createVueAreaLifecycle({
        controller: rootMounted ? activeController : null,
        createController: rootMounted ? undefined : () => activeController,
        props: () => current,
        emitModelValue: (items) => {
          states.set(current.areaId, items);
          calls.push(`update:${current.areaId}:${items.map((item) => item.id).join(',')}`);
          current = { ...current, modelValue: items };
          areas.set(current.areaId, current);
          lifecycle.update(current);
        },
      });
      areas.set(current.areaId, current);
      lifecycle.setElement(renderedElement(current.modelValue.length) as HTMLDivElement);
      return { update, dispose: () => lifecycle.dispose() };
    },
    transfer(itemId, sourceAreaId, sourceIndex, destinationAreaId, destinationIndex) {
      const next = change(itemId, sourceAreaId, sourceIndex, destinationAreaId, destinationIndex);
      callbacks.onAfterDrag?.({ status: 'dropped', reason: 'drop', change: next });
    },
    beginTransfer: change,
    cancel() { callbacks.onAfterDrag?.({ status: 'cancelled', reason: 'escape' }); },
    registrationCount(areaId) { return registrations.get(areaId) ?? 0; },
    scopeCount() { return scopes; },
    destroyCount() { return destroys; },
    items(areaId) { return states.get(areaId) as readonly T[]; },
    area(areaId) { return areas.get(areaId) as VueAdapterAreaProps<T>; },
  };
}
