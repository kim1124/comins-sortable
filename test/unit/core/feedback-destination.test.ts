import assert from 'node:assert/strict';
import test from 'node:test';

import { scopeFixture } from '../helpers/scope-fixtures.js';
import { fakeElement } from '../helpers/core-fixtures.js';

test('emptying a list retains the footer boundary for insertion feedback', () => {
  const fixture = scopeFixture({ todoItemIds: ['a'], doneItemIds: ['c'] });
  const todo = fixture.area('todo');
  const header = fakeElement('DIV', { ownerDocument: fixture.platform.document });
  const footer = fakeElement('DIV', { ownerDocument: fixture.platform.document });
  todo.insertBefore(header, fixture.item('todo', 0));
  todo.appendChild(footer);
  fixture.scope.refreshArea?.('todo');
  fixture.drop('todo', 0, 'done', 0);
  fixture.platform.flushFrame();
  fixture.platform.flushFrame();
  assert.deepEqual(fixture.ids('todo'), []);
  fixture.begin('done', 0);
  fixture.move('todo', 0);
  const placeholder = todo.querySelector('[data-comins-sortable-placeholder]');
  assert.ok(placeholder);
  assert.equal(Array.from(todo.children).indexOf(placeholder), 1);
  assert.equal(Array.from(todo.children).indexOf(footer), 2);
  fixture.terminate('escape');
  assert.deepEqual(Array.from(todo.children), [header, footer]);
  fixture.scope.destroy();
});

for (const ending of ['outside', 'reenter', 'escape'] as const) {
  test(`move feedback hides outside without removing its space, then handles ${ending}`, () => {
    const fixture = scopeFixture();
    fixture.begin('todo', 1);
    fixture.move('done', 0);
    const placeholder = fixture.area('done').querySelector('[data-comins-sortable-placeholder]') as HTMLElement;
    assert.ok(placeholder);
    const height = placeholder.style.height;

    fixture.moveOutside();
    assert.equal(placeholder.style.visibility, 'hidden');
    assert.equal(placeholder.parentElement, fixture.area('done'));
    assert.equal(placeholder.style.height, height);
    assert.equal(fixture.placeholderCount(), 1);

    if (ending === 'reenter') {
      fixture.move('done', 0);
      assert.notEqual(placeholder.style.visibility, 'hidden');
      fixture.release();
      fixture.platform.flushFrame();
      fixture.platform.flushFrame();
      assert.deepEqual(fixture.ids('todo'), ['a']);
      assert.deepEqual(fixture.ids('done'), ['b', 'c', 'd']);
      assert.equal(fixture.results[fixture.results.length - 1]?.reason, 'drop');
    } else {
      if (ending === 'outside') fixture.release();
      else fixture.terminate('escape');
      assert.deepEqual(fixture.ids('todo'), ['a', 'b']);
      assert.deepEqual(fixture.ids('done'), ['c', 'd']);
      assert.equal(fixture.results[fixture.results.length - 1]?.reason, ending);
    }
    assert.equal(fixture.placeholderCount(), 0);
    fixture.scope.destroy();
  });
}

test('a rejected destination hides the previous insertion marker and reentry restores it', () => {
  const fixture = scopeFixture({ acceptDone: false });
  fixture.begin('todo', 1);
  const placeholder = fixture.area('todo').querySelector('[data-comins-sortable-placeholder]') as HTMLElement;
  fixture.move('done', 0);
  assert.equal(placeholder.style.visibility, 'hidden');
  fixture.move('todo', 0);
  assert.notEqual(placeholder.style.visibility, 'hidden');
  fixture.terminate('escape');
  assert.equal(fixture.placeholderCount(), 0);
  fixture.scope.destroy();
});
