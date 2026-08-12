import assert from 'node:assert/strict';
import test from 'node:test';

import {
  fakeElement,
  fakePlatform,
  hasCode,
  pointer,
  selectorDocument,
} from '../helpers/core-fixtures.js';

function options() {
  return {
    areaId: 'todo',
    item: '[data-sortable-id]',
  };
}

test('createSortable resolves selectors only at call time', async () => {
  const module = await import('../../../src/index.js');
  const originalDocument = globalThis.document;
  Object.defineProperty(globalThis, 'document', {
    configurable: true,
    value: selectorDocument({}),
  });

  try {
    assert.equal(typeof module.createSortable, 'function');
    assert.throws(
      () => module.createSortable('[', options()),
      hasCode('INVALID_ELEMENT'),
    );
    assert.throws(
      () => module.createSortable('#missing', options()),
      hasCode('INVALID_ELEMENT'),
    );
    const platform = fakePlatform();
    const sortable = module.createSortable(
      area(platform.document, 0, ['a']),
      options(),
    );
    assert.throws(
      () => sortable.registerArea('[', { areaId: 'done', item: '[data-sortable-id]' }),
      hasCode('INVALID_ELEMENT'),
    );
    assert.throws(
      () => sortable.registerArea('#missing', { areaId: 'done', item: '[data-sortable-id]' }),
      hasCode('INVALID_ELEMENT'),
    );
    sortable.destroy();
  } finally {
    Object.defineProperty(globalThis, 'document', {
      configurable: true,
      value: originalDocument,
    });
  }
});

test('createSortable commits DOM before the core next-frame verification', async () => {
  const { createSortable } = await import('../../../src/index.js');
  const platform = fakePlatform();
  const todo = area(platform.document, 0, ['a', 'b']);
  const done = area(platform.document, 200, ['c']);
  const results: string[] = [];
  const sortable = createSortable(todo, {
    ...options(),
    onAfterDrag: (result) => results.push(result.reason),
  });
  sortable.registerArea(done, { areaId: 'done', item: '[data-sortable-id]' });

  const source = todo.fixtureChildren[1] as Element;
  const start = pointer({
    clientX: 10,
    clientY: 40,
    target: source,
  });
  platform.setHits([source, todo]);
  todo.dispatch('pointerdown', start);
  platform.dispatchDocument('pointermove', pointer({
    ...start,
    clientX: 14,
    target: source,
  }));
  platform.flushFrame();
  const destination = done.fixtureChildren[0] as Element;
  platform.setHits([destination, done]);
  platform.dispatchDocument('pointermove', pointer({
    clientX: 210,
    clientY: 1,
    target: destination,
  }));
  platform.flushFrame();
  platform.dispatchDocument('pointerup', pointer({
    clientX: 210,
    clientY: 1,
    target: destination,
  }));
  platform.flushFrame();

  assert.deepEqual(ids(todo), ['a']);
  assert.deepEqual(ids(done), ['b', 'c']);
  assert.deepEqual(results, ['drop']);
});

test('createSortable restores the source before after-drag after a user onChange error', async () => {
  const { createSortable } = await import('../../../src/index.js');
  const platform = fakePlatform();
  const todo = area(platform.document, 0, ['a', 'b']);
  const done = area(platform.document, 200, ['c']);
  const observed: string[] = [];
  const sortable = createSortable(todo, {
    ...options(),
    onChange: () => { throw new Error('consumer failure'); },
    onAfterDrag: () => observed.push([...ids(todo), ...ids(done)].join(',')),
    onError: () => {},
  });
  sortable.registerArea(done, { areaId: 'done', item: '[data-sortable-id]' });

  const source = todo.fixtureChildren[1] as Element;
  const start = pointer({ clientX: 10, clientY: 40, target: source });
  platform.setHits([source, todo]);
  todo.dispatch('pointerdown', start);
  platform.dispatchDocument('pointermove', pointer({ ...start, clientX: 14, target: source }));
  platform.flushFrame();
  const destination = done.fixtureChildren[0] as Element;
  platform.setHits([destination, done]);
  platform.dispatchDocument('pointermove', pointer({
    clientX: 210,
    clientY: 1,
    target: destination,
  }));
  platform.flushFrame();
  platform.dispatchDocument('pointerup', pointer({
    clientX: 210,
    clientY: 1,
    target: destination,
  }));

  assert.deepEqual(ids(todo), ['a', 'b']);
  assert.deepEqual(ids(done), ['c']);
  assert.deepEqual(observed, ['a,b,c']);
});

test('createSortable restores the source before after-drag when next-frame DOM order mismatches', async () => {
  const { createSortable } = await import('../../../src/index.js');
  const platform = fakePlatform();
  const todo = area(platform.document, 0, ['a', 'b']);
  const done = area(platform.document, 200, ['c']);
  const observed: string[] = [];
  const source = todo.fixtureChildren[1] as Element;
  const sortable = createSortable(todo, {
    ...options(),
    onChange: () => done.appendChild(source),
    onAfterDrag: (result) => {
      observed.push(`${result.reason}:${[...ids(todo), ...ids(done)].join(',')}`);
    },
  });
  sortable.registerArea(done, { areaId: 'done', item: '[data-sortable-id]' });

  transfer(platform, todo, done);

  assert.deepEqual(ids(todo), ['a', 'b']);
  assert.deepEqual(ids(done), ['c']);
  assert.deepEqual(observed, ['state-not-committed:a,b,c']);
});

test('createSortable uses updateArea custom identity and selector for DOM transactions', async () => {
  const { createSortable } = await import('../../../src/index.js');
  const platform = fakePlatform();
  const todo = area(platform.document, 0, ['a', 'b']);
  const done = area(platform.document, 200, ['c']);
  const itemId = (element: Element) => element.getAttribute('data-key') as string;
  for (const item of [...todo.fixtureChildren, ...done.fixtureChildren]) {
    item.setAttribute('data-key', `key-${item.getAttribute('data-sortable-id')}`);
    item.setAttribute('data-final-item', '');
  }
  const sortable = createSortable(todo, {
    ...options(),
    getItemId: itemId,
  });
  sortable.registerArea(done, {
    areaId: 'done',
    item: '[data-sortable-id]',
    getItemId: itemId,
  });
  sortable.updateArea('todo', {
    item: '[data-final-item]',
    getItemId: itemId,
  });
  sortable.updateArea('done', {
    item: '[data-final-item]',
    getItemId: itemId,
  });

  transfer(platform, todo, done);

  assert.deepEqual(ids(todo), ['a']);
  assert.deepEqual(ids(done), ['b', 'c']);
});

test('createSortable excludes its placeholder when an item selector matches every list item', async () => {
  const { createSortable } = await import('../../../src/index.js');
  const platform = fakePlatform();
  const todo = area(platform.document, 0, ['a', 'b']);
  const done = area(platform.document, 200, ['c']);
  const reasons: string[] = [];
  const sortable = createSortable(todo, {
    areaId: 'todo',
    item: 'li',
    onAfterDrag: (result) => reasons.push(result.reason),
    onError: () => {},
  });
  sortable.registerArea(done, { areaId: 'done', item: 'li' });

  transfer(platform, todo, done);

  assert.deepEqual(ids(todo), ['a']);
  assert.deepEqual(ids(done), ['b', 'c']);
  assert.deepEqual(reasons, ['drop']);
});

test('createSortable rejects structural non-Element inputs with INVALID_ELEMENT', async () => {
  const { createSortable } = await import('../../../src/index.js');
  const structuralValue = {
    ownerDocument: null,
    querySelectorAll: () => [],
    addEventListener: () => {},
  };

  assert.throws(
    () => createSortable(structuralValue as unknown as Element, options()),
    hasCode('INVALID_ELEMENT'),
  );
});

function transfer(
  platform: ReturnType<typeof fakePlatform>,
  todo: ReturnType<typeof area>,
  done: ReturnType<typeof area>,
): void {
  const source = todo.fixtureChildren[1] as Element;
  const start = pointer({ clientX: 10, clientY: 40, target: source });
  platform.setHits([source, todo]);
  todo.dispatch('pointerdown', start);
  platform.dispatchDocument('pointermove', pointer({ ...start, clientX: 14, target: source }));
  platform.flushFrame();
  const destination = done.fixtureChildren[0] as Element;
  platform.setHits([destination, done]);
  platform.dispatchDocument('pointermove', pointer({
    clientX: 210,
    clientY: 1,
    target: destination,
  }));
  platform.flushFrame();
  platform.dispatchDocument('pointerup', pointer({
    clientX: 210,
    clientY: 1,
    target: destination,
  }));
  platform.flushFrame();
}

function area(document: Document, left: number, itemIds: readonly string[]) {
  const element = fakeElement('UL', {
    ownerDocument: document,
    rect: { left, top: 0, right: left + 100, bottom: 100, width: 100, height: 100 },
  });
  itemIds.forEach((itemId, index) => {
    element.appendChild(fakeElement('LI', {
      ownerDocument: document,
      attributes: { 'data-sortable-id': itemId },
      rect: {
        left,
        top: index * 30,
        right: left + 100,
        bottom: index * 30 + 20,
        width: 100,
        height: 20,
      },
    }));
  });
  return element;
}

function ids(element: { fixtureChildren: readonly Element[] }): readonly string[] {
  return element.fixtureChildren.map((child) => (
    child.getAttribute('data-sortable-id') as string
  ));
}
