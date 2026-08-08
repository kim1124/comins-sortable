import assert from 'node:assert/strict';
import test from 'node:test';

import {
  GeometryCache,
  resolveDirection,
  snapshotRect,
} from '../../../src/core/geometry.js';
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

test('geometry cache measures at activation and returns snapshots without raw-frame remeasurement', () => {
  const element = fakeElement('DIV', {
    rect: { left: 3, top: 5, right: 43, bottom: 20, width: 40, height: 15 },
  });
  let reads = 0;
  element.getBoundingClientRect = () => {
    reads += 1;
    return element.rect as DOMRect;
  };
  const cache = new GeometryCache();

  cache.refreshAtActivation([{ key: 'todo', element }]);

  assert.deepEqual(cache.snapshot('todo'), {
    left: 3,
    top: 5,
    right: 43,
    bottom: 20,
    width: 40,
    height: 15,
  });
  assert.deepEqual(cache.snapshot('todo'), {
    left: 3,
    top: 5,
    right: 43,
    bottom: 20,
    width: 40,
    height: 15,
  });
  assert.equal(reads, 1);
});

test('geometry cache refreshes on area entry and only after explicit dirty reasons', () => {
  const element = fakeElement('DIV', {
    rect: { left: 0, top: 0, right: 20, bottom: 20, width: 20, height: 20 },
  });
  let reads = 0;
  element.getBoundingClientRect = () => {
    reads += 1;
    return element.rect as DOMRect;
  };
  const cache = new GeometryCache();
  const target = { key: 'todo', element };

  cache.refreshAtAreaEntry(target);
  for (const invalidate of [
    () => cache.invalidateForScroll(['todo']),
    () => cache.invalidateForResize(['todo']),
    () => cache.invalidateForFrameworkUpdate(['todo']),
    () => cache.invalidateForPlaceholderMove(['todo']),
  ]) {
    invalidate();
    assert.equal(cache.isDirty('todo'), true);
    cache.refreshDirty([target]);
    assert.equal(cache.isDirty('todo'), false);
  }

  assert.equal(reads, 5);
  cache.clear();
  assert.equal(cache.snapshot('todo'), undefined);
});
