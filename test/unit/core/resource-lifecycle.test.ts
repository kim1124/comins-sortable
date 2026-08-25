import assert from 'node:assert/strict';
import test from 'node:test';

import { scopeFixture } from '../helpers/scope-fixtures.js';

test('active termination signals emit one result and leave zero active resources', () => {
  const cases = [
    ['pointercancel', 'pointer-cancel'],
    ['escape', 'escape'],
    ['blur', 'blur'],
    ['visibility', 'blur'],
    ['unmount', 'unmounted'],
    ['destroy', 'destroyed'],
  ] as const;

  for (const [signal, reason] of cases) {
    const fixture = scopeFixture();
    fixture.begin('todo', 0);
    fixture.terminate(signal);

    assert.deepEqual(fixture.results, [{ status: 'cancelled', reason }]);
    assert.equal(fixture.platform.listenerCount(), 0);
    assert.equal(fixture.platform.frameCount(), 0);
    assert.equal(fixture.placeholderCount(), 0);
  }
});

test('outside and rejected destinations preserve original DOM with stable status mapping', () => {
  const outside = scopeFixture();
  outside.begin('todo', 0);
  outside.moveOutside();
  outside.release();
  assert.deepEqual(outside.results, [{ status: 'cancelled', reason: 'outside' }]);

  const rejected = scopeFixture({ acceptDone: false });
  rejected.drop('todo', 0, 'done', 0);
  assert.deepEqual(rejected.results, [{ status: 'rejected', reason: 'not-accepted' }]);
});

test('a parent item cannot move into its own nested descendant area', () => {
  const nested = scopeFixture({ parentDone: { areaId: 'todo', itemId: 'a' } });

  nested.drop('todo', 0, 'done', 0);

  assert.deepEqual(nested.results, [{ status: 'rejected', reason: 'nested-cycle' }]);
  assert.deepEqual(nested.ids('todo'), ['a', 'b']);
  assert.deepEqual(nested.ids('done'), ['c', 'd']);
});

test('disabled source is rejected and idle cancel remains a no-op', () => {
  const fixture = scopeFixture({ disabledTodo: true });
  fixture.scope.cancel();
  fixture.begin('todo', 0);

  assert.deepEqual(fixture.results, [{ status: 'rejected', reason: 'disabled' }]);
  assert.equal(fixture.placeholderCount(), 0);
});

test('destroy during commit verification cancels the frame and finalizes once', () => {
  const fixture = scopeFixture();
  fixture.drop('todo', 0, 'done', 0);
  assert.equal(fixture.platform.frameCount(), 1);

  fixture.scope.destroy();
  fixture.platform.flushFrame();

  assert.deepEqual(fixture.results, [{ status: 'cancelled', reason: 'destroyed' }]);
  assert.equal(fixture.platform.frameCount(), 0);
  assert.equal(fixture.placeholderCount(), 0);
});

test('destination unmount during commit verification rolls back once', () => {
  const fixture = scopeFixture();
  fixture.drop('todo', 0, 'done', 0);

  fixture.unregister.done();
  fixture.platform.flushFrame();

  assert.deepEqual(fixture.results, [{ status: 'cancelled', reason: 'unmounted' }]);
  assert.equal(fixture.platform.frameCount(), 0);
});

test('owner cancel and disabling an area terminate commit verification', () => {
  const cancelled = scopeFixture();
  cancelled.drop('todo', 0, 'done', 0);
  cancelled.scope.cancel();
  cancelled.platform.flushFrame();
  assert.deepEqual(cancelled.results, [{ status: 'cancelled', reason: 'escape' }]);
  assert.equal(cancelled.platform.frameCount(), 0);

  const disabled = scopeFixture();
  disabled.drop('todo', 0, 'done', 0);
  disabled.scope.updateArea('done', { disabled: true });
  disabled.platform.flushFrame();
  assert.deepEqual(disabled.results, [{ status: 'rejected', reason: 'disabled' }]);
  assert.equal(disabled.platform.frameCount(), 0);
});
