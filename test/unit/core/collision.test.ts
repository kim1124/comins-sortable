import assert from 'node:assert/strict';
import test from 'node:test';

import {
  findAreaAtPoint,
  insertionIndex,
  insertionIndexExcludingSource,
} from '../../../src/core/collision.js';
import { dragContext, rectArea, rectItem } from '../helpers/core-fixtures.js';

test('collision uses source-excluded midpoints for same-area reorder', () => {
  const index = insertionIndex({
    pointer: { x: 0, y: 35 },
    direction: 'vertical',
    items: [
      rectItem('b', 0, 20, 100, 20),
      rectItem('c', 0, 40, 100, 20),
    ],
  });

  assert.equal(index, 1);
});

test('same-area helper removes the source from an original ordered item list', () => {
  const index = insertionIndexExcludingSource({
    pointer: { x: 0, y: 35 },
    direction: 'vertical',
    sourceId: 'a',
    items: [
      rectItem('a', 0, 0, 100, 20),
      rectItem('b', 0, 20, 100, 20),
      rectItem('c', 0, 40, 100, 20),
    ],
  });

  assert.equal(index, 1);
});

test('collision uses variable horizontal rect midpoints across a CSS gap', () => {
  const index = insertionIndex({
    pointer: { x: 50, y: 0 },
    direction: 'horizontal',
    items: [rectItem('b', 30, 0, 20, 20), rectItem('c', 80, 0, 60, 20)],
  });

  assert.equal(index, 1);
});

test('collision inserts after an item at its midpoint and returns zero for empty areas', () => {
  assert.equal(insertionIndex({
    pointer: { x: 0, y: 30 },
    direction: 'vertical',
    items: [rectItem('b', 0, 20, 100, 20)],
  }), 1);
  assert.equal(insertionIndex({
    pointer: { x: 0, y: 30 },
    direction: 'vertical',
    items: [],
  }), 0);
});

test('empty-area fallback expands only the primary axis', () => {
  const candidate = findAreaAtPoint({
    point: { x: 50, y: 104 },
    directHits: [],
    emptyAreas: [rectArea('done', 0, 100, 100, 0)],
    emptyInsertThreshold: 8,
    sourceGroup: 'tasks',
    context: dragContext(),
  });

  assert.equal(candidate?.areaId, 'done');
  assert.equal(findAreaAtPoint({
    point: { x: 104, y: 104 },
    directHits: [],
    emptyAreas: [rectArea('done', 0, 100, 100, 0)],
    emptyInsertThreshold: 8,
    sourceGroup: 'tasks',
    context: dragContext(),
  }), undefined);
});

test('empty horizontal areas expand their zero-width axis only and reject zero-area rects', () => {
  assert.equal(findAreaAtPoint({
    point: { x: 104, y: 50 },
    directHits: [],
    emptyAreas: [rectArea('done', 100, 0, 0, 100, { direction: 'horizontal' })],
    emptyInsertThreshold: 8,
    sourceGroup: 'tasks',
    context: dragContext(),
  })?.areaId, 'done');
  assert.equal(findAreaAtPoint({
    point: { x: 0, y: 0 },
    directHits: [],
    emptyAreas: [rectArea('gone', 0, 0, 0, 0)],
    emptyInsertThreshold: 8,
    sourceGroup: 'tasks',
    context: dragContext(),
  }), undefined);
});

test('empty-area fallback applies each area threshold independently', () => {
  const narrow = {
    ...rectArea('narrow', 0, 100, 100, 0),
    emptyInsertThreshold: 2,
  };
  const wide = {
    ...rectArea('wide', 200, 100, 100, 0),
    emptyInsertThreshold: 12,
  };

  assert.equal(findAreaAtPoint({
    point: { x: 250, y: 110 },
    directHits: [],
    emptyAreas: [narrow, wide],
    emptyInsertThreshold: 0,
    sourceGroup: 'tasks',
    context: dragContext(),
  })?.areaId, 'wide');
});

test('direct hits select the deepest accepted area even when outer arrives first', () => {
  const inner = rectArea('inner', 0, 0, 100, 100, { depth: 2 });

  assert.equal(findAreaAtPoint({
    point: { x: 10, y: 10 },
    directHits: [
      rectArea('disabled', 0, 0, 100, 100, { disabled: true }),
      rectArea('other-group', 0, 0, 100, 100, { group: 'other' }),
      rectArea('rejected', 0, 0, 100, 100, { accepted: false }),
      rectArea('outer', 0, 0, 100, 100, { depth: 1 }),
      inner,
    ],
    emptyAreas: [],
    emptyInsertThreshold: 8,
    sourceGroup: 'tasks',
    context: dragContext(),
  }), inner);
});
