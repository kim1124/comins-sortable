import assert from 'node:assert/strict';
import test from 'node:test';

import { createAutoScroller } from '../../../src/core/auto-scroll.js';
import { fakeElement, fakePlatform } from '../helpers/core-fixtures.js';
import { scopeFixture } from '../helpers/scope-fixtures.js';

test('auto-scroll is a no-op when disabled', () => {
  const platform = fakePlatform();
  const container = fakeElement('DIV', {
    ownerDocument: platform.document,
    rect: { left: 0, top: 0, right: 100, bottom: 100, width: 100, height: 100 },
    computedStyle: { overflowY: 'auto' },
    clientHeight: 100,
    scrollHeight: 300,
  });

  const target = createAutoScroller(platform).step({
    enabled: false,
    point: { x: 50, y: 98 },
    hitChain: [container],
  });

  assert.equal(target, null);
  assert.equal(container.scrollTop, 0);
});

test('auto-scroll moves the nearest eligible container before the window', () => {
  const platform = fakePlatform();
  const container = fakeElement('DIV', {
    ownerDocument: platform.document,
    rect: { left: 0, top: 0, right: 100, bottom: 100, width: 100, height: 100 },
    computedStyle: { overflowY: 'auto' },
    clientHeight: 100,
    scrollHeight: 300,
  });

  const target = createAutoScroller(platform).step({
    enabled: true,
    point: { x: 50, y: 98 },
    hitChain: [container],
  });

  assert.equal(target, container);
  assert.equal(container.scrollTop > 0, true);
  assert.deepEqual(platform.windowScrolls, []);
});

test('auto-scroll falls back to the window when no hit ancestor can scroll', () => {
  const platform = fakePlatform();
  const fixed = fakeElement('DIV', {
    ownerDocument: platform.document,
    rect: { left: 0, top: 0, right: 100, bottom: 100, width: 100, height: 100 },
  });
  const root = platform.document.documentElement as unknown as { scrollHeight: number };
  root.scrollHeight = 1400;

  const target = createAutoScroller(platform).step({
    enabled: true,
    point: { x: 500, y: 767 },
    hitChain: [fixed],
  });

  assert.equal(target, platform.window);
  assert.equal(platform.windowScrolls.length, 1);
  assert.equal((platform.windowScrolls[0]?.top ?? 0) > 0, true);
});

test('scope continues edge scrolling until cancellation and releases its frame', () => {
  const fixture = scopeFixture({ autoScroll: true, scrollableDone: true });
  const destination = fixture.area('done');

  fixture.begin('todo', 0);
  fixture.move('done', 2);
  const firstScrollTop = destination.scrollTop;

  assert.equal(firstScrollTop > 0, true);
  assert.equal(fixture.platform.frameCount(), 1);

  fixture.platform.flushFrame();
  assert.equal(destination.scrollTop > firstScrollTop, true);
  assert.equal(fixture.platform.frameCount(), 1);

  fixture.scope.cancel();
  assert.equal(fixture.platform.frameCount(), 0);
});

function timedScroller() {
  const platform = fakePlatform();
  const container = fakeElement('DIV', {
    ownerDocument: platform.document,
    rect: { left: 100, top: 100, right: 200, bottom: 200, width: 100, height: 100 },
    computedStyle: { overflowY: 'auto' },
    clientHeight: 100, scrollHeight: 10000,
  });
  const scroller = createAutoScroller(platform);
  const input = { enabled: true, point: { x: 150, y: 200 }, hitChain: [container] };
  return { platform, container, scroller, input };
}

test('equal elapsed time produces equal edge scrolling at 60 and 120 Hz', () => {
  const distances = [60, 120].map((hz) => {
    const { platform, container, scroller, input } = timedScroller();
    scroller.step(input);
    const initial = container.scrollTop;
    for (let frame = 0; frame < hz; frame += 1) {
      platform.advanceTime(1000 / hz);
      scroller.step(input);
    }
    return container.scrollTop - initial;
  });
  for (const distance of distances) assert.ok(Math.abs(distance - 1200) < 0.001);
});

test('duplicate callbacks at the same time do not add scroll distance or stop scrolling', () => {
  const { container, scroller, input } = timedScroller();
  scroller.step(input);
  const initial = container.scrollTop;
  assert.equal(scroller.step(input), container);
  assert.equal(container.scrollTop, initial);
});

test('a delayed frame caps catch-up and leaving the edge resets the clock', () => {
  const { platform, container, scroller, input } = timedScroller();
  scroller.step(input);
  const initial = container.scrollTop;
  platform.advanceTime(5000);
  scroller.step(input);
  assert.ok(container.scrollTop - initial > initial);
  assert.ok(container.scrollTop - initial <= 60);
  assert.equal(scroller.step({ ...input, point: { x: 150, y: 150 } }), null);
  platform.advanceTime(5000);
  const beforeReentry = container.scrollTop;
  scroller.step(input);
  assert.equal(container.scrollTop - beforeReentry, initial);
});

test('scope frame scheduling keeps the same scrolling speed at 60 and 120 Hz', () => {
  const distances = [60, 120].map((hz) => {
    const fixture = scopeFixture({ autoScroll: true, scrollableDone: true });
    const container = fixture.area('done');
    Object.assign(container, { scrollHeight: 10000 });
    fixture.begin('todo', 0);
    fixture.move('done', 2);
    const initial = container.scrollTop;
    for (let frame = 0; frame < hz; frame += 1) fixture.platform.flushFrame(1000 / hz);
    const distance = container.scrollTop - initial;
    fixture.scope.destroy();
    assert.equal(fixture.platform.frameCount(), 0);
    return distance;
  });
  assert.ok(Math.abs(distances[0]! - distances[1]!) < 0.001);
  assert.ok(distances[0]! > 1000);
});

test('disabling auto-scroll and ending a drag reset elapsed time before the next gesture', () => {
  const { platform, container, scroller, input } = timedScroller();
  scroller.step(input);
  const initial = container.scrollTop;
  scroller.step({ ...input, enabled: false });
  platform.advanceTime(5000);
  scroller.step(input);
  assert.equal(container.scrollTop, initial * 2);

  const fixture = scopeFixture({
    autoScroll: true, scrollableDone: true, doneItemIds: ['c', 'd', 'e', 'f'],
  });
  const destination = fixture.area('done');
  // Both gestures activate at the edge, without an intermediate off-edge move
  // that could hide a missing reset in the drag teardown.
  fixture.begin('done', 3);
  fixture.repeatMove();
  const firstGesture = destination.scrollTop;
  assert.ok(firstGesture > 0);
  fixture.scope.cancel();
  fixture.platform.advanceTime(5000);
  fixture.begin('done', 3);
  fixture.repeatMove();
  assert.ok(Math.abs(destination.scrollTop - firstGesture * 2) < 0.001);
  fixture.scope.destroy();
});

for (const sample of [
  { position: 0, x: 100, want: -20 },
  { position: -50, x: 100, want: -70 },
  { position: -190, x: 100, want: -200 },
  { position: -200, x: 100, want: -200 },
  { position: -50, x: 200, want: -30 },
  { position: -10, x: 200, want: 0 },
  { position: 0, x: 200, want: 0 },
]) {
  test(`RTL container scrolls within its negative range: ${JSON.stringify(sample)}`, () => {
    const platform = fakePlatform();
    const container = fakeElement('DIV', {
      ownerDocument: platform.document,
      rect: { left: 100, top: 100, right: 200, bottom: 200, width: 100, height: 100 },
      computedStyle: { overflowX: 'auto', direction: 'rtl' },
      clientWidth: 100, scrollWidth: 300, scrollLeft: sample.position,
    });
    createAutoScroller(platform).step({
      enabled: true, point: { x: sample.x, y: 150 }, hitChain: [container],
    });
    assert.equal(container.scrollLeft, sample.want);
  });
}

test('RTL page scrolling can start from its right edge and stops at its left edge', () => {
  const platform = fakePlatform();
  const root = platform.document.documentElement;
  Object.assign(root, { scrollWidth: 1224 });
  (root as unknown as ReturnType<typeof fakeElement>).computedStyle.direction = 'rtl';
  const scroller = createAutoScroller(platform);
  const input = { enabled: true, point: { x: 0, y: 300 }, hitChain: [] };
  assert.equal(scroller.step(input), platform.window);
  assert.equal(platform.window.scrollX, -20);
  Object.assign(platform.window, { scrollX: -200 });
  platform.advanceTime(1000 / 60);
  assert.equal(scroller.step(input), null);
  assert.equal(platform.window.scrollX, -200);
});
