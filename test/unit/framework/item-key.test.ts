import assert from 'node:assert/strict';
import test from 'node:test';

import { resolveItemIds } from '../../../src/framework/item-key.js';
import { hasCode } from '../helpers/core-fixtures.js';

test('item key resolves property and callback IDs without deriving positions', () => {
  const items = [{ id: 'a', key: 10 }, { id: 'b', key: 20 }];

  assert.deepEqual(resolveItemIds(items, 'id'), ['a', 'b']);
  assert.deepEqual(resolveItemIds(items, (item) => item.key), [10, 20]);
});

test('item key rejects a missing item ID instead of falling back to its array index', () => {
  assert.throws(
    () => resolveItemIds([{ title: 'missing' }], 'id' as never),
    hasCode('MISSING_ITEM_ID'),
  );
});
