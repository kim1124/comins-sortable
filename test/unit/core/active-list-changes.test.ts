import assert from 'node:assert/strict';
import test from 'node:test';
import { scopeFixture } from '../helpers/scope-fixtures.js';
import { fakeElement } from '../helpers/core-fixtures.js';

for (const operation of ['transfer', 'reorder', 'swap', 'multi', 'copy'] as const) {
  test(`${operation} rejects a changed source without moving another item or reverting external order`, () => {
    let changes = 0;
    let copies = 0;
    const fixture = scopeFixture({
      swap: operation === 'swap', multiDrag: operation === 'multi',
      groupTodo: operation === 'copy' ? { name: 'tasks', pull: 'copy' } : 'tasks',
      prepareCopy: () => { copies++; return 'copy'; },
      onChange: () => { changes++; },
    });
    if (operation === 'multi') {
      fixture.select('todo', 0);
      fixture.select('todo', 1, { ctrlKey: true });
    }
    fixture.begin('todo', 1);
    fixture.area('todo').insertBefore(fixture.item('todo', 1), fixture.item('todo', 0));
    fixture.scope.refreshArea?.('todo');
    fixture.move(operation === 'reorder' || operation === 'swap' ? 'todo' : 'done', 0);
    fixture.release();
    fixture.platform.flushFrame(); fixture.platform.flushFrame();
    assert.deepEqual(fixture.ids('todo'), ['b', 'a']);
    assert.deepEqual(fixture.ids('done'), ['c', 'd']);
    assert.equal(changes, 0);
    assert.equal(copies, 0);
    assert.deepEqual(fixture.results, [{ status: 'rejected', reason: 'state-not-committed' }]);
    assert.equal(fixture.placeholderCount(), 0);
    fixture.scope.destroy();
  });
}

for (const action of ['release', 'cancel'] as const) {
  test(`${action} preserves externally removed source items`, () => {
    const fixture = scopeFixture();
    fixture.begin('todo', 1);
    fixture.item('todo', 1).remove();
    if (action === 'release') {
      fixture.move('done', 0); fixture.release();
      fixture.platform.flushFrame(); fixture.platform.flushFrame();
    } else fixture.scope.cancel();
    assert.deepEqual(fixture.ids('todo'), ['a']);
    assert.deepEqual(fixture.ids('done'), ['c', 'd']);
    assert.equal(fixture.placeholderCount(), 0);
    fixture.scope.destroy();
  });
}

test('changed destination order rejects a stale drop and preserves both lists', () => {
  const fixture = scopeFixture();
  fixture.begin('todo', 1);
  fixture.move('done', 0);
  fixture.area('done').insertBefore(fixture.item('done', 1), fixture.item('done', 0));
  fixture.release();
  fixture.platform.flushFrame(); fixture.platform.flushFrame();
  assert.deepEqual(fixture.ids('todo'), ['a', 'b']);
  assert.deepEqual(fixture.ids('done'), ['d', 'c']);
  assert.deepEqual(fixture.results, [{ status: 'rejected', reason: 'state-not-committed' }]);
  fixture.scope.destroy();
});

for (const mutation of ['insert', 'replace', 'cancel-reorder'] as const) {
  test(`${mutation} during a drag preserves the owner's current DOM`, () => {
    let changes = 0;
    const fixture = scopeFixture({ onChange: () => { changes++; } });
    fixture.begin('todo', 1);
    const source = fixture.item('todo', 1);
    const replacement = fakeElement('LI', {
      ownerDocument: fixture.platform.document,
      attributes: { 'data-sortable-item': '', 'data-sortable-id': mutation === 'insert' ? 'new' : 'b' },
    });
    if (mutation === 'cancel-reorder') {
      fixture.area('todo').insertBefore(source, fixture.item('todo', 0));
      fixture.scope.cancel();
    } else {
      fixture.area('todo').insertBefore(replacement, source);
      if (mutation === 'replace') source.remove();
      fixture.move('done', 0); fixture.release();
      fixture.platform.flushFrame(); fixture.platform.flushFrame();
      assert.equal(replacement.parentElement, fixture.area('todo'));
      if (mutation === 'replace') assert.equal(source.parentElement, null);
    }
    assert.deepEqual(fixture.ids('todo'), mutation === 'insert' ? ['a', 'new', 'b'] : mutation === 'replace' ? ['a', 'b'] : ['b', 'a']);
    assert.deepEqual(fixture.ids('done'), ['c', 'd']);
    assert.equal(changes, 0);
    fixture.scope.destroy();
  });
}
