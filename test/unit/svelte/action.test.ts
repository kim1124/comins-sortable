import assert from 'node:assert/strict';
import test from 'node:test';

import { createSortableScope, sortable } from '../../../src/svelte.js';
import { createSortableScopeInternal } from '../../../src/core/scope.js';
import { handleAfterDrag, createSvelteSortableScope } from '../../../src/svelte/scope.js';
import {
  createSvelteSortableAction,
  inspectSvelteActionForTest,
} from '../../../src/svelte/sortable.js';
import { svelteActionHarness } from '../helpers/framework-fixtures.js';
import { fakeElement, fakePlatform, pointer } from '../helpers/core-fixtures.js';

interface Task {
  id: string;
}

const todo = (): readonly Task[] => [{ id: 'a' }, { id: 'b' }];

function options(overrides: Partial<Parameters<typeof sortable<Task>>[1]> = {}) {
  return {
    areaId: 'todo',
    group: 'tasks',
    items: todo(),
    itemKey: 'id' as const,
    onItemsChange: () => undefined,
    ...overrides,
  };
}

test('action updates items and options without creating another registration', () => {
  const harness = svelteActionHarness<Task>();
  const action = harness.action();

  action.update({
    ...harness.options(),
    items: [{ id: 'b' }, { id: 'a' }],
    disabled: true,
  });

  assert.equal(harness.registrationCount('todo'), 1);
  assert.equal(harness.updateCount('todo'), 1);
  assert.equal(harness.area('todo')?.disabled, true);
});

test('action destroys an action-owned scope idempotently', () => {
  const harness = svelteActionHarness<Task>();
  const action = harness.privateAction();

  action.destroy();
  action.destroy();

  assert.equal(harness.registrationCount('todo'), 0);
  assert.equal(harness.destroyCount(), 1);
  assert.equal(harness.retainedCallbackCount(), 0);
});

test('action update uses the latest item key and item callback without registration churn', () => {
  const harness = svelteActionHarness<Task>();
  const first = harness.action();
  const calls: (readonly Task[])[] = [];
  first.update(harness.options({
    items: [{ id: 'b' }, { id: 'a' }],
    itemKey: (item) => item.id,
    onItemsChange: (items) => calls.push(items),
  }));

  harness.trigger({
    operation: 'reorder', itemId: 'b',
    source: { areaId: 'todo', index: 0 }, destination: { areaId: 'todo', index: 1 },
    orders: [{ areaId: 'todo', itemIds: ['a', 'b'] }],
  });

  assert.deepEqual(calls, [[{ id: 'a' }, { id: 'b' }]]);
  assert.equal(harness.registrationCount('todo'), 1);
});

test('a shared Scope applies transfer setters before one enhanced change callback', () => {
  let coreCallbacks: import('../../../src/core.js').SortableScopeOptions = {};
  const calls: string[] = [];
  const scope = createSvelteSortableScope<Task>({
    onChange: (change) => calls.push(`change:${change.updates.map((update) => update.areaId).join(',')}`),
  }, (callbacks) => {
    coreCallbacks = callbacks;
    return {
      registerArea: () => () => undefined,
      updateArea: () => undefined,
      cancel: () => undefined,
      destroy: () => undefined,
    };
  });
  const todoNode = fakeElement('UL');
  const doneNode = fakeElement('UL');
  const todoAction = sortable(todoNode as unknown as HTMLElement, options({
    scope,
    onItemsChange: (items) => calls.push(`todo:${items.map((item) => item.id).join(',')}`),
  }));
  const doneAction = sortable(doneNode as unknown as HTMLElement, options({
    scope,
    areaId: 'done',
    items: [{ id: 'c' }],
    onItemsChange: (items) => calls.push(`done:${items.map((item) => item.id).join(',')}`),
  }));

  coreCallbacks.onChange?.({
    operation: 'transfer', itemId: 'b',
    source: { areaId: 'todo', index: 1 }, destination: { areaId: 'done', index: 1 },
    orders: [
      { areaId: 'todo', itemIds: ['a'] },
      { areaId: 'done', itemIds: ['c', 'b'] },
    ],
  });

  assert.deepEqual(calls, ['todo:a', 'done:c,b', 'change:todo,done']);
  todoAction.destroy();
  doneAction.destroy();
  scope.destroy();
});

test('a shared Scope prepares and applies the latest typed copy to only its destination', () => {
  let coreCallbacks: import('../../../src/core.js').SortableScopeOptions = {};
  const areaOptions = new Map<string, import('../../../src/core.js').SortableAreaOptions>();
  const calls: string[] = [];
  const scope = createSvelteSortableScope<Task>({
    onChange: (change) => calls.push(`change:${change.operation}`),
  }, (callbacks) => {
    coreCallbacks = callbacks;
    return {
      registerArea(_element, options) {
        areaOptions.set(options.areaId, options);
        return () => areaOptions.delete(options.areaId);
      },
      updateArea: () => undefined,
      cancel: () => undefined,
      destroy: () => undefined,
    };
  });
  const todoAction = sortable(fakeElement('UL') as unknown as HTMLElement, options({
    scope,
    items: [{ id: 'a' }],
    copyItem: (item) => ({ id: `${item.id}-copy` }),
    onItemsChange: () => calls.push('todo:set'),
  }));
  const doneAction = sortable(fakeElement('UL') as unknown as HTMLElement, options({
    scope,
    areaId: 'done',
    items: [{ id: 'c' }],
    onItemsChange: (items) => calls.push(`done:${items.map((item) => item.id).join(',')}`),
  }));
  const context = {
    itemId: 'a',
    source: { areaId: 'todo', index: 0 },
    destination: { areaId: 'done', index: 1 },
    pointer: {
      type: 'mouse' as const,
      clientX: 0,
      clientY: 0,
      deltaX: 0,
      deltaY: 0,
      altKey: false,
      ctrlKey: false,
      metaKey: false,
      shiftKey: false,
    },
  };

  assert.equal(areaOptions.get('todo')?.prepareCopy?.(context), 'a-copy');
  coreCallbacks.onChange?.({
    operation: 'copy',
    sourceItemId: 'a',
    itemId: 'a-copy',
    source: context.source,
    destination: context.destination,
    orders: [
      { areaId: 'todo', itemIds: ['a'] },
      { areaId: 'done', itemIds: ['c', 'a-copy'] },
    ],
  });

  assert.deepEqual(calls, ['done:c,a-copy', 'change:copy']);
  coreCallbacks.onAfterDrag?.({ status: 'dropped', reason: 'drop' });
  todoAction.destroy();
  doneAction.destroy();
  scope.destroy();
});

test('shared scopes remain usable after one action is destroyed', () => {
  const platform = fakePlatform();
  const scope = createSortableScope<Task>();
  const todoNode = fakeElement('UL', { ownerDocument: platform.document });
  const doneNode = fakeElement('UL', { ownerDocument: platform.document });
  const first = sortable(todoNode as unknown as HTMLElement, options({ scope }));
  const second = sortable(doneNode as unknown as HTMLElement, options({
    scope,
    areaId: 'done',
    items: [{ id: 'c' }],
  }));

  first.destroy();
  second.destroy();
  scope.destroy();
});

test('action replaces an area registration when its area ID or scope changes', () => {
  const harness = svelteActionHarness<Task>();
  const action = harness.action();
  const nextScope = createSvelteSortableScope<Task>({}, () => ({
    registerArea: () => () => undefined,
    updateArea: () => undefined,
    cancel: () => undefined,
    destroy: () => undefined,
  }));

  action.update(harness.options({ areaId: 'done', scope: nextScope }));

  assert.equal(harness.registrationCount('todo'), 0);
  action.destroy();
  nextScope.destroy();
});

test('a failed same-scope area transition restores the previous working registration', () => {
  const harness = svelteActionHarness<Task>();
  const action = harness.action();
  const duplicate = sortable(fakeElement('UL') as unknown as HTMLElement, harness.options({
    areaId: 'done', items: [{ id: 'c' }],
  }));

  assert.throws(() => action.update(harness.options({ areaId: 'done' })), {
    code: 'DUPLICATE_AREA_ID',
  });
  assert.equal(harness.registrationCount('todo'), 1);

  action.update(harness.options({ disabled: true }));
  assert.equal(harness.area('todo')?.disabled, true);
  duplicate.destroy();
  action.update(harness.options({ areaId: 'done' }));
  assert.equal(harness.registrationCount('done'), 1);
  action.destroy();
});

test('a Core registration failure restores the old area and later permits a valid transition', () => {
  const registrations = new Set<string>();
  let rejectDone = true;
  const scope = createSvelteSortableScope<Task>({}, () => ({
    registerArea(_element, areaOptions) {
      if (areaOptions.areaId === 'done' && rejectDone) throw new Error('Core registration failed');
      registrations.add(areaOptions.areaId);
      return () => registrations.delete(areaOptions.areaId);
    },
    updateArea: () => undefined,
    cancel: () => undefined,
    destroy: () => registrations.clear(),
  }));
  const action = sortable(fakeElement('UL') as unknown as HTMLElement, options({ scope }));

  assert.throws(() => action.update(options({ scope, areaId: 'done', items: [{ id: 'c' }] })), /Core registration failed/);
  assert.deepEqual([...registrations], ['todo']);
  rejectDone = false;
  action.update(options({ scope, areaId: 'done', items: [{ id: 'c' }] }));
  assert.deepEqual([...registrations], ['done']);
  action.destroy();
  scope.destroy();
});

test('a cross-scope todo-to-todo transition preserves its Core area marker and restores absence on destroy', () => {
  const platform = fakePlatform();
  const node = fakeElement('UL', { ownerDocument: platform.document });
  const firstScope = coreScope(platform);
  const secondScope = coreScope(platform);
  const action = sortable(node as unknown as HTMLElement, options({ scope: firstScope, items: [] }));

  action.update(options({ scope: secondScope, items: [] }));
  assert.equal(node.getAttribute('data-comins-sortable-area'), 'todo');

  action.destroy();
  assert.equal(node.hasAttribute('data-comins-sortable-area'), false);
  firstScope.destroy();
  secondScope.destroy();
});

test('a cross-scope todo-to-done transition keeps the new marker then restores the original attribute', () => {
  const platform = fakePlatform();
  const node = fakeElement('UL', {
    ownerDocument: platform.document,
    attributes: { 'data-comins-sortable-area': 'legacy-area' },
  });
  const firstScope = coreScope(platform);
  const secondScope = coreScope(platform);
  const action = sortable(node as unknown as HTMLElement, options({ scope: firstScope, items: [] }));

  action.update(options({ scope: secondScope, areaId: 'done', items: [] }));
  assert.equal(node.getAttribute('data-comins-sortable-area'), 'done');

  action.destroy();
  assert.equal(node.getAttribute('data-comins-sortable-area'), 'legacy-area');
  firstScope.destroy();
  secondScope.destroy();
});

test('a failed cross-scope candidate restores the old marker and later transition succeeds', () => {
  const platform = fakePlatform();
  const node = fakeElement('UL', { ownerDocument: platform.document });
  const firstScope = coreScope(platform);
  const validScope = coreScope(platform);
  const failingScope = createSvelteSortableScope<Task>({}, () => ({
    registerArea: () => { throw new Error('candidate Core registration failed'); },
    updateArea: () => undefined,
    cancel: () => undefined,
    destroy: () => undefined,
  }));
  const action = sortable(node as unknown as HTMLElement, options({ scope: firstScope, items: [] }));

  assert.throws(() => action.update(options({ scope: failingScope, areaId: 'done', items: [] })), /candidate Core registration failed/);
  assert.equal(node.getAttribute('data-comins-sortable-area'), 'todo');
  action.update(options({ scope: validScope, areaId: 'done', items: [] }));
  assert.equal(node.getAttribute('data-comins-sortable-area'), 'done');

  action.destroy();
  assert.equal(node.hasAttribute('data-comins-sortable-area'), false);
  firstScope.destroy();
  failingScope.destroy();
  validScope.destroy();
});

test('final action destroy restores an initial area marker exactly', () => {
  const platform = fakePlatform();
  const node = fakeElement('UL', {
    ownerDocument: platform.document,
    attributes: { 'data-comins-sortable-area': 'existing-area' },
  });
  const scope = coreScope(platform);
  const action = sortable(node as unknown as HTMLElement, options({ scope, items: [] }));

  action.destroy();
  assert.equal(node.getAttribute('data-comins-sortable-area'), 'existing-area');
  scope.destroy();
});

test('a failed private Scope transition destroys only its new private candidate', () => {
  const harness = svelteActionHarness<Task>();
  let candidateDestroys = 0;
  const action = createSvelteSortableAction(harness.element, harness.options(), () => (
    createSvelteSortableScope<Task>({}, () => ({
      registerArea: () => { throw new Error('candidate registration failed'); },
      updateArea: () => undefined,
      cancel: () => undefined,
      destroy: () => { candidateDestroys += 1; },
    }))
  ));

  assert.throws(() => action.update({
    areaId: 'todo', group: 'tasks', items: todo(), itemKey: 'id', onItemsChange: () => undefined,
  }), /candidate registration failed/);
  assert.equal(candidateDestroys, 1);
  assert.equal(harness.registrationCount('todo'), 1);
  action.destroy();
});

test('initial private registration failure destroys its owned Scope candidate', () => {
  let destroys = 0;
  assert.throws(() => createSvelteSortableAction(
    fakeElement('UL') as unknown as HTMLElement,
    { areaId: 'todo', items: todo(), itemKey: 'id', onItemsChange: () => undefined },
    () => createSvelteSortableScope<Task>({}, () => ({
      registerArea: () => { throw new Error('initial registration failed'); },
      updateArea: () => undefined,
      cancel: () => undefined,
      destroy: () => { destroys += 1; },
    })),
  ), /initial registration failed/);
  assert.equal(destroys, 1);
});

test('a destroyed supplied Scope fails a transition without detaching the old action', () => {
  const harness = svelteActionHarness<Task>();
  const action = harness.action();
  const destroyedScope = createSvelteSortableScope<Task>({}, () => ({
    registerArea: () => () => undefined,
    updateArea: () => undefined,
    cancel: () => undefined,
    destroy: () => undefined,
  }));
  destroyedScope.destroy();

  assert.throws(() => action.update(harness.options({ scope: destroyedScope })), {
    code: 'INVALID_OPTION',
  });
  assert.equal(harness.registrationCount('todo'), 1);
  action.destroy();
});

test('destroy clears action references and later updates are no-ops', () => {
  const harness = svelteActionHarness<Task>();
  const action = harness.privateAction();

  action.destroy();
  action.update(harness.options());

  assert.deepEqual(inspectSvelteActionForTest(action), {
    hasNode: false, hasOptions: false, hasScope: false, hasCreateScope: false, hasRegistration: false,
  });
  assert.equal(harness.registrationCount('todo'), 0);
});

test('destroying a shared Scope drains all action registrations and stale action cleanup is safe', () => {
  const harness = svelteActionHarness<Task>();
  const first = harness.action();
  const second = sortable(fakeElement('UL') as unknown as HTMLElement, harness.options({
    areaId: 'done', items: [{ id: 'c' }],
  }));

  harness.scope.destroy();
  first.destroy();
  second.destroy();

  assert.equal(harness.registrationCount('todo'), 0);
  assert.equal(harness.registrationCount('done'), 0);
  assert.equal(harness.retainedCallbackCount(), 0);
});

test('a cancelled drag rolls back before the consumer callback and preserves rollback errors', () => {
  const calls: string[] = [];
  const rollbackError = new Error('rollback failed');
  assert.throws(() => handleAfterDrag({
    finish() {},
    rollback() { throw rollbackError; },
  }, {
    onAfterDrag: () => calls.push('after'),
  }, { status: 'cancelled', reason: 'escape' }), (error) => error === rollbackError);

  assert.deepEqual(calls, ['after']);
});

test('Core rejects zero-child controlled bindings before any consumer callback', () => {
  const platform = fakePlatform();
  const errors: unknown[] = [];
  let consumerCalls = 0;
  const scope = createSvelteSortableScope<Task>({
    onBeforeDragStart: () => { consumerCalls += 1; },
    onChange: () => { consumerCalls += 1; },
    onAfterDrag: () => { consumerCalls += 1; },
    onError: (error) => errors.push(error),
  }, (scopeOptions) => createSortableScopeInternal(scopeOptions, platform));
  const sourceArea = fakeElement('UL', { ownerDocument: platform.document, selectors: [':scope > *'] });
  const source = fakeElement('LI', { ownerDocument: platform.document, selectors: [':scope > *'] });
  sourceArea.appendChild(source);
  const emptyDestination = fakeElement('UL', { ownerDocument: platform.document, selectors: [':scope > *'] });
  const sourceAction = sortable(sourceArea as unknown as HTMLElement, options({ scope, items: [{ id: 'a' }] }));
  const destinationAction = sortable(emptyDestination as unknown as HTMLElement, options({
    scope, areaId: 'done', items: [{ id: 'b' }],
  }));
  const down = pointer({ target: source, clientX: 1, clientY: 1 });
  platform.setHits([source, sourceArea]);
  sourceArea.dispatch('pointerdown', down);
  platform.dispatchDocument('pointermove', pointer({ ...down, target: source, clientX: 5 }));
  platform.flushFrame();

  assert.equal((errors[0] as { code?: string }).code, 'INVALID_ELEMENT');
  assert.equal(consumerCalls, 0);
  sourceAction.destroy();
  destinationAction.destroy();
  scope.destroy();
});

test('an absent Svelte onError falls back to the Core platform reporter', () => {
  const platform = fakePlatform();
  const scope = createSvelteSortableScope<Task>({}, (scopeOptions) => (
    createSortableScopeInternal(scopeOptions, platform)
  ));
  const sourceArea = fakeElement('UL', { ownerDocument: platform.document, selectors: [':scope > *'] });
  const source = fakeElement('LI', { ownerDocument: platform.document, selectors: [':scope > *'] });
  sourceArea.appendChild(source);
  const emptyDestination = fakeElement('UL', { ownerDocument: platform.document, selectors: [':scope > *'] });
  const sourceAction = sortable(sourceArea as unknown as HTMLElement, options({ scope, items: [{ id: 'a' }] }));
  const destinationAction = sortable(emptyDestination as unknown as HTMLElement, options({
    scope, areaId: 'done', items: [{ id: 'b' }],
  }));
  const down = pointer({ target: source, clientX: 1, clientY: 1 });
  platform.setHits([source, sourceArea]);
  sourceArea.dispatch('pointerdown', down);
  platform.dispatchDocument('pointermove', pointer({ ...down, target: source, clientX: 5 }));
  platform.flushFrame();

  assert.equal((platform.reports[0] as { code?: string }).code, 'INVALID_ELEMENT');
  sourceAction.destroy();
  destinationAction.destroy();
  scope.destroy();
});

test('real Core reports a consumer after-drag error after the action rolls back state', () => {
  const platform = fakePlatform();
  const consumerError = new Error('consumer after-drag failed');
  const errors: unknown[] = [];
  const afterReasons: string[] = [];
  let todoItems: readonly Task[] = [{ id: 'a' }, { id: 'b' }];
  let doneItems: readonly Task[] = [{ id: 'c' }];
  const scope = createSvelteSortableScope<Task>({
    onAfterDrag: (result) => {
      afterReasons.push(result.reason);
      throw consumerError;
    },
    onError: (error) => errors.push(error),
  }, (scopeOptions) => createSortableScopeInternal(scopeOptions, platform));
  const sourceArea = sortableArea(platform, 0, ['a', 'b']);
  const destinationArea = sortableArea(platform, 200, ['c']);
  const sourceAction = sortable(sourceArea as unknown as HTMLElement, options({
    scope,
    items: todoItems,
    onItemsChange: (items) => { todoItems = items; },
  }));
  const destinationAction = sortable(destinationArea as unknown as HTMLElement, options({
    scope,
    areaId: 'done',
    items: doneItems,
    onItemsChange: (items) => { doneItems = items; },
  }));
  const source = sourceArea.fixtureChildren[1] as Element;
  const destination = destinationArea.fixtureChildren[0] as Element;
  const down = pointer({ target: source, clientX: 10, clientY: 40 });
  platform.setHits([source, sourceArea]);
  sourceArea.dispatch('pointerdown', down);
  platform.dispatchDocument('pointermove', pointer({ ...down, target: source, clientX: 14 }));
  platform.flushFrame();
  platform.setHits([destination, destinationArea]);
  platform.dispatchDocument('pointermove', pointer({
    ...down, target: destination, clientX: 210, clientY: 1,
  }));
  platform.flushFrame();
  platform.dispatchDocument('pointerup', pointer({
    ...down, target: destination, clientX: 210, clientY: 1,
  }));
  platform.flushFrame();

  assert.deepEqual(todoItems, [{ id: 'a' }, { id: 'b' }]);
  assert.deepEqual(doneItems, [{ id: 'c' }]);
  assert.deepEqual(afterReasons, ['state-not-committed']);
  assert.deepEqual(errors, [consumerError]);
  sourceAction.destroy();
  destinationAction.destroy();
  scope.destroy();
});

function sortableArea(
  platform: ReturnType<typeof fakePlatform>,
  left: number,
  itemIds: readonly string[],
) {
  const area = fakeElement('UL', {
    ownerDocument: platform.document,
    rect: { left, top: 0, right: left + 100, bottom: 100, width: 100, height: 100 },
  });
  itemIds.forEach((itemId, index) => {
    area.appendChild(fakeElement('LI', {
      ownerDocument: platform.document,
      attributes: { 'data-sortable-id': itemId },
      rect: {
        left, top: index * 30, right: left + 100, bottom: index * 30 + 20, width: 100, height: 20,
      },
      selectors: [':scope > *'],
    }));
  });
  return area;
}

function coreScope(platform: ReturnType<typeof fakePlatform>) {
  return createSvelteSortableScope<Task>(
    {},
    (scopeOptions) => createSortableScopeInternal(scopeOptions, platform),
  );
}
