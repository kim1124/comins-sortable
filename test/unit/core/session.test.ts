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

  assert.equal(status(session), 'idle');
  session.pending(pendingInput());
  assert.equal(status(session), 'pending');
  session.activate(activeInput());
  assert.equal(status(session), 'dragging');
  session.commit(change());
  assert.equal(status(session), 'committing');
  session.finish();

  assert.equal(status(session), 'idle');
});

test('session follows the approved cancellation state graph', () => {
  const session = new SessionMachine();

  assert.equal(status(session), 'idle');
  session.pending(pendingInput());
  assert.equal(status(session), 'pending');
  session.activate(activeInput());
  assert.equal(status(session), 'dragging');
  session.cancel('escape');

  assert.equal(status(session), 'cancelling');
  if (session.state.status === 'cancelling') {
    assert.equal(session.state.reason, 'escape');
  }
  session.finish();

  assert.equal(status(session), 'idle');
});

test('pending activation can be abandoned without creating an active session', () => {
  const session = new SessionMachine();

  session.pending(pendingInput());
  assert.equal(status(session), 'pending');
  session.abandon();
  session.abandon();

  assert.equal(status(session), 'idle');
});

test('session rejects transitions outside the approved graph', () => {
  const session = new SessionMachine();

  assert.throws(() => session.activate(activeInput()), hasCode('INVALID_OPTION'));
  session.pending(pendingInput());
  assert.throws(() => session.commit(change()), hasCode('INVALID_OPTION'));
  assert.throws(() => session.finish(), hasCode('INVALID_OPTION'));
});


test('long-lived sessions do not retain transition history', () => {
  const session = new SessionMachine();
  for (let cycle = 0; cycle < 10_000; cycle += 1) {
    session.pending(pendingInput());
    session.abandon();
  }
  assert.equal(status(session), 'idle');
  assert.equal('history' in session, false);
});

function status(session: SessionMachine): string {
  return session.state.status;
}
