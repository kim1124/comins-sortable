import assert from 'node:assert/strict';
import test from 'node:test';

import {
  applyDemoChange,
  copyDemoItem,
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
    todo: ['research', 'design'],
    done: [],
  });
  assert.notDeepEqual(first, second);
});

test('copy changes preserve the source and insert a deterministic cloned item', () => {
  const state = createDemoState('clone');
  const next = applyDemoChange(state, {
    operation: 'copy',
    sourceItemId: 'design',
    itemId: 'design-copy-1',
    source: { areaId: 'todo', index: 1 },
    destination: { areaId: 'done', index: 0 },
    orders: [
      { areaId: 'todo', itemIds: ['research', 'design', 'build'] },
      { areaId: 'done', itemIds: ['design-copy-1', 'review'] },
    ],
  });

  assert.deepEqual(next.todo.map((item) => item.id), ['research', 'design', 'build']);
  assert.deepEqual(next.done.map((item) => item.id), ['design-copy-1', 'review']);
  assert.equal(next.done[0]?.title, 'Design');
  assert.notEqual(next.done[0], state.todo[1]);
  assert.deepEqual(state.done.map((item) => item.id), ['review']);
});

test('custom clone derives presentation without mutating its catalog item', () => {
  const state = createDemoState('custom-clone');
  const source = state.todo[1]!;
  const copy = copyDemoItem(source, 'custom-clone', 1);

  assert.deepEqual(copy, {
    ...source,
    id: 'design-copy-1',
    title: 'Design Copy',
    detail: 'Customized clone',
  });
  assert.equal(source.title, 'Design');
  assert.equal(source.detail, 'Interaction system');
});

test('nested transfers update root and child collections immutably', () => {
  const state = createDemoState('nested-controlled');
  const next = applyDemoChange(state, {
    operation: 'transfer',
    itemId: 'design',
    source: { areaId: 'todo', index: 1 },
    destination: { areaId: 'child', index: 1 },
    orders: [
      { areaId: 'todo', itemIds: ['research', 'build'] },
      { areaId: 'child', itemIds: ['review', 'design', 'release'] },
    ],
  });

  assert.deepEqual(next.todo.map((item) => item.id), ['research', 'build']);
  assert.deepEqual(next.child.map((item) => item.id), ['review', 'design', 'release']);
  assert.deepEqual(state.todo.map((item) => item.id), ['research', 'design', 'build']);
  assert.deepEqual(state.child.map((item) => item.id), ['review', 'release']);
});
