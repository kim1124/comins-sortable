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
