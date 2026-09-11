import assert from 'node:assert/strict';
import test from 'node:test';
import { deferredElementRef } from '../../../src/framework/element-ref.js';
import { fakeElement } from '../helpers/core-fixtures.js';

test('new hosts register after sibling cleanup and committed props updates', async () => {
  const order: string[] = [];
  const ref = deferredElementRef(() => order.push('register'));
  ref(fakeElement('DIV') as unknown as HTMLElement);
  order.push('old subtree removed', 'parent props updated');
  await Promise.resolve();
  assert.deepEqual(order, ['old subtree removed', 'parent props updated', 'register']);
});

test('removed and replaced hosts cannot register from stale microtasks', async () => {
  const calls: (HTMLElement | null)[] = [];
  const ref = deferredElementRef((element) => calls.push(element));
  const first = fakeElement('DIV') as unknown as HTMLElement;
  const second = fakeElement('DIV') as unknown as HTMLElement;
  ref(first);
  ref(null);
  assert.deepEqual(calls, [null]);
  ref(second);
  await Promise.resolve();
  assert.deepEqual(calls, [null, second]);
  ref(first);
  ref(null);
  await Promise.resolve();
  assert.deepEqual(calls, [null, second, null]);
});
