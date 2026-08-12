import assert from 'node:assert/strict';
import test from 'node:test';

import { createDomTransaction } from '../../../src/vanilla/dom-transaction.js';
import { domFixture } from '../helpers/core-fixtures.js';

function transferChange(
  itemId: string,
  sourceAreaId: string,
  sourceIndex: number,
  destinationAreaId: string,
  destinationIndex: number,
) {
  return {
    operation: 'transfer' as const,
    itemId,
    source: { areaId: sourceAreaId, index: sourceIndex },
    destination: { areaId: destinationAreaId, index: destinationIndex },
    orders: [
      { areaId: sourceAreaId, itemIds: ['a'] },
      { areaId: destinationAreaId, itemIds: ['c', itemId] },
    ],
  };
}

test('DOM transaction commits source at placeholder position', () => {
  const fixture = domFixture({
    todo: ['a', 'b'],
    done: ['c'],
  });
  const transaction = createDomTransaction(fixture.registry);

  transaction.apply(transferChange('b', 'todo', 1, 'done', 1));

  assert.deepEqual(fixture.ids('todo'), ['a']);
  assert.deepEqual(fixture.ids('done'), ['c', 'b']);
});

test('DOM transaction restores original parent and sibling', () => {
  const fixture = domFixture({ todo: ['a', 'b'], done: ['c'] });
  const transaction = createDomTransaction(fixture.registry);

  transaction.apply(transferChange('b', 'todo', 1, 'done', 1));
  transaction.rollback();

  assert.deepEqual(fixture.ids('todo'), ['a', 'b']);
  assert.deepEqual(fixture.ids('done'), ['c']);
});
