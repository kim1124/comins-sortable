import assert from 'node:assert/strict';
import test from 'node:test';

import { SortableError } from '../../../src/core.js';

test('SortableError exposes only its stable code', () => {
  const error = new SortableError('INVALID_OPTION');

  assert.equal(error.name, 'SortableError');
  assert.equal(error.message, 'INVALID_OPTION');
  assert.equal(error.code, 'INVALID_OPTION');
  assert.equal(Object.prototype.hasOwnProperty.call(error, 'context'), false);
});
