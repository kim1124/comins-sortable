import assert from 'node:assert/strict';
import test from 'node:test';
import type { ReactElement } from 'react';

import {
  doneProps,
  reactAdapterHarness,
  todoProps,
  type Task,
} from '../helpers/framework-fixtures.js';
import { itemIdForElement } from '../../../src/react/SortableArea.js';
import { hasCode } from '../helpers/core-fixtures.js';
import type { SortableAreaProps } from '../../../src/react.js';

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
    { current: area },
    {
      current: {
        areaId: 'todo',
        items: [{ id: 'a' }],
        itemKey: 'id',
        onItemsChange: () => undefined,
        children: () => ({}) as ReactElement,
      } satisfies SortableAreaProps<Task>,
    },
  );

  assert.throws(() => getItemId(child), hasCode('INVALID_ELEMENT'));
});
