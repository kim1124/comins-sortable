import assert from 'node:assert/strict';
import test from 'node:test';
import { scopeFixture } from '../helpers/scope-fixtures.js';

for (const failure of ['uncommitted', 'callback'] as const) {
  test(`a ${failure} transfer preserves selection and the range anchor through option updates`, () => {
    const fixture = scopeFixture({
      multiDrag: true, commit: false, todoItemIds: ['a', 'b', 'z'], doneItemIds: ['c'],
      onChange: failure === 'callback' ? () => { throw new Error('consumer failure'); } : undefined,
      onError: () => {},
    });
    fixture.select('todo', 0); fixture.select('todo', 1, { ctrlKey: true });
    fixture.begin('todo', 0); fixture.move('done', 0); fixture.release();
    fixture.platform.flushFrame(); fixture.platform.flushFrame();
    fixture.scope.updateArea('todo', { selectedClass: 'new-selected' });
    assert.deepEqual(fixture.ids('todo'), ['a', 'b', 'z']);
    const selected = () => [...fixture.area('todo').children]
      .filter((element) => element.hasAttribute('data-comins-sortable-selected'))
      .map((element) => element.getAttribute('data-sortable-id'));
    assert.deepEqual(selected(), ['a', 'b']);
    fixture.select('todo', 2, { shiftKey: true });
    assert.deepEqual(selected(), ['b', 'z']);
    fixture.scope.destroy();
  });
}

test('changing selectedClass replaces the old marker and deselects cleanly', () => {
  const fixture = scopeFixture({ multiDrag: true, selectedClass: 'old-selection' });
  const item = fixture.item('todo', 0);
  item.classList.add('consumer-card');
  fixture.select('todo', 0);
  fixture.scope.updateArea('todo', { selectedClass: 'new-selection' });
  assert.equal(item.classList.contains('old-selection'), false);
  assert.equal(item.classList.contains('new-selection'), true);
  assert.equal(item.hasAttribute('data-comins-sortable-selected'), true);
  fixture.select('todo', 0, { ctrlKey: true });
  assert.equal(item.classList.contains('new-selection'), false);
  assert.equal(item.hasAttribute('data-comins-sortable-selected'), false);
  assert.equal(item.classList.contains('consumer-card'), true);
  fixture.scope.destroy();
});

for (const teardown of ['unregister', 'destroy'] as const) {
  test(`${teardown} clears selection markers without removing consumer classes`, () => {
    const fixture = scopeFixture({ multiDrag: true, selectedClass: 'is-selected' });
    const item = fixture.item('todo', 0);
    item.classList.add('consumer-card');
    fixture.select('todo', 0);
    fixture.select('todo', 1, { ctrlKey: true });
    if (teardown === 'unregister') fixture.unregister.todo();
    else fixture.scope.destroy();
    for (const selected of fixture.area('todo').fixtureChildren) {
      assert.equal(selected.classList.contains('is-selected'), false);
      assert.equal(selected.hasAttribute('data-comins-sortable-selected'), false);
    }
    assert.equal(item.classList.contains('consumer-card'), true);
    fixture.unregister.todo();
    fixture.scope.destroy();
  });
}

test('re-registering an area starts with no stale selection or range anchor', () => {
  const fixture = scopeFixture({ multiDrag: true, selectedClass: 'is-selected' });
  fixture.select('todo', 0);
  fixture.unregister.todo();
  const dispose = fixture.scope.registerArea(fixture.area('todo'), {
    areaId: 'todo', group: 'tasks', item: '[data-sortable-item]',
    getItemId: (element) => element.getAttribute('data-sortable-id') as string,
    multiDrag: true, selectedClass: 'is-selected',
  });
  fixture.select('todo', 1, { shiftKey: true });
  assert.equal(fixture.item('todo', 0).hasAttribute('data-comins-sortable-selected'), false);
  assert.equal(fixture.item('todo', 1).hasAttribute('data-comins-sortable-selected'), true);
  // Calling the old disposer again must not clear the new registration.
  fixture.unregister.todo();
  assert.equal(fixture.item('todo', 1).hasAttribute('data-comins-sortable-selected'), true);
  dispose();
  fixture.scope.destroy();
});

test('unregistering another area preserves the current selection', () => {
  const fixture = scopeFixture({ multiDrag: true });
  fixture.select('todo', 0);
  fixture.unregister.done();
  assert.equal(fixture.item('todo', 0).hasAttribute('data-comins-sortable-selected'), true);
  fixture.scope.destroy();
});

test('changing the item selector removes markers from items that leave the area membership', () => {
  const fixture = scopeFixture({ multiDrag: true, selectedClass: 'is-selected' });
  fixture.select('todo', 0);
  fixture.item('todo', 1).setAttribute('data-eligible', '');
  fixture.scope.updateArea('todo', { item: '[data-eligible]' });
  assert.equal(fixture.item('todo', 0).classList.contains('is-selected'), false);
  assert.equal(fixture.item('todo', 0).hasAttribute('data-comins-sortable-selected'), false);
  fixture.select('todo', 1);
  assert.equal(fixture.item('todo', 1).hasAttribute('data-comins-sortable-selected'), true);
  fixture.scope.destroy();
});
