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
import { hasCode } from '../helpers/core-fixtures.js';

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

function copyChange() {
  return {
    operation: 'copy' as const,
    sourceItemId: 'a',
    itemId: 'a-copy',
    source: { areaId: 'todo', index: 0 },
    destination: { areaId: 'done', index: 1 },
    orders: [
      { areaId: 'todo', itemIds: ['a'] },
      { areaId: 'done', itemIds: ['c', 'a-copy'] },
    ],
  };
}

const copyContext = {
  itemId: 'a',
  source: { areaId: 'todo', index: 0 },
  destination: { areaId: 'done', index: 1 },
  pointer: {
    type: 'mouse' as const,
    clientX: 10,
    clientY: 10,
    deltaX: 10,
    deltaY: 10,
    altKey: false,
    ctrlKey: false,
    metaKey: false,
    shiftKey: false,
  },
};

test('copy prepares one typed item and updates only the destination binding', () => {
  const registry = new BindingRegistry<{ id: string }>();
  const source = [{ id: 'a' }];
  let todo = source;
  let done = [{ id: 'c' }];
  const calls: string[] = [];
  registry.register({
    ...renderedArea('todo', 'tasks', todo),
    getItems: () => todo,
    setItems: (items) => {
      todo = items as { id: string }[];
      calls.push('todo:set');
    },
    copyItem: (context) => ({ id: `${String(context.itemId)}-copy` }),
  });
  registry.register({
    ...renderedArea('done', 'tasks', done),
    getItems: () => done,
    setItems: (items) => {
      done = items as { id: string }[];
      calls.push(`done:${ids(items).join(',')}`);
    },
  });
  const transaction = new ControlledTransaction(registry, (change) => {
    calls.push(`root:${change.operation}`);
  });

  assert.equal(transaction.prepareCopy('todo', copyContext), 'a-copy');
  const enhanced = transaction.apply(copyChange());

  assert.equal(todo, source);
  assert.deepEqual(done, [{ id: 'c' }, { id: 'a-copy' }]);
  assert.deepEqual(calls, ['done:c,a-copy', 'root:copy']);
  assert.deepEqual(enhanced.updates, [{ areaId: 'done', items: done }]);
});

test('missing, throwing, and duplicate copy factories do not mutate bindings', () => {
  for (const copyItem of [
    undefined,
    () => { throw new Error('copy failed'); },
    () => ({ id: 'c' }),
  ]) {
    const registry = new BindingRegistry<{ id: string }>();
    const todo = [{ id: 'a' }];
    const done = [{ id: 'c' }];
    const calls: string[] = [];
    registry.register({
      ...renderedArea('todo', 'tasks', todo),
      ...(copyItem === undefined ? {} : { copyItem }),
      setItems: () => calls.push('todo:set'),
    });
    registry.register({
      ...renderedArea('done', 'tasks', done),
      setItems: () => calls.push('done:set'),
    });
    const transaction = new ControlledTransaction(registry, () => calls.push('root'));

    assert.throws(() => transaction.prepareCopy('todo', copyContext));
    assert.deepEqual(calls, []);
  }
});

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

test('apply rejects current duplicate group IDs before setters or root callback and reads affected arrays once', () => {
  const registry = new BindingRegistry<{ id: string }>();
  let todo: readonly { id: string }[] = [{ id: 'a' }, { id: 'b' }];
  let done: readonly { id: string }[] = [{ id: 'c' }];
  let todoReads = 0;
  let doneReads = 0;
  const calls: string[] = [];
  registry.register({
    ...renderedArea('todo', 'tasks', todo),
    getItems: () => {
      todoReads += 1;
      return todo;
    },
    setItems: (items) => {
      calls.push('todo:set');
      todo = items;
    },
  });
  registry.register({
    ...renderedArea('done', 'tasks', done),
    getItems: () => {
      doneReads += 1;
      return done;
    },
    setItems: (items) => {
      calls.push('done:set');
      done = items;
    },
  });
  todo = [{ id: 'a' }, { id: 'a' }];
  todoReads = 0;
  doneReads = 0;
  const transaction = new ControlledTransaction(registry, () => calls.push('root'));

  assert.throws(() => transaction.apply(transferChange()), hasCode('DUPLICATE_ITEM_ID'));
  assert.deepEqual(calls, []);
  assert.equal(todoReads, 1);
  assert.equal(doneReads, 1);
  transaction.rollback();
  assert.deepEqual(todo, [{ id: 'a' }, { id: 'a' }]);
  assert.deepEqual(done, [{ id: 'c' }]);
});

test('apply and rollback keep snapshot bindings when a setter replaces another registered area', () => {
  const registry = new BindingRegistry<{ id: string }>();
  let todo = [{ id: 'a' }, { id: 'b' }];
  let originalDone = [{ id: 'c' }];
  let replacementDone = [{ id: 'replacement' }];
  let replaceDone = true;
  const oldDone = {
    ...renderedArea('done', 'tasks', originalDone),
    getItems: () => originalDone,
    setItems: (items: readonly { id: string }[]) => {
      originalDone = items as { id: string }[];
    },
  };
  registry.register({
    ...renderedArea('todo', 'tasks', todo),
    getItems: () => todo,
    setItems: (items) => {
      todo = items as { id: string }[];
      if (replaceDone) {
        replaceDone = false;
        registry.unregister('done');
        registry.register({
          ...renderedArea('done', 'tasks', replacementDone),
          getItems: () => replacementDone,
          setItems: (next) => {
            replacementDone = next as { id: string }[];
          },
        });
      }
    },
  });
  registry.register(oldDone);
  const transaction = new ControlledTransaction(registry, () => {
    throw new Error('root callback failed');
  });

  assert.throws(() => transaction.apply(transferChange()), /root callback failed/);
  assert.deepEqual(todo, [{ id: 'a' }, { id: 'b' }]);
  assert.deepEqual(originalDone, [{ id: 'c' }]);
  assert.deepEqual(replacementDone, [{ id: 'replacement' }]);
});

test('rollback continues after a restoration setter failure and preserves the apply error', () => {
  const registry = new BindingRegistry<{ id: string }>();
  let todo = [{ id: 'a' }, { id: 'b' }];
  let done = [{ id: 'c' }];
  let todoSetCalls = 0;
  registry.register({
    ...renderedArea('todo', 'tasks', todo),
    getItems: () => todo,
    setItems: (items) => {
      todoSetCalls += 1;
      todo = items as { id: string }[];
      if (todoSetCalls === 2) {
        throw new Error('todo rollback failed');
      }
    },
  });
  registry.register({
    ...renderedArea('done', 'tasks', done),
    getItems: () => done,
    setItems: (items) => {
      done = items as { id: string }[];
    },
  });
  const transaction = new ControlledTransaction(registry, () => {
    throw new Error('root callback failed');
  });

  assert.throws(() => transaction.apply(transferChange()), /root callback failed/);
  assert.deepEqual(done, [{ id: 'c' }]);
  assert.equal(todoSetCalls, 2);
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
