import assert from 'node:assert/strict';
import test from 'node:test';

import { reorder, transfer } from '../../../src/core.js';
import {
  buildCopyChange,
  buildMultiReorderChange,
  buildMultiTransferChange,
  buildReorderChange,
  buildSwapChange,
  buildTransferChange,
} from '../../../src/core/operations.js';

test('reorder returns a new affected order without mutating input', () => {
  const input = Object.freeze(['a', 'b', 'c']);

  const result = reorder(input, 0, 2);

  assert.deepEqual(result, ['b', 'c', 'a']);
  assert.deepEqual(input, ['a', 'b', 'c']);
  assert.notEqual(result, input);
});

test('reorder preserves the original reference for a no-op', () => {
  const input = ['a', 'b'];

  assert.equal(reorder(input, 1, 1), input);
});

test('transfer removes source and inserts at destination index zero', () => {
  const source = ['a', 'b'];
  const destination: string[] = [];

  const result = transfer(source, destination, 1, 0);

  assert.deepEqual(result.sourceItems, ['a']);
  assert.deepEqual(result.destinationItems, ['b']);
  assert.deepEqual(source, ['a', 'b']);
  assert.deepEqual(destination, []);
  assert.notEqual(result.sourceItems, source);
  assert.notEqual(result.destinationItems, destination);
});

test('transfer accepts the insertion position after the final destination item', () => {
  const result = transfer(['a'], ['b', 'c'], 0, 2);

  assert.deepEqual(result.sourceItems, []);
  assert.deepEqual(result.destinationItems, ['b', 'c', 'a']);
});

test('helpers reject non-integer and out-of-range indexes', () => {
  assert.throws(() => reorder(['a'], -1, 0), RangeError);
  assert.throws(() => reorder(['a'], 0, 1), RangeError);
  assert.throws(() => reorder(['a'], 0.5, 0), RangeError);
  assert.throws(() => transfer([], [], 0, 0), RangeError);
  assert.throws(() => transfer(['a'], [], 0, 1), RangeError);
});

test('reorder change builder emits one affected order', () => {
  const change = buildReorderChange(
    ['a', 'b', 'c'],
    { areaId: 'todo', index: 0 },
    { areaId: 'todo', index: 2 },
  );

  assert.deepEqual(change, {
    operation: 'reorder',
    itemId: 'a',
    source: { areaId: 'todo', index: 0 },
    destination: { areaId: 'todo', index: 2 },
    orders: [{ areaId: 'todo', itemIds: ['b', 'c', 'a'] }],
  });
});

test('reorder change builder suppresses a same-area no-op', () => {
  const location = { areaId: 'todo', index: 1 };

  assert.equal(buildReorderChange(['a', 'b'], location, location), null);
});

test('transfer change builder emits source then destination orders', () => {
  const change = buildTransferChange(
    ['a', 'b'],
    ['c'],
    { areaId: 'todo', index: 1 },
    { areaId: 'done', index: 0 },
  );

  assert.deepEqual(change, {
    operation: 'transfer',
    itemId: 'b',
    source: { areaId: 'todo', index: 1 },
    destination: { areaId: 'done', index: 0 },
    orders: [
      { areaId: 'todo', itemIds: ['a'] },
      { areaId: 'done', itemIds: ['b', 'c'] },
    ],
  });
});

test('copy change builder preserves the source and inserts the copied item ID', () => {
  const change = buildCopyChange(
    ['a', 'b'],
    ['c'],
    { areaId: 'todo', index: 1 },
    { areaId: 'done', index: 0 },
    'b-copy',
  );

  assert.deepEqual(change, {
    operation: 'copy',
    sourceItemId: 'b',
    itemId: 'b-copy',
    source: { areaId: 'todo', index: 1 },
    destination: { areaId: 'done', index: 0 },
    orders: [
      { areaId: 'todo', itemIds: ['a', 'b'] },
      { areaId: 'done', itemIds: ['b-copy', 'c'] },
    ],
  });
});

test('multi reorder moves selected IDs together in their original order', () => {
  const change = buildMultiReorderChange(
    ['a', 'b', 'c', 'd', 'e'],
    ['b', 'd'],
    { areaId: 'todo', index: 1 },
    { areaId: 'todo', index: 3 },
  );

  assert.deepEqual(change, {
    operation: 'reorder',
    itemId: 'b',
    itemIds: ['b', 'd'],
    source: { areaId: 'todo', index: 1 },
    destination: { areaId: 'todo', index: 3 },
    orders: [{ areaId: 'todo', itemIds: ['a', 'c', 'e', 'b', 'd'] }],
  });
});

test('multi transfer removes and inserts all selected IDs as one ordered group', () => {
  const change = buildMultiTransferChange(
    ['a', 'b', 'c', 'd'],
    ['x', 'y'],
    ['b', 'd'],
    { areaId: 'todo', index: 1 },
    { areaId: 'done', index: 1 },
  );

  assert.deepEqual(change, {
    operation: 'transfer',
    itemId: 'b',
    itemIds: ['b', 'd'],
    source: { areaId: 'todo', index: 1 },
    destination: { areaId: 'done', index: 1 },
    orders: [
      { areaId: 'todo', itemIds: ['a', 'c'] },
      { areaId: 'done', itemIds: ['x', 'b', 'd', 'y'] },
    ],
  });
});

test('swap change exchanges the dragged and target positions without insertion sorting', () => {
  const change = buildSwapChange(
    ['a', 'b', 'c', 'd'],
    { areaId: 'todo', index: 0 },
    { areaId: 'todo', index: 3 },
  );

  assert.deepEqual(change, {
    operation: 'swap',
    itemId: 'a',
    swapItemId: 'd',
    source: { areaId: 'todo', index: 0 },
    destination: { areaId: 'todo', index: 3 },
    orders: [{ areaId: 'todo', itemIds: ['d', 'b', 'c', 'a'] }],
  });
});
