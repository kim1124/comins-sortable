import assert from 'node:assert/strict';

import { createSortableScopeInternal } from '../../../src/core/scope.js';
import type {
  AfterDragResult,
  CopyItemContext,
  SortableAreaOptions,
  SortableChange,
  SortableId,
  SortableScope,
  SortableScopeOptions,
} from '../../../src/core/model.js';
import {
  fakeElement,
  fakePlatform,
  pointer,
} from './core-fixtures.js';
import type {
  FakeElement,
  FakePlatform,
} from './core-fixtures.js';

export interface ScopeFixtureOptions extends SortableScopeOptions {
  commit?: boolean;
  acceptDone?: boolean;
  onAcceptDone?: SortableAreaOptions['accept'];
  disabledTodo?: boolean;
  autoScroll?: boolean;
  scrollableDone?: boolean;
  getItemId?: (element: Element) => SortableId;
  groupTodo?: SortableAreaOptions['group'];
  groupDone?: SortableAreaOptions['group'];
  prepareCopy?: (context: CopyItemContext) => SortableId;
  parentDone?: SortableAreaOptions['parent'];
  todoItemIds?: readonly string[];
  doneItemIds?: readonly string[];
  multiDrag?: boolean;
  selectedClass?: string;
  swap?: boolean;
  swapThreshold?: number;
  invertSwap?: boolean;
}

export interface ScopeFixture {
  readonly scope: SortableScope;
  readonly platform: FakePlatform;
  readonly results: AfterDragResult[];
  readonly unregister: Record<'todo' | 'done', () => void>;
  begin(
    areaId: 'todo' | 'done',
    index: number,
    modifiers?: Readonly<{
      altKey?: boolean;
      ctrlKey?: boolean;
      metaKey?: boolean;
      shiftKey?: boolean;
    }>,
  ): void;
  select(
    areaId: 'todo' | 'done',
    index: number,
    modifiers?: Readonly<{ ctrlKey?: boolean; metaKey?: boolean; shiftKey?: boolean }>,
  ): void;
  move(areaId: 'todo' | 'done', index: number): void;
  queueMove(areaId: 'todo' | 'done', index: number): void;
  repeatMove(): void;
  moveOutside(): void;
  release(): void;
  drop(
    sourceAreaId: 'todo' | 'done',
    sourceIndex: number,
    destinationAreaId: 'todo' | 'done',
    destinationIndex: number,
  ): void;
  terminate(
    signal: 'pointercancel' | 'escape' | 'blur' | 'visibility' | 'unmount' | 'destroy',
  ): void;
  ids(areaId: 'todo' | 'done'): readonly SortableId[];
  area(areaId: 'todo' | 'done'): FakeElement;
  item(areaId: 'todo' | 'done', index: number): FakeElement;
  elements(): readonly FakeElement[];
  placeholderCount(): number;
}

export function scopeFixture(options: ScopeFixtureOptions = {}): ScopeFixture {
  const platform = fakePlatform();
  const results: AfterDragResult[] = [];
  const areas = {
    todo: fixtureArea(platform, 'todo', 0, options.todoItemIds ?? ['a', 'b']),
    done: fixtureArea(platform, 'done', 200, options.doneItemIds ?? ['c', 'd'], {
      scrollable: options.scrollableDone === true,
    }),
  };
  let lastPointer = pointer();

  const applyChange = (sortableChange: SortableChange): void => {
    if (sortableChange.operation === 'copy') {
      const source = findItem(areas, sortableChange.sourceItemId);
      const destination = areas[sortableChange.destination.areaId as 'todo' | 'done'];
      if (source === undefined || destination === undefined) {
        return;
      }
      const copy = fakeElement('LI', {
        ownerDocument: platform.document,
        attributes: {
          'data-sortable-item': '',
          'data-sortable-id': String(sortableChange.itemId),
        },
        rect: source.getBoundingClientRect(),
      });
      const remaining = sortableChildren(destination);
      const before = remaining[sortableChange.destination.index] ?? null;
      destination.insertBefore(copy, before);
      return;
    }
    const elements = new Map(
      Object.values(areas).flatMap((area) => sortableChildren(area)).map(
        (element) => [element.getAttribute('data-sortable-id'), element] as const,
      ),
    );
    for (const order of sortableChange.orders) {
      const destination = areas[order.areaId as 'todo' | 'done'];
      if (destination === undefined) continue;
      for (const itemId of order.itemIds) {
        const element = elements.get(String(itemId));
        if (element !== undefined) destination.appendChild(element);
      }
    }
  };

  const scopeOptions: SortableScopeOptions = {
    onBeforeDragStart: options.onBeforeDragStart,
    onDragStart: options.onDragStart,
    onDrag: options.onDrag,
    onInsertDragArea: options.onInsertDragArea,
    onChange: (sortableChange) => {
      if (options.commit !== false) {
        applyChange(sortableChange);
      }
      options.onChange?.(sortableChange);
    },
    onAfterDrag: (result) => {
      results.push(result);
      options.onAfterDrag?.(result);
    },
    onError: options.onError,
  };
  const scope = createSortableScopeInternal(scopeOptions, platform);
  const itemOptions = (areaId: 'todo' | 'done'): SortableAreaOptions => ({
    areaId,
    group: areaId === 'todo'
      ? options.groupTodo ?? 'tasks'
      : options.groupDone ?? 'tasks',
    item: '[data-sortable-item]',
    getItemId: options.getItemId ?? (
      (element) => element.getAttribute('data-sortable-id') as string
    ),
    disabled: areaId === 'todo' && options.disabledTodo === true,
    accept: areaId === 'done'
      ? options.onAcceptDone ?? (() => options.acceptDone !== false)
      : () => true,
    autoScroll: options.autoScroll ?? false,
    prepareCopy: areaId === 'todo' ? options.prepareCopy : undefined,
    parent: areaId === 'done' ? options.parentDone : undefined,
    multiDrag: options.multiDrag,
    selectedClass: options.selectedClass,
    swap: areaId === 'todo' ? options.swap : undefined,
    swapThreshold: options.swapThreshold,
    invertSwap: options.invertSwap,
  });
  const unregister = {
    todo: scope.registerArea(areas.todo, itemOptions('todo')),
    done: scope.registerArea(areas.done, itemOptions('done')),
  };

  const begin = (
    areaId: 'todo' | 'done',
    index: number,
    modifiers: Readonly<{
      altKey?: boolean;
      ctrlKey?: boolean;
      metaKey?: boolean;
      shiftKey?: boolean;
    }> = {},
  ): void => {
    const area = areas[areaId];
    const item = sortableChildren(area)[index] as FakeElement;
    item.focus();
    const itemRect = item.getBoundingClientRect();
    const start = pointer({
      clientX: itemRect.left + 10,
      clientY: itemRect.top + 10,
      target: item,
      ...modifiers,
    });
    lastPointer = start;
    platform.setHits([item, area]);
    area.dispatch('pointerdown', start);
    const activate = pointer({
      ...start,
      clientX: start.clientX + 4,
      target: item,
    });
    lastPointer = activate;
    platform.dispatchDocument('pointermove', activate);
    platform.flushFrame();
  };

  const moveTo = (
    areaId: 'todo' | 'done',
    index: number,
    flushFrame: boolean,
  ): void => {
    const area = areas[areaId];
    const items = sortableChildren(area);
    const reference = items[index];
    const areaRect = area.getBoundingClientRect();
    const clientY = reference === undefined
      ? areaRect.bottom - 1
      : reference.getBoundingClientRect().top + 1;
    const target = reference ?? area;
    const next = pointer({
      clientX: areaRect.left + 10,
      clientY,
      target,
    });
    lastPointer = next;
    platform.setHits([target, area]);
    platform.dispatchDocument('pointermove', next);
    if (flushFrame) {
      platform.flushFrame();
    }
  };
  const move = (areaId: 'todo' | 'done', index: number): void => {
    moveTo(areaId, index, true);
  };

  const moveOutside = (): void => {
    const next = pointer({ clientX: 500, clientY: 500, target: null });
    lastPointer = next;
    platform.setHits([]);
    platform.dispatchDocument('pointermove', next);
    platform.flushFrame();
  };

  const release = (): void => {
    platform.dispatchDocument('pointerup', lastPointer);
  };

  return {
    scope,
    platform,
    results,
    unregister,
    begin,
    select(areaId, index, modifiers = {}) {
      const area = areas[areaId];
      const item = sortableChildren(area)[index] as FakeElement;
      const itemRect = item.getBoundingClientRect();
      const event = pointer({
        clientX: itemRect.left + 10,
        clientY: itemRect.top + 10,
        target: item,
        ...modifiers,
      });
      platform.setHits([item, area]);
      area.dispatch('pointerdown', event);
      platform.dispatchDocument('pointerup', event);
    },
    move,
    queueMove(areaId, index) {
      moveTo(areaId, index, false);
    },
    repeatMove() {
      platform.dispatchDocument('pointermove', lastPointer);
      platform.flushFrame();
    },
    moveOutside,
    release,
    drop(sourceAreaId, sourceIndex, destinationAreaId, destinationIndex) {
      begin(sourceAreaId, sourceIndex);
      move(destinationAreaId, destinationIndex);
      release();
    },
    terminate(signal) {
      switch (signal) {
        case 'pointercancel':
          platform.dispatchDocument('pointercancel', lastPointer);
          break;
        case 'escape':
          platform.dispatchDocument('keydown', { key: 'Escape' });
          break;
        case 'blur':
          platform.dispatchWindow('blur', {});
          break;
        case 'visibility':
          platform.setVisibility('hidden');
          platform.dispatchDocument('visibilitychange', {});
          break;
        case 'unmount':
          unregister.todo();
          break;
        case 'destroy':
          scope.destroy();
          break;
      }
    },
    ids: (areaId) => sortableChildren(areas[areaId]).map(
      (item) => item.getAttribute('data-sortable-id') as SortableId,
    ),
    area: (areaId) => areas[areaId],
    item: (areaId, index) => sortableChildren(areas[areaId])[index] as FakeElement,
    elements: () => [
      areas.todo,
      ...sortableChildren(areas.todo),
      areas.done,
      ...sortableChildren(areas.done),
    ],
    placeholderCount: () => (
      areas.todo.querySelectorAll('[data-comins-sortable-placeholder]').length
      + areas.done.querySelectorAll('[data-comins-sortable-placeholder]').length
    ),
  };
}

export function performTransfer(
  fixture: ScopeFixture,
  sourceAreaId: 'todo' | 'done',
  sourceIndex: number,
  destinationAreaId: 'todo' | 'done',
  destinationIndex: number,
): void {
  fixture.drop(sourceAreaId, sourceIndex, destinationAreaId, destinationIndex);
}

export function assertOriginalDom(fixture: ScopeFixture): void {
  assert.deepEqual(fixture.ids('todo'), ['a', 'b']);
  assert.deepEqual(fixture.ids('done'), ['c', 'd']);
}

function fixtureArea(
  platform: FakePlatform,
  areaId: string,
  left: number,
  itemIds: readonly string[],
  options: { scrollable?: boolean } = {},
): FakeElement {
  const areaElement = fakeElement('UL', {
    ownerDocument: platform.document,
    rect: { left, top: 0, right: left + 100, bottom: 100, width: 100, height: 100 },
    attributes: { 'data-fixture-area': areaId },
    computedStyle: options.scrollable ? { overflowY: 'auto' } : undefined,
    clientHeight: 100,
    scrollHeight: options.scrollable ? 300 : 100,
  });
  itemIds.forEach((itemId, index) => {
    areaElement.appendChild(fakeElement('LI', {
      ownerDocument: platform.document,
      attributes: {
        'data-sortable-item': '',
        'data-sortable-id': itemId,
      },
      rect: {
        left,
        top: index * 30,
        right: left + 100,
        bottom: index * 30 + 20,
        width: 100,
        height: 20,
      },
    }));
  });
  return areaElement;
}

function sortableChildren(areaElement: FakeElement): FakeElement[] {
  return areaElement.fixtureChildren.filter(
    (child) => child.hasAttribute('data-sortable-item'),
  );
}

function findItem(
  areas: Record<'todo' | 'done', FakeElement>,
  itemId: SortableId,
): FakeElement | undefined {
  return [...sortableChildren(areas.todo), ...sortableChildren(areas.done)].find(
    (item) => item.getAttribute('data-sortable-id') === String(itemId),
  );
}
