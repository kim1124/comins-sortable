import assert from 'node:assert/strict';
import test from 'node:test';

import { resolveDirection, snapshotRect } from '../../../src/core/geometry.js';
import { fakeElement, rectItem } from '../helpers/core-fixtures.js';

test('snapshotRect copies a structural element rectangle without a DOM global', () => {
  const element = fakeElement('DIV', {
    rect: { left: 3, top: 5, right: 43, bottom: 20, width: 40, height: 15 },
  });

  assert.deepEqual(snapshotRect(element), {
    left: 3,
    top: 5,
    right: 43,
    bottom: 20,
    width: 40,
    height: 15,
  });
});

test('resolveDirection preserves explicit vertical and horizontal directions', () => {
  const items = [rectItem('a', 0, 0, 40, 20), rectItem('b', 80, 0, 40, 20)];

  assert.equal(resolveDirection('vertical', items), 'vertical');
  assert.equal(resolveDirection('horizontal', items), 'horizontal');
});

test('resolveDirection chooses the larger center delta for auto direction', () => {
  assert.equal(
    resolveDirection('auto', [rectItem('a', 0, 0, 100, 10), rectItem('b', 0, 50, 10, 150)]),
    'vertical',
  );
  assert.equal(
    resolveDirection('auto', [rectItem('a', 0, 0, 20, 20), rectItem('b', 80, 10, 20, 20)]),
    'horizontal',
  );
});

test('resolveDirection uses vertical for fewer than two items and tied deltas', () => {
  assert.equal(resolveDirection('auto', [rectItem('a', 0, 0, 20, 20)]), 'vertical');
  assert.equal(
    resolveDirection('auto', [rectItem('a', 0, 0, 20, 20), rectItem('b', 20, 20, 20, 20)]),
    'vertical',
  );
});
