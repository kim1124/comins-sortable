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
import { renderedArea } from '../helpers/framework-fixtures.js';
import { dragContext } from '../helpers/core-fixtures.js';

test('Strict Mode setup-cleanup-setup leaves one registration', () => {
  const harness = reactAdapterHarness<Task>();
  const firstCleanup = harness.mountArea(todoProps());
  firstCleanup();
  const secondCleanup = harness.mountArea(todoProps());
  assert.equal(harness.registrationCount('todo'), 1);
  secondCleanup();
  assert.equal(harness.registrationCount('todo'), 0);
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
