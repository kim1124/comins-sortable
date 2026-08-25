import assert from 'node:assert/strict';
import test from 'node:test';

import { createLayoutAnimator, normalizeAnimation } from '../../../src/core/animation.js';
import { fakeElement, fakePlatform, hasCode } from '../helpers/core-fixtures.js';

test('animation options normalize numbers and reject invalid durations', () => {
  assert.deepEqual(normalizeAnimation(150), { duration: 150 });
  assert.deepEqual(normalizeAnimation({ duration: 200, easing: 'linear' }), {
    duration: 200,
    easing: 'linear',
  });
  assert.equal(normalizeAnimation(false), null);
  assert.throws(() => normalizeAnimation(-1), hasCode('INVALID_OPTION'));
  assert.throws(() => normalizeAnimation({ duration: 1, easing: '' }), hasCode('INVALID_OPTION'));
});

test('layout animator plays FLIP deltas, honors reduced motion, and cancels resources', () => {
  const platform = fakePlatform();
  const area = fakeElement('DIV', { ownerDocument: platform.document });
  const item = fakeElement('DIV', {
    ownerDocument: platform.document,
    attributes: { 'data-sortable-item': '' },
    rect: { left: 0, top: 0, right: 100, bottom: 20, width: 100, height: 20 },
  });
  area.appendChild(item);
  const calls: Array<{ keyframes: Keyframe[]; options: KeyframeAnimationOptions }> = [];
  let cancels = 0;
  (item as unknown as { animate: (keyframes: Keyframe[], options: KeyframeAnimationOptions) => Animation }).animate = (
    keyframes,
    options,
  ) => {
    calls.push({ keyframes, options });
    return { cancel: () => { cancels += 1; } } as Animation;
  };
  (platform.window as unknown as { matchMedia: () => { matches: boolean } }).matchMedia = () => ({ matches: false });
  const animator = createLayoutAnimator(area, '[data-sortable-item]', 180, platform.window);

  (item as unknown as { rect: DOMRect }).rect = {
    left: 0, top: 40, right: 100, bottom: 60, width: 100, height: 20,
  } as DOMRect;
  animator.play();

  assert.deepEqual(calls, [{
    keyframes: [{ transform: 'translate(0px, -40px)' }, { transform: 'translate(0px, 0px)' }],
    options: { duration: 180, easing: 'ease' },
  }]);
  assert.equal(platform.listenerCount(), 2);
  platform.dispatchWindow('scroll', {});
  assert.equal(cancels, 1);
  assert.equal(platform.listenerCount(), 0);

  (platform.window as unknown as { matchMedia: () => { matches: boolean } }).matchMedia = () => ({ matches: true });
  (item as unknown as { rect: DOMRect }).rect = {
    left: 0, top: 80, right: 100, bottom: 100, width: 100, height: 20,
  } as DOMRect;
  animator.play();
  assert.equal(calls.length, 1);
  animator.destroy();
});
