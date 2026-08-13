import assert from 'node:assert/strict';
import test from 'node:test';

import {
  applyDemoChange,
  createDemoState,
  demoModel,
} from '../../../example/src/adapters/demo-data.js';

test('two-list transfer produces hand-checked immutable orders', () => {
  const state = createDemoState('two-lists');
  const next = applyDemoChange(state, {
    operation: 'transfer',
    itemId: 'design',
    source: { areaId: 'todo', index: 1 },
    destination: { areaId: 'done', index: 1 },
    orders: [
      { areaId: 'todo', itemIds: ['research', 'build'] },
      { areaId: 'done', itemIds: ['review', 'design'] },
    ],
  });

  assert.deepEqual(next.todo.map((item) => item.id), ['research', 'build']);
  assert.deepEqual(next.done.map((item) => item.id), ['review', 'design']);
  assert.deepEqual(state.todo.map((item) => item.id), ['research', 'design', 'build']);
});

test('every visible scenario returns fresh data and a sanitized model', () => {
  const first = createDemoState('empty');
  const second = createDemoState('empty');
  first.todo.pop();

  assert.deepEqual(demoModel(second), {
    todo: ['research', 'design', 'build'],
    done: [],
  });
  assert.notDeepEqual(first, second);
});
