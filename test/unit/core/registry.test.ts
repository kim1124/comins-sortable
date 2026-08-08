import assert from 'node:assert/strict';
import test from 'node:test';

import { AreaRegistry } from '../../../src/core/registry.js';
import { area, hasCode } from '../helpers/core-fixtures.js';

test('registry isolates identical groups across scopes', () => {
  const first = new AreaRegistry();
  const second = new AreaRegistry();

  first.register(area('todo', 'tasks', ['a']));
  second.register(area('todo', 'tasks', ['a']));

  assert.equal(first.size, 1);
  assert.equal(second.size, 1);
});

test('registry rejects duplicate area and group-wide item IDs', () => {
  const registry = new AreaRegistry();
  registry.register(area('todo', 'tasks', ['a']));

  assert.throws(
    () => registry.register(area('todo', 'tasks', ['b'])),
    hasCode('DUPLICATE_AREA_ID'),
  );
  assert.throws(
    () => registry.register(area('done', 'tasks', ['a'])),
    hasCode('DUPLICATE_ITEM_ID'),
  );
});

test('registry enforces one ownerDocument per scope', () => {
  const registry = new AreaRegistry();
  const firstDocument = {};
  const secondDocument = {};

  registry.register(area('todo', 'tasks', ['a'], { ownerDocument: firstDocument }));

  assert.throws(
    () => registry.register(area('done', 'tasks', ['b'], { ownerDocument: secondDocument })),
    hasCode('INVALID_ELEMENT'),
  );
});

test('registry unregister is idempotent and clears area lookup', () => {
  const registry = new AreaRegistry();
  const entry = area('todo', 'tasks', ['a']);
  const unregister = registry.register(entry);

  assert.equal(registry.get('todo'), entry);
  assert.equal(registry.getByElement(entry.element), entry);

  unregister();
  unregister();

  assert.equal(registry.size, 0);
  assert.equal(registry.get('todo'), undefined);
  assert.equal(registry.getByElement(entry.element), undefined);
});

test('registry rescans direct items and rejects missing IDs', () => {
  const registry = new AreaRegistry();
  registry.register(area('todo', 'tasks', ['a', 2]));

  assert.deepEqual(registry.itemIds('todo'), ['a', 2]);
  assert.throws(
    () => registry.register(area('done', 'tasks', [undefined])),
    hasCode('MISSING_ITEM_ID'),
  );
});
