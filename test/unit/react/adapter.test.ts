import assert from 'node:assert/strict';
import test from 'node:test';
import { createElement } from 'react';
import type { ReactElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import {
  doneProps,
  reactAdapterHarness,
  todoProps,
  type Task,
} from '../helpers/framework-fixtures.js';
import { hasCode } from '../helpers/core-fixtures.js';
import type { SortableAreaProps } from '../../../src/react.js';
import { SortableArea, SortableRoot } from '../../../src/react.js';
import {
  createReactAreaLifecycle,
  itemIdForElement,
} from '../../../src/react/lifecycle.js';
import { handleAfterDrag } from '../../../src/react/context.js';
import { createReactSortableController } from '../../../src/react/context.js';
import type { ReactSortableController } from '../../../src/react/context.js';
import { renderedArea } from '../helpers/framework-fixtures.js';
import { dragContext } from '../helpers/core-fixtures.js';
import { fakeElement, fakePlatform, pointer } from '../helpers/core-fixtures.js';
import { createSortableScopeInternal } from '../../../src/core/scope.js';
import { createReactRootLifecycle } from '../../../src/react/root-lifecycle.js';

test('Strict Mode setup-cleanup-setup leaves one registration', () => {
  const harness = reactAdapterHarness<Task>();
  const firstCleanup = harness.mountArea(todoProps());
  firstCleanup();
  const secondCleanup = harness.mountArea(todoProps());
  assert.equal(harness.registrationCount('todo'), 1);
  secondCleanup();
  assert.equal(harness.registrationCount('todo'), 0);
});

test('Root cleanup destroys its controller and Strict Mode setup can register again', () => {
  const calls: string[] = [];
  let instance = 0;
  const root = createReactRootLifecycle<Task>(() => {
    instance += 1;
    const current = instance;
    return {
      registerArea() {
        calls.push(`register:${current}`);
        return () => calls.push(`unregister:${current}`);
      },
      updateArea() {},
      destroy() {
        calls.push(`destroy:${current}`);
      },
    };
  });
  const area = {} as Element;
  const binding = renderedArea('todo', 'tasks', [{ id: 'a' }]);

  const firstCleanup = root.registerArea(area, binding, {
    areaId: 'todo',
    item: ':scope > *',
  });
  root.destroy();
  firstCleanup();
  const secondCleanup = root.registerArea(area, binding, {
    areaId: 'todo',
    item: ':scope > *',
  });
  secondCleanup();
  root.destroy();

  assert.deepEqual(calls, [
    'register:1',
    'destroy:1',
    'unregister:1',
    'register:2',
    'unregister:2',
    'destroy:2',
  ]);
});

test('an Area without a Root owns a one-area scope', () => {
  const harness = reactAdapterHarness<Task>();
  const firstCleanup = harness.mountArea(todoProps());
  const secondCleanup = harness.mountArea(doneProps());

  assert.equal(harness.scopeCount(), 2);
  firstCleanup();
  secondCleanup();
});

test('a Root transfer batches two controlled setters and one change', () => {
  const harness = reactAdapterHarness<Task>();
  harness.mountRoot();
  harness.mountArea(todoProps());
  harness.mountArea(doneProps());

  harness.transfer('b', 'todo', 1, 'done', 0);

  assert.deepEqual(harness.calls, [
    'set:todo:a',
    'set:done:b,c',
    'change:transfer',
  ]);
});

test('controller exposes the Area copy factory through Core preparation', () => {
  let registeredOptions: import('../../../src/core.js').SortableAreaOptions | undefined;
  const controller = createReactSortableController<Task>({
    getRootProps: () => ({}),
    createScope: () => ({
      registerArea(_element, options) {
        registeredOptions = options;
        return () => undefined;
      },
      updateArea: () => undefined,
      cancel: () => undefined,
      destroy: () => undefined,
    }),
  });
  const binding = {
    ...renderedArea('todo', 'tasks', [{ id: 'a' }]),
    copyItem: () => ({ id: 'a-copy' }),
  };
  controller.registerArea({} as Element, binding, {
    areaId: 'todo',
    group: { name: 'tasks', pull: 'copy' },
    item: ':scope > *',
  });

  assert.equal(registeredOptions?.prepareCopy?.({
    ...dragContext(),
    itemId: 'a',
    destination: { areaId: 'done', index: 0 },
  }), 'a-copy');
  controller.destroy();
});

test('a non-drop result restores controlled arrays before the consumer callback', () => {
  const callbackStates: (readonly Task[])[] = [];
  const harness = reactAdapterHarness<Task>();
  harness.mountRoot({
    onAfterDrag: () => callbackStates.push(harness.items('todo')),
  });
  harness.mountArea(todoProps());
  harness.mountArea(doneProps());

  harness.beginTransfer('b', 'todo', 1, 'done', 0);
  harness.cancel();

  assert.deepEqual(harness.items('todo'), [{ id: 'a' }, { id: 'b' }]);
  assert.deepEqual(callbackStates, [[{ id: 'a' }, { id: 'b' }]]);
});

test('area option updates do not register a second binding', () => {
  const harness = reactAdapterHarness<Task>();
  harness.mountRoot();
  const cleanup = harness.mountArea(todoProps());

  harness.updateArea('todo', { disabled: true });

  assert.equal(harness.registrationCount('todo'), 1);
  assert.equal(harness.updateCount('todo'), 1);
  cleanup();
});

test('activation rejects a direct-child count mismatch', () => {
  const area = { children: [] as Element[] } as unknown as HTMLDivElement;
  const child = {
    parentElement: area,
    hasAttribute: () => false,
  } as unknown as Element;
  const extraChild = {
    parentElement: area,
    hasAttribute: () => false,
  } as unknown as Element;
  (area as unknown as { children: Element[] }).children.push(child, extraChild);
  const getItemId = itemIdForElement(
    () => area,
    () => ({
        areaId: 'todo',
        items: [{ id: 'a' }],
        itemKey: 'id',
        onItemsChange: () => undefined,
        children: () => ({}) as ReactElement,
      } satisfies SortableAreaProps<Task>),
  );

  assert.throws(() => getItemId(child), hasCode('INVALID_ELEMENT'));
});

test('shared lifecycle skips an initial update and registers once across setup-cleanup-setup', () => {
  const calls: string[] = [];
  const controller = {
    registerArea: () => {
      calls.push('register');
      return () => calls.push('unregister');
    },
    updateArea: () => calls.push('update'),
    destroy: () => calls.push('destroy'),
  };
  const element = { children: [] } as unknown as HTMLDivElement;
  const lifecycle = createReactAreaLifecycle({ controller, props: todoProps() });

  lifecycle.setElement(element);
  lifecycle.update(todoProps());
  lifecycle.dispose();
  lifecycle.setElement(element);

  assert.deepEqual(calls, ['register', 'unregister', 'register']);
});

test('shared lifecycle leaves a same-element, same-props update registered without churn', () => {
  const calls: string[] = [];
  const controller = lifecycleController(calls);
  const element = fakeElement('DIV');
  const props = todoProps();
  const lifecycle = createReactAreaLifecycle({ controller, props });

  lifecycle.setElement(areaElement(element));
  lifecycle.update(props);
  lifecycle.setElement(areaElement(element));

  assert.deepEqual(calls, ['register:todo']);
});

test('shared lifecycle updates a genuine option change exactly once', () => {
  const calls: string[] = [];
  const controller = lifecycleController(calls);
  const element = fakeElement('DIV');
  const lifecycle = createReactAreaLifecycle({ controller, props: todoProps() });

  lifecycle.setElement(areaElement(element));
  lifecycle.update({ ...todoProps(), disabled: true });
  lifecycle.update({ ...todoProps(), disabled: true });

  assert.deepEqual(calls, ['register:todo', 'update:todo']);
});

test('shared lifecycle binding reads the latest item key and items callback', () => {
  const registration: {
    binding?: Parameters<ReactSortableController<Task>['registerArea']>[1];
  } = {};
  const controller: ReactSortableController<Task> = {
    registerArea(_element, binding) {
      registration.binding = binding;
      return () => undefined;
    },
    updateArea: () => undefined,
    destroy: () => undefined,
  };
  const element = fakeElement('DIV');
  const firstUpdates: (readonly Task[])[] = [];
  const latestUpdates: (readonly Task[])[] = [];
  const copyCalls: string[] = [];
  const lifecycle = createReactAreaLifecycle({
    controller,
    props: {
      areaId: 'todo',
      group: 'tasks',
      items: [{ id: 'a' }],
      itemKey: () => 'first',
      onItemsChange: (items) => firstUpdates.push(items),
      copyItem: () => {
        copyCalls.push('first');
        return { id: 'first-copy' };
      },
    },
  });

  lifecycle.setElement(areaElement(element));
  lifecycle.update({
    areaId: 'todo',
    group: 'tasks',
    items: [{ id: 'a' }],
    itemKey: 'id',
    onItemsChange: (items) => latestUpdates.push(items),
    copyItem: (item) => {
      copyCalls.push('latest');
      return { id: `${item.id}-copy` };
    },
  });
  const binding = registration.binding;
  if (binding === undefined) {
    throw new Error('binding was not registered');
  }
  const nextItems = [{ id: 'b' }];

  assert.equal(binding.getItemId({ id: 'a' }), 'a');
  binding.setItems(nextItems);
  assert.deepEqual(binding.copyItem?.({
    ...dragContext(),
    itemId: 'a',
    destination: { areaId: 'done', index: 0 },
  }), { id: 'a-copy' });
  assert.deepEqual(firstUpdates, []);
  assert.deepEqual(latestUpdates, [nextItems]);
  assert.deepEqual(copyCalls, ['latest']);
});

test('shared lifecycle unregisters the old area ID before registering its replacement', () => {
  const calls: string[] = [];
  const controller = lifecycleController(calls);
  const firstElement = fakeElement('DIV');
  const lifecycle = createReactAreaLifecycle({ controller, props: todoProps() });

  lifecycle.setElement(areaElement(firstElement));
  lifecycle.update({ ...todoProps(), areaId: 'next' });

  assert.deepEqual(calls, [
    'register:todo',
    'unregister:todo',
    'register:next',
  ]);
});

test('shared lifecycle unregisters and re-registers when its element identity changes', () => {
  const calls: string[] = [];
  const controller = lifecycleController(calls);
  const firstElement = fakeElement('DIV');
  const secondElement = fakeElement('DIV');
  const lifecycle = createReactAreaLifecycle({ controller, props: todoProps() });

  lifecycle.setElement(areaElement(firstElement));
  lifecycle.setElement(areaElement(secondElement));

  assert.deepEqual(calls, [
    'register:todo',
    'unregister:todo',
    'register:todo',
  ]);
});

test('shared lifecycle owns and destroys a rootless controller once across repeated ref cleanup', () => {
  const calls: string[] = [];
  const controller = {
    registerArea: () => () => calls.push('unregister'),
    updateArea: () => calls.push('update'),
    destroy: () => calls.push('destroy'),
  };
  const lifecycle = createReactAreaLifecycle({
    createController: () => controller,
    props: todoProps(),
  });
  const element = { children: [] } as unknown as HTMLDivElement;

  lifecycle.setElement(element);
  lifecycle.setElement(element);
  lifecycle.setElement(null);
  lifecycle.dispose();
  lifecycle.setElement(null);

  assert.deepEqual(calls, ['unregister', 'destroy']);
});

test('after-drag invokes the consumer once after rollback failures and preserves the first error', () => {
  const calls: string[] = [];
  const rollbackError = new Error('rollback failed');
  const consumerError = new Error('consumer failed');

  assert.throws(() => handleAfterDrag(
    { finish: () => undefined, rollback: () => { calls.push('rollback'); throw rollbackError; } } as never,
    { onAfterDrag: () => { calls.push('consumer'); throw consumerError; } },
    { status: 'cancelled', reason: 'escape' },
  ), rollbackError);
  assert.deepEqual(calls, ['rollback', 'consumer']);
});

test('real Core reports a consumer after-drag error after restoring uncommitted controlled state', () => {
  const consumerError = new Error('consumer failed');
  const fixture = uncommittedReactTransfer({
    onAfterDrag: () => { throw consumerError; },
  });

  fixture.transfer();

  assert.deepEqual(fixture.itemIds(), { todo: ['a', 'b'], done: ['c'] });
  assert.deepEqual(fixture.afterResults.map((result) => result.reason), ['state-not-committed']);
  assert.deepEqual(fixture.errors, [consumerError]);
});

test('real Core continues rollback restores before one consumer after-drag callback when a restore setter throws', () => {
  const rollbackError = new Error('todo restore failed');
  const fixture = uncommittedReactTransfer({ rollbackError });

  fixture.transfer();

  assert.deepEqual(fixture.setterCalls, [
    'todo:a',
    'done:b,c',
    'todo:a,b',
    'done:c',
  ]);
  assert.equal(fixture.afterResults.length, 1);
  assert.deepEqual(fixture.errors, [rollbackError]);
});

test('real Core preserves the first rollback error when its consumer after-drag callback also throws', () => {
  const rollbackError = new Error('todo restore failed');
  const consumerError = new Error('consumer failed');
  const fixture = uncommittedReactTransfer({
    rollbackError,
    onAfterDrag: () => { throw consumerError; },
  });

  fixture.transfer();

  assert.deepEqual(fixture.setterCalls, [
    'todo:a',
    'done:b,c',
    'todo:a,b',
    'done:c',
  ]);
  assert.equal(fixture.afterResults.length, 1);
  assert.deepEqual(fixture.errors, [rollbackError]);
});

test('before consumer activation validates every controlled binding structural count', () => {
  let scopeOptions: import('../../../src/core.js').SortableScopeOptions = {};
  let consumerCalls = 0;
  const controller = createReactSortableController<Task>({
    getRootProps: () => ({ onBeforeDragStart: () => { consumerCalls += 1; } }),
    createScope: (options) => {
      scopeOptions = options;
      return {
        registerArea: () => () => undefined,
        updateArea: () => undefined,
        cancel: () => undefined,
        destroy: () => undefined,
      };
    },
  });
  const source = renderedArea('todo', 'tasks', [{ id: 'a' }]);
  const destination = renderedArea('done', 'tasks', [{ id: 'b' }], { renderedItemCount: 0 });
  controller.registerArea(source.getElement() as Element, source, {
    areaId: 'todo', group: 'tasks', item: ':scope > *', getItemId: () => 'a',
  });
  controller.registerArea(destination.getElement() as Element, destination, {
    areaId: 'done', group: 'tasks', item: ':scope > *', getItemId: () => 'b',
  });

  assert.throws(() => scopeOptions.onBeforeDragStart?.(dragContext()), hasCode('INVALID_ELEMENT'));
  assert.equal(consumerCalls, 0);
});

test('real Core activation reports a destination controlled/DOM mismatch before consumer callbacks', () => {
  for (const placeholderOnly of [false, true]) {
    const platform = fakePlatform();
    const errors: unknown[] = [];
    let beforeCalls = 0;
    let changeCalls = 0;
    let afterCalls = 0;
    let setterCalls = 0;
    const controller = createReactSortableController<Task>({
      getRootProps: () => ({
        onBeforeDragStart: () => { beforeCalls += 1; },
        onChange: () => { changeCalls += 1; },
        onAfterDrag: () => { afterCalls += 1; },
        onError: (error) => errors.push(error),
      }),
      createScope: (options) => createSortableScopeInternal(options, platform),
    });
    const sourceArea = fakeElement('UL', { ownerDocument: platform.document, selectors: [':scope > *'] });
    const source = fakeElement('LI', { ownerDocument: platform.document, selectors: [':scope > *'] });
    sourceArea.appendChild(source);
    const destinationArea = fakeElement('UL', { ownerDocument: platform.document, selectors: [':scope > *'] });
    if (placeholderOnly) {
      destinationArea.appendChild(fakeElement('LI', {
        ownerDocument: platform.document,
        attributes: { 'data-comins-sortable-placeholder': '' },
      }));
    }
    const sourceBinding = {
      areaId: 'todo', group: 'tasks', getItems: () => [{ id: 'a' }],
      getItemId: (item: Task) => item.id, setItems: () => { setterCalls += 1; },
      getElement: () => sourceArea as Element,
    };
    const destinationBinding = {
      areaId: 'done', group: 'tasks', getItems: () => [{ id: 'b' }],
      getItemId: (item: Task) => item.id, setItems: () => { setterCalls += 1; },
      getElement: () => destinationArea as Element,
    };
    controller.registerArea(sourceArea, sourceBinding, { areaId: 'todo', group: 'tasks', item: ':scope > *', getItemId: () => 'a' });
    controller.registerArea(destinationArea, destinationBinding, { areaId: 'done', group: 'tasks', item: ':scope > *', getItemId: () => 'b' });
    const down = pointer({ target: source, clientX: 1, clientY: 1 });
    platform.setHits([source, sourceArea]);
    sourceArea.dispatch('pointerdown', down);
    platform.dispatchDocument('pointermove', pointer({ ...down, target: source, clientX: 5 }));
    platform.flushFrame();

    assert.equal(errors.length, 1);
    assert.equal((errors[0] as { code?: string }).code, 'INVALID_ELEMENT');
    assert.equal(beforeCalls, 0);
    assert.equal(setterCalls, 0);
    assert.equal(changeCalls, 0);
    assert.equal(afterCalls, 0);
  }
});

test('public components SSR-render only a provider and one direct area div without DOM globals', () => {
  const markup = renderToStaticMarkup(
    createElement(
      SortableRoot<Task>,
      null,
      createElement(SortableArea<Task>, {
        areaId: 'todo',
        items: [{ id: 'a' }],
        itemKey: 'id',
        onItemsChange: () => undefined,
        children: (item) => createElement('span', null, item.id),
      }),
    ),
  );

  assert.equal(markup, '<div data-comins-sortable-area="todo"><span>a</span></div>');
});

function lifecycleController(calls: string[]): ReactSortableController<Task> {
  return {
    registerArea(_element, _binding, options) {
      calls.push(`register:${options.areaId}`);
      return () => calls.push(`unregister:${options.areaId}`);
    },
    updateArea(areaId) {
      calls.push(`update:${areaId}`);
    },
    destroy() {
      calls.push('destroy');
    },
  };
}

function areaElement(element: Element): HTMLDivElement {
  return element as unknown as HTMLDivElement;
}

function uncommittedReactTransfer(options: {
  rollbackError?: Error;
  onAfterDrag?: (result: import('../../../src/core.js').AfterDragResult) => void;
} = {}): {
  afterResults: import('../../../src/core.js').AfterDragResult[];
  errors: unknown[];
  itemIds(): { todo: readonly string[]; done: readonly string[] };
  setterCalls: string[];
  transfer(): void;
} {
  const platform = fakePlatform();
  const setterCalls: string[] = [];
  const errors: unknown[] = [];
  const afterResults: import('../../../src/core.js').AfterDragResult[] = [];
  let todoItems: readonly Task[] = [{ id: 'a' }, { id: 'b' }];
  let doneItems: readonly Task[] = [{ id: 'c' }];
  const sourceArea = sortableArea(platform, 0, ['a', 'b']);
  const destinationArea = sortableArea(platform, 200, ['c']);
  const controller = createReactSortableController<Task>({
    getRootProps: () => ({
      onAfterDrag: (result) => {
        afterResults.push(result);
        options.onAfterDrag?.(result);
      },
      onError: (error) => errors.push(error),
    }),
    createScope: (scopeOptions) => createSortableScopeInternal(scopeOptions, platform),
  });
  const setItems = (areaId: 'todo' | 'done', items: readonly Task[]): void => {
    setterCalls.push(`${areaId}:${items.map((item) => item.id).join(',')}`);
    if (areaId === 'todo' && items.length === 2 && options.rollbackError !== undefined) {
      throw options.rollbackError;
    }
    if (areaId === 'todo') {
      todoItems = items;
    } else {
      doneItems = items;
    }
  };
  const register = (
    areaId: 'todo' | 'done',
    element: Element,
    getItems: () => readonly Task[],
  ): void => {
    controller.registerArea(element, {
      areaId,
      group: 'tasks',
      getItems,
      getItemId: (item) => item.id,
      setItems: (items) => setItems(areaId, items),
      getElement: () => element,
    }, {
      areaId,
      group: 'tasks',
      item: ':scope > *',
      getItemId: (element) => element.getAttribute('data-sortable-id') as string,
    });
  };
  register('todo', sourceArea, () => todoItems);
  register('done', destinationArea, () => doneItems);

  return {
    afterResults,
    errors,
    itemIds: () => ({
      todo: todoItems.map((item) => item.id),
      done: doneItems.map((item) => item.id),
    }),
    setterCalls,
    transfer() {
      const source = sourceArea.fixtureChildren[1] as Element;
      const destination = destinationArea.fixtureChildren[0] as Element;
      const down = pointer({ target: source, clientX: 10, clientY: 40 });
      platform.setHits([source, sourceArea]);
      sourceArea.dispatch('pointerdown', down);
      platform.dispatchDocument('pointermove', pointer({ ...down, target: source, clientX: 14 }));
      platform.flushFrame();
      platform.setHits([destination, destinationArea]);
      platform.dispatchDocument('pointermove', pointer({
        ...down,
        target: destination,
        clientX: 210,
        clientY: 1,
      }));
      platform.flushFrame();
      platform.dispatchDocument('pointerup', pointer({
        ...down,
        target: destination,
        clientX: 210,
        clientY: 1,
      }));
      platform.flushFrame();
    },
  };
}

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
        left,
        top: index * 30,
        right: left + 100,
        bottom: index * 30 + 20,
        width: 100,
        height: 20,
      },
      selectors: [':scope > *'],
    }));
  });
  return area;
}
