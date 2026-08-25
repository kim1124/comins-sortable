import assert from 'node:assert/strict';
import test from 'node:test';

import { BindingRegistry } from '../../../src/framework/bindings.js';
import { hasCode } from '../helpers/core-fixtures.js';
import { renderedArea } from '../helpers/framework-fixtures.js';

test('binding registry rejects duplicate area IDs and group-wide item IDs', () => {
  const registry = new BindingRegistry<{ id: string }>();
  registry.register(renderedArea('todo', 'tasks', [{ id: 'a' }]));

  assert.throws(
    () => registry.register(renderedArea('todo', 'tasks', [{ id: 'b' }])),
    hasCode('DUPLICATE_AREA_ID'),
  );
  assert.throws(
    () => registry.register(renderedArea('done', 'tasks', [{ id: 'a' }])),
    hasCode('DUPLICATE_ITEM_ID'),
  );
});

test('binding registry rejects duplicate item IDs within one area', () => {
  const registry = new BindingRegistry<{ id: string }>();

  assert.throws(
    () => registry.register(renderedArea('todo', 'tasks', [{ id: 'a' }, { id: 'a' }])),
    hasCode('DUPLICATE_ITEM_ID'),
  );
});

test('register revalidates duplicate IDs that appear in an existing binding after registration', () => {
  const registry = new BindingRegistry<{ id: string }>();
  let todo = [{ id: 'a' }];
  registry.register({
    ...renderedArea('todo', 'tasks', todo),
    getItems: () => todo,
  });
  todo = [{ id: 'a' }, { id: 'a' }];

  assert.throws(
    () => registry.register(renderedArea('done', 'tasks', [{ id: 'c' }])),
    hasCode('DUPLICATE_ITEM_ID'),
  );
});

test('register revalidates duplicate IDs shared by existing bindings after registration', () => {
  const registry = new BindingRegistry<{ id: string }>();
  let todo = [{ id: 'a' }];
  let done = [{ id: 'b' }];
  registry.register({
    ...renderedArea('todo', 'tasks', todo),
    getItems: () => todo,
  });
  registry.register({
    ...renderedArea('done', 'tasks', done),
    getItems: () => done,
  });
  done = [{ id: 'a' }];

  assert.throws(
    () => registry.register(renderedArea('next', 'tasks', [{ id: 'c' }])),
    hasCode('DUPLICATE_ITEM_ID'),
  );
});

test('unregister clears callbacks and cannot remove a replacement binding', () => {
  const registry = new BindingRegistry<{ id: string }>();
  const dispose = registry.register(renderedArea('todo', 'tasks', [{ id: 'a' }]));

  dispose();
  assert.equal(registry.get('todo'), undefined);

  const replacement = renderedArea('todo', 'tasks', [{ id: 'b' }]);
  registry.register(replacement);
  dispose();

  assert.equal(registry.get('todo'), replacement);
  assert.equal(registry.size, 1);
});

test('custom item elements exclude non-item siblings from structural validation', () => {
  const registry = new BindingRegistry<{ id: string }>();
  const binding = renderedArea(
    'todo',
    'tasks',
    [{ id: 'a' }, { id: 'b' }],
    { renderedItemCount: 4 },
  );

  registry.register({
    ...binding,
    getItemElements: () => [{}, {}] as Element[],
  });

  assert.doesNotThrow(() => registry.validateElements());
});
