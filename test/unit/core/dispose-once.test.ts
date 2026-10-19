import assert from 'node:assert/strict';
import test from 'node:test';

import { disposeOnce } from '../../../src/core/dispose-once.js';

test('disposeOnce runs cleanup once across repeated and reentrant calls', () => {
  let calls = 0;
  const dispose = disposeOnce(() => {
    calls += 1;
    dispose();
  });
  dispose();
  dispose();
  assert.equal(calls, 1);
});

test('disposeOnce releases cleanup before propagating its exception', () => {
  const failure = new Error('cleanup failed');
  let calls = 0;
  const dispose = disposeOnce(() => {
    calls += 1;
    throw failure;
  });
  assert.throws(dispose, (error) => error === failure);
  assert.doesNotThrow(dispose);
  assert.equal(calls, 1);
});
