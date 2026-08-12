import assert from 'node:assert/strict';
import test from 'node:test';

import { SessionMachine } from '../../../src/core/session.js';
import {
  activeInput,
  change,
  hasCode,
  pendingInput,
} from '../helpers/core-fixtures.js';

test('session follows the approved commit state graph', () => {
  const session = new SessionMachine();

  session.pending(pendingInput());
  session.activate(activeInput());
  session.commit(change());
  session.finish();

  assert.equal(session.state.status, 'idle');
  assert.deepEqual(session.history, [
    'idle',
    'pending',
    'dragging',
    'committing',
    'idle',
  ]);
});

test('session follows the approved cancellation state graph', () => {
  const session = new SessionMachine();

  session.pending(pendingInput());
  session.activate(activeInput());
  session.cancel('escape');

  assert.equal(session.state.status, 'cancelling');
  if (session.state.status === 'cancelling') {
    assert.equal(session.state.reason, 'escape');
  }
  session.finish();

  assert.deepEqual(session.history, [
    'idle',
    'pending',
    'dragging',
    'cancelling',
    'idle',
  ]);
});

test('pending activation can be abandoned without creating an active session', () => {
  const session = new SessionMachine();

  session.pending(pendingInput());
  session.abandon();
  session.abandon();

  assert.equal(session.state.status, 'idle');
  assert.deepEqual(session.history, ['idle', 'pending', 'idle']);
});

test('session rejects transitions outside the approved graph', () => {
  const session = new SessionMachine();

  assert.throws(() => session.activate(activeInput()), hasCode('INVALID_OPTION'));
  session.pending(pendingInput());
  assert.throws(() => session.commit(change()), hasCode('INVALID_OPTION'));
  assert.throws(() => session.finish(), hasCode('INVALID_OPTION'));
});
