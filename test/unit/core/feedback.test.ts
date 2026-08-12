import assert from 'node:assert/strict';
import test from 'node:test';

import { createFeedback } from '../../../src/core/feedback.js';
import { fakeElement, fakePlatform } from '../helpers/core-fixtures.js';

test('feedback creates one empty same-tag placeholder without copied consumer data', () => {
  const platform = fakePlatform();
  const input = fakeElement('INPUT', { value: 'fixture value' });
  const source = fakeElement('LI', {
    ownerDocument: platform.document,
    id: 'fixture-id',
    textContent: 'fixture text',
    children: [input],
    rect: { left: 5, top: 10, right: 105, bottom: 40, width: 100, height: 30 },
  });

  const feedback = createFeedback(source, platform);

  assert.equal(feedback.placeholder.tagName, 'LI');
  assert.equal(feedback.placeholder.children.length, 0);
  assert.equal(feedback.placeholder.textContent, '');
  assert.equal(feedback.placeholder.id, '');
  assert.equal(feedback.placeholder.getAttribute('aria-hidden'), 'true');
  assert.equal(feedback.placeholder.hasAttribute('data-comins-sortable-placeholder'), true);
  assert.equal(feedback.placeholder.classList.contains('comins-sortable__placeholder'), true);
  assert.equal((feedback.placeholder as unknown as HTMLElement).style.width, '100px');
  assert.equal((feedback.placeholder as unknown as HTMLElement).style.height, '30px');
});

test('feedback moves by pointer delta and restores only changed source state', () => {
  const platform = fakePlatform();
  const parent = fakeElement('UL', { ownerDocument: platform.document });
  const source = fakeElement('LI', {
    ownerDocument: platform.document,
    parentElement: parent,
    style: { position: 'relative', transform: 'scale(1)' },
    rect: { left: 5, top: 10, right: 105, bottom: 40, width: 100, height: 30 },
  });
  parent.appendChild(source);
  source.focus();
  const feedback = createFeedback(source, platform);
  feedback.place(parent, source);

  feedback.move({
    type: 'mouse',
    clientX: 15,
    clientY: 8,
    deltaX: 10,
    deltaY: -2,
  });

  assert.equal(source.style.transform, 'translate(10px, -2px)');
  assert.equal(source.hasAttribute('data-comins-sortable-dragging'), true);
  feedback.destroy();
  feedback.destroy();

  assert.equal(source.style.position, 'relative');
  assert.equal(source.style.transform, 'scale(1)');
  assert.equal(source.hasAttribute('data-comins-sortable-dragging'), false);
  assert.equal(feedback.placeholder.parentElement, null);
  assert.equal(platform.document.activeElement, source);
});
