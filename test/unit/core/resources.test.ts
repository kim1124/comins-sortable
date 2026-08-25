import assert from 'node:assert/strict';
import test from 'node:test';

import { ResourceBag } from '../../../src/core/resources.js';

test('resource bag disposes each resource exactly once in LIFO order', () => {
  const calls: string[] = [];
  const resources = new ResourceBag();
  resources.add(() => calls.push('listener'), 'listeners');
  resources.add(() => calls.push('frame'), 'frames');

  assert.deepEqual(resources.snapshot(), {
    listeners: 1,
    frames: 1,
    observers: 0,
    cleanups: 0,
  });

  resources.dispose();
  resources.dispose();

  assert.deepEqual(calls, ['frame', 'listener']);
  assert.deepEqual(resources.snapshot(), {
    listeners: 0,
    frames: 0,
    observers: 0,
    cleanups: 0,
  });
});

test('individual resource cleanup is idempotent and updates its category', () => {
  let calls = 0;
  const resources = new ResourceBag();
  const remove = resources.add(() => {
    calls += 1;
  }, 'observers');

  remove();
  remove();
  resources.dispose();

  assert.equal(calls, 1);
  assert.equal(resources.snapshot().observers, 0);
});

test('resources added after disposal are cleaned immediately without retention', () => {
  let calls = 0;
  const resources = new ResourceBag();
  resources.dispose();

  resources.add(() => {
    calls += 1;
  });

  assert.equal(calls, 1);
  assert.deepEqual(resources.snapshot(), {
    listeners: 0,
    frames: 0,
    observers: 0,
    cleanups: 0,
  });
});
