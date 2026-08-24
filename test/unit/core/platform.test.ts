import assert from 'node:assert/strict';
import test from 'node:test';

import { createBrowserPlatform } from '../../../src/core/platform.js';
import { fakeElement, hasCode } from '../helpers/core-fixtures.js';

test('browser platform resolves services from the mounted element document', () => {
  const hit = fakeElement('DIV');
  const cancelled: number[] = [];
  const window = {
    requestAnimationFrame: () => 9,
    cancelAnimationFrame: (id: number) => cancelled.push(id),
  } as unknown as Window;
  const document = {
    defaultView: window,
    elementsFromPoint: () => [hit],
  } as unknown as Document;
  const element = fakeElement('DIV', { ownerDocument: document });

  const platform = createBrowserPlatform(element);

  assert.equal(platform.document, document);
  assert.equal(platform.window, window);
  assert.deepEqual(platform.elementsFromPoint(3, 5), [hit]);
  assert.equal(platform.requestFrame(() => {}), 9);
  platform.cancelFrame(9);
  assert.deepEqual(cancelled, [9]);
});

test('browser platform rejects an element without a usable window', () => {
  const document = { defaultView: null } as unknown as Document;
  const element = fakeElement('DIV', { ownerDocument: document });

  assert.throws(() => createBrowserPlatform(element), hasCode('INVALID_ELEMENT'));
});
