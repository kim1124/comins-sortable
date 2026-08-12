import assert from 'node:assert/strict';
import test from 'node:test';

import { BindingRegistry } from '../../../src/framework/bindings.js';
import { ControlledTransaction } from '../../../src/framework/controlled-transaction.js';
import {
  controlledFixture,
  ids,
  renderedArea,
  throwingControlledFixture,
} from '../helpers/framework-fixtures.js';

function transferChange() {
  return {
    operation: 'transfer' as const,
    itemId: 'b',
    source: { areaId: 'todo', index: 1 },
    destination: { areaId: 'done', index: 1 },
    orders: [
      { areaId: 'todo', itemIds: ['a'] },
      { areaId: 'done', itemIds: ['c', 'b'] },
    ],
  };
}

test('transfer updates both affected areas once in change order and emits one enhanced change', () => {
  const calls: string[] = [];
  const fixture = controlledFixture({
    todo: {
      items: [{ id: 'a' }, { id: 'b' }],
      setItems: (items) => calls.push(`todo:${ids(items).join(',')}`),
    },
    done: {
      items: [{ id: 'c' }],
      setItems: (items) => calls.push(`done:${ids(items).join(',')}`),
    },
    onChange: (change) => {
      calls.push(`root:${change.operation}`);
      assert.deepEqual(change.updates.map((entry) => entry.areaId), ['todo', 'done']);
      assert.deepEqual(change.updates.map((entry) => ids(entry.items)), [['a'], ['c', 'b']]);
    },
  });

  fixture.transaction.apply(transferChange());

  assert.deepEqual(calls, ['todo:a', 'done:c,b', 'root:transfer']);
});

test('reorder updates only its single affected area', () => {
  const calls: string[] = [];
  const fixture = controlledFixture({
    todo: {
      items: [{ id: 'a' }, { id: 'b' }],
      setItems: (items) => calls.push(ids(items).join(',')),
    },
  });

  fixture.transaction.apply({
    operation: 'reorder',
    itemId: 'b',
    source: { areaId: 'todo', index: 1 },
    destination: { areaId: 'todo', index: 0 },
    orders: [{ areaId: 'todo', itemIds: ['b', 'a'] }],
  });

  assert.deepEqual(calls, ['b,a']);
});

test('partial setter failure restores every affected original array', () => {
  const fixture = throwingControlledFixture();

  assert.throws(() => fixture.transaction.apply(fixture.change));

  assert.deepEqual(fixture.todo, [{ id: 'a' }, { id: 'b' }]);
  assert.deepEqual(fixture.done, [{ id: 'c' }]);
});

test('root callback failure restores every affected original array', () => {
  const fixture = controlledFixture({
    todo: { items: [{ id: 'a' }, { id: 'b' }] },
    done: { items: [{ id: 'c' }] },
    onChange: () => {
      throw new Error('root callback failed');
    },
  });

  assert.throws(() => fixture.transaction.apply(transferChange()), /root callback failed/);
  assert.deepEqual(fixture.todo, [{ id: 'a' }, { id: 'b' }]);
  assert.deepEqual(fixture.done, [{ id: 'c' }]);
});

test('finish and destroy discard retained originals so later rollback does not overwrite state', () => {
  const finished = controlledFixture({
    todo: { items: [{ id: 'a' }, { id: 'b' }] },
    done: { items: [{ id: 'c' }] },
  });
  finished.transaction.apply(transferChange());
  finished.transaction.finish();
  finished.transaction.rollback();
  assert.deepEqual(finished.todo, [{ id: 'a' }]);
  assert.deepEqual(finished.done, [{ id: 'c' }, { id: 'b' }]);

  const destroyed = controlledFixture({
    todo: { items: [{ id: 'a' }, { id: 'b' }] },
    done: { items: [{ id: 'c' }] },
  });
  destroyed.transaction.apply(transferChange());
  destroyed.transaction.destroy();
  destroyed.transaction.rollback();
  assert.deepEqual(destroyed.todo, [{ id: 'a' }]);
  assert.deepEqual(destroyed.done, [{ id: 'c' }, { id: 'b' }]);
});

test('confirm validates framework item order once and rejects missing or structurally stale renders', () => {
  const registry = new BindingRegistry<{ id: string }>();
  let reads = 0;
  registry.register({
    ...renderedArea('todo', 'tasks', [{ id: 'a' }, { id: 'b' }]),
    getItems: () => {
      reads += 1;
      return [{ id: 'a' }, { id: 'b' }];
    },
  });
  reads = 0;
  const transaction = new ControlledTransaction(registry, () => undefined);
  const change = {
    operation: 'reorder' as const,
    itemId: 'b',
    source: { areaId: 'todo', index: 1 },
    destination: { areaId: 'todo', index: 0 },
    orders: [{ areaId: 'todo', itemIds: ['a', 'b'] }],
  };

  assert.equal(transaction.confirm(change), true);
  assert.equal(reads, 1);

  const missingElement = new BindingRegistry<{ id: string }>();
  missingElement.register({
    ...renderedArea('todo', 'tasks', [{ id: 'a' }, { id: 'b' }]),
    getElement: () => null,
  });
  assert.equal(new ControlledTransaction(missingElement, () => undefined).confirm(change), false);

  const staleRender = new BindingRegistry<{ id: string }>();
  staleRender.register(renderedArea('todo', 'tasks', [{ id: 'a' }, { id: 'b' }], {
    renderedItemCount: 1,
    placeholderCount: 1,
  }));
  assert.equal(new ControlledTransaction(staleRender, () => undefined).confirm(change), false);
});
