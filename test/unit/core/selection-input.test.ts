import assert from 'node:assert/strict';
import test from 'node:test';
import { fakeElement, pointer } from '../helpers/core-fixtures.js';
import { scopeFixture } from '../helpers/scope-fixtures.js';

for (const option of [{ handle: '.handle' }, { ignore: '.copy' }]) {
  test(`text selection outside the drag target preserves multi-selection: ${JSON.stringify(option)}`, () => {
    const fixture = scopeFixture({ multiDrag: true });
    fixture.select('todo', 0);
    fixture.scope.updateArea('todo', option);
    const copy = fakeElement('SPAN', { ownerDocument: fixture.platform.document, selectors: ['.copy'] });
    fixture.item('todo', 1).appendChild(copy);
    fixture.area('todo').dispatch('pointerdown', pointer({ target: copy, shiftKey: true }));
    assert.equal(fixture.item('todo', 0).hasAttribute('data-comins-sortable-selected'), true);
    assert.equal(fixture.item('todo', 1).hasAttribute('data-comins-sortable-selected'), false);
    assert.equal(fixture.platform.listenerCount(), 0);
    fixture.scope.destroy();
  });
}

test('explicit button handles select items and suppress only their Ctrl context menu', () => {
  const fixture = scopeFixture({ multiDrag: true });
  fixture.select('todo', 0);
  fixture.scope.updateArea('todo', { handle: '.handle' });
  const item = fixture.item('todo', 1);
  const handle = fakeElement('BUTTON', { ownerDocument: fixture.platform.document, selectors: ['.handle'] });
  const copy = fakeElement('SPAN', { ownerDocument: fixture.platform.document });
  const button = fakeElement('BUTTON', { ownerDocument: fixture.platform.document });
  item.appendChild(handle); item.appendChild(copy); item.appendChild(button);
  fixture.area('todo').dispatch('pointerdown', pointer({ target: handle, metaKey: true }));
  fixture.release();
  assert.equal(fixture.item('todo', 0).hasAttribute('data-comins-sortable-selected'), true);
  assert.equal(item.hasAttribute('data-comins-sortable-selected'), true);
  for (const [target, ctrlKey, expected] of [
    [handle, true, true], [handle, false, false], [copy, true, false], [button, true, false],
  ] as const) {
    let prevented = false;
    fixture.area('todo').dispatch('contextmenu', { target, ctrlKey, preventDefault: () => { prevented = true; } });
    assert.equal(prevented, expected);
  }
  fixture.scope.destroy();
});

for (const input of [{ button: 2 }, { button: 1 }, { isPrimary: false }]) {
  test(`non-selection input preserves the selected item: ${JSON.stringify(input)}`, () => {
    const fixture = scopeFixture({ multiDrag: true });
    fixture.select('todo', 0);
    fixture.area('todo').dispatch('pointerdown', pointer({ target: fixture.item('todo', 1), ...input }));
    assert.equal(fixture.item('todo', 0).hasAttribute('data-comins-sortable-selected'), true);
    assert.equal(fixture.item('todo', 1).hasAttribute('data-comins-sortable-selected'), false);
    assert.equal(fixture.platform.listenerCount(), 0);
    fixture.scope.destroy();
  });
}

test('only Ctrl context menus on enabled multi-select items are suppressed', () => {
  const fixture = scopeFixture({ multiDrag: true });
  const area = fixture.area('todo');
  const item = fixture.item('todo', 0);
  const button = fakeElement('BUTTON', { ownerDocument: fixture.platform.document });
  item.appendChild(button);
  const menu = (target: unknown, ctrlKey = true): boolean => {
    let prevented = false;
    area.dispatch('contextmenu', { target, ctrlKey, preventDefault: () => { prevented = true; } });
    return prevented;
  };
  assert.equal(menu(item), true);
  assert.equal(menu(item, false), false);
  assert.equal(menu(area), false);
  assert.equal(menu(button), false);
  fixture.scope.updateArea('todo', { disabled: true });
  assert.equal(menu(item), false);
  fixture.scope.updateArea('todo', { disabled: false, multiDrag: false });
  assert.equal(menu(item), false);
  fixture.scope.updateArea('todo', { multiDrag: true });
  fixture.unregister.todo();
  assert.equal(menu(item), false);
  fixture.scope.destroy();
});
