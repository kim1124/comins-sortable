import assert from 'node:assert/strict';
import test from 'node:test';

import { scopeFixture } from '../helpers/scope-fixtures.js';

test('scope emits one atomic transfer in the approved lifecycle order', () => {
  const calls: string[] = [];
  const fixture = scopeFixture({
    onBeforeDragStart: () => { calls.push('before'); },
    onDragStart: () => { calls.push('start'); },
    onDrag: () => { calls.push('drag'); },
    onInsertDragArea: () => { calls.push('insert'); },
    onChange: () => { calls.push('change'); },
    onAfterDrag: () => { calls.push('after'); },
  });

  fixture.drop('todo', 1, 'done', 1);
  fixture.platform.flushFrame();

  assert.deepEqual(calls, ['before', 'start', 'drag', 'insert', 'change', 'after']);
  assert.deepEqual(fixture.ids('todo'), ['a']);
  assert.deepEqual(fixture.ids('done'), ['c', 'b', 'd']);
  assert.deepEqual(fixture.results, [{
    status: 'dropped',
    reason: 'drop',
    change: {
      operation: 'transfer',
      itemId: 'b',
      source: { areaId: 'todo', index: 1 },
      destination: { areaId: 'done', index: 1 },
      orders: [
        { areaId: 'todo', itemIds: ['a'] },
        { areaId: 'done', itemIds: ['c', 'b', 'd'] },
      ],
    },
  }]);
});

test('onBeforeDragStart false abandons activation without after-drag', () => {
  const calls: string[] = [];
  const fixture = scopeFixture({
    onBeforeDragStart: () => {
      calls.push('before');
      return false;
    },
    onAfterDrag: () => calls.push('after'),
  });

  fixture.begin('todo', 0);

  assert.deepEqual(calls, ['before']);
  assert.deepEqual(fixture.results, []);
  assert.equal(fixture.placeholderCount(), 0);
  assert.equal(fixture.platform.listenerCount(), 0);
});

test('active callback errors clean up before after-drag and then call onError', () => {
  const calls: string[] = [];
  let fixture: ReturnType<typeof scopeFixture>;
  fixture = scopeFixture({
    onDrag: () => {
      calls.push('drag');
      throw new Error('consumer failure');
    },
    onAfterDrag: () => {
      calls.push(`after:${fixture.placeholderCount()}:${fixture.platform.listenerCount()}`);
    },
    onError: () => calls.push('error'),
  });

  fixture.begin('todo', 0);
  fixture.move('done', 0);

  assert.deepEqual(calls, ['drag', 'after:0:0', 'error']);
  assert.deepEqual(fixture.results, [{ status: 'cancelled', reason: 'error' }]);
});

test('onChange errors restore the original DOM before after-drag and onError', () => {
  const calls: string[] = [];
  const fixture = scopeFixture({
    onChange: () => {
      calls.push('change');
      throw new Error('commit failure');
    },
    onAfterDrag: () => { calls.push('after'); },
    onError: () => { calls.push('error'); },
  });

  fixture.drop('todo', 0, 'done', 0);

  assert.deepEqual(calls, ['change', 'after', 'error']);
  assert.deepEqual(fixture.ids('todo'), ['a', 'b']);
  assert.deepEqual(fixture.ids('done'), ['c', 'd']);
});

test('onChange errors restore the original index after a same-area reorder', () => {
  const fixture = scopeFixture({
    onChange: () => {
      throw new Error('reorder commit failure');
    },
    onError: () => {},
  });

  fixture.drop('todo', 0, 'todo', 2);

  assert.deepEqual(fixture.ids('todo'), ['a', 'b']);
  assert.deepEqual(fixture.results, [{ status: 'cancelled', reason: 'error' }]);
});

test('onAfterDrag errors are reported after one completed cleanup', () => {
  const calls: string[] = [];
  let fixture: ReturnType<typeof scopeFixture>;
  fixture = scopeFixture({
    onAfterDrag: () => {
      calls.push(`after:${fixture.placeholderCount()}:${fixture.platform.listenerCount()}`);
      throw new Error('after failure');
    },
    onError: () => { calls.push('error'); },
  });

  fixture.drop('todo', 0, 'done', 0);
  fixture.platform.flushFrame();

  assert.deepEqual(calls, ['after:0:0', 'error']);
  assert.equal(fixture.results.length, 1);
});

test('destination acceptance is evaluated once per pointer frame', () => {
  let calls = 0;
  const fixture = scopeFixture({
    onAcceptDone: () => {
      calls += 1;
      return true;
    },
  });

  fixture.begin('todo', 0);
  fixture.move('done', 0);

  assert.equal(calls, 1);
});
