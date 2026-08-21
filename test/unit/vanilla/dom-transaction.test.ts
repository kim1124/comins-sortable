import assert from 'node:assert/strict';
import test from 'node:test';

import { createDomTransaction } from '../../../src/vanilla/dom-transaction.js';
import type { DomTransactionArea } from '../../../src/vanilla/dom-transaction.js';
import { domFixture, fakeElement, hasCode } from '../helpers/core-fixtures.js';

const copyContext = {
  itemId: 'b',
  source: { areaId: 'todo', index: 1 },
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

test('DOM copy transaction inserts a distinct prepared element and preserves its source', () => {
  const fixture = domFixture({ todo: ['a', 'b'], done: ['c'] });
  const registry = new Map<string, Element | DomTransactionArea>(fixture.registry);
  const sourceArea = fixture.areas.todo as Element;
  registry.set('todo', {
    element: sourceArea,
    item: '[data-sortable-id]',
    getItemId: (element: Element) => element.getAttribute('data-sortable-id') as string,
    copyElement: () => fakeElement('LI', {
      ownerDocument: sourceArea.ownerDocument,
      attributes: { 'data-sortable-id': 'b-copy' },
    }),
  });
  const transaction = createDomTransaction(registry);
  const source = fixture.areas.todo?.fixtureChildren[1];

  assert.equal(transaction.prepareCopy('todo', copyContext), 'b-copy');
  transaction.apply({
    operation: 'copy',
    sourceItemId: 'b',
    itemId: 'b-copy',
    source: copyContext.source,
    destination: copyContext.destination,
    orders: [
      { areaId: 'todo', itemIds: ['a', 'b'] },
      { areaId: 'done', itemIds: ['c', 'b-copy'] },
    ],
  });

  assert.deepEqual(fixture.ids('todo'), ['a', 'b']);
  assert.deepEqual(fixture.ids('done'), ['c', 'b-copy']);
  assert.notEqual(fixture.areas.done?.fixtureChildren[1], source);
  transaction.rollback();
  assert.deepEqual(fixture.ids('done'), ['c']);
});

test('DOM copy preparation rejects attached, mismatched, missing, and duplicate elements', () => {
  const fixture = domFixture({ todo: ['a', 'b'], done: ['c'] });
  const sourceArea = fixture.areas.todo as Element;
  const cases: Array<() => Element> = [
    () => fixture.areas.todo?.fixtureChildren[1] as Element,
    () => fakeElement('DIV', { ownerDocument: sourceArea.ownerDocument }),
    () => fakeElement('LI', {
      ownerDocument: sourceArea.ownerDocument,
      selectors: ['[data-sortable-id]'],
    }),
    () => fakeElement('LI', {
      ownerDocument: sourceArea.ownerDocument,
      attributes: { 'data-sortable-id': 'c' },
    }),
  ];

  for (const copyElement of cases) {
    const registry = new Map<string, Element | DomTransactionArea>(fixture.registry);
    registry.set('todo', {
      element: sourceArea,
      item: '[data-sortable-id]',
      getItemId: (element: Element) => element.getAttribute('data-sortable-id') as string,
      copyElement,
    });
    const transaction = createDomTransaction(registry);
    assert.throws(
      () => transaction.prepareCopy('todo', copyContext),
      (error) => hasCode('INVALID_ELEMENT')(error)
        || hasCode('MISSING_ITEM_ID')(error)
        || hasCode('DUPLICATE_ITEM_ID')(error),
    );
    assert.deepEqual(fixture.ids('todo'), ['a', 'b']);
    assert.deepEqual(fixture.ids('done'), ['c']);
  }
});
