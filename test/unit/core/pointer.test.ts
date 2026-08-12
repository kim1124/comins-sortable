import assert from 'node:assert/strict';
import test from 'node:test';

import { createPointerSensor } from '../../../src/core/pointer.js';
import {
  fakeElement,
  fakePlatform,
  pointer,
} from '../helpers/core-fixtures.js';

function sensorFixture(options: {
  handle?: string;
  ignore?: string;
} = {}) {
  const platform = fakePlatform();
  const events: string[] = [];
  const snapshots: Array<{ clientX: number; clientY: number }> = [];
  const sensor = createPointerSensor({
    activationDistance: 4,
    platform,
    handle: options.handle,
    ignore: options.ignore,
    onActivate: (snapshot) => {
      events.push('activate');
      snapshots.push(snapshot);
    },
    onMove: (snapshot) => {
      events.push('move');
      snapshots.push(snapshot);
    },
    onCancel: (reason) => events.push(`cancel:${reason}`),
    onRelease: () => events.push('release'),
  });

  return { events, platform, sensor, snapshots };
}

test('pointer accepts only primary and left-button mouse input', () => {
  const { events, platform, sensor } = sensorFixture();
  const item = fakeElement('LI');

  assert.equal(sensor.pointerDown(pointer({ isPrimary: false, target: item })), false);
  sensor.pointerMove(pointer({ clientX: 10, target: item }));
  platform.flushFrame();
  assert.equal(sensor.pointerDown(pointer({ button: 1, target: item })), false);
  sensor.pointerMove(pointer({ clientX: 10, target: item }));
  platform.flushFrame();

  assert.deepEqual(events, []);
  assert.equal(platform.listenerCount(), 0);
});

test('activation callback can reject a pending attempt without cancellation', () => {
  const platform = fakePlatform();
  const item = fakeElement('LI');
  const events: string[] = [];
  const sensor = createPointerSensor({
    activationDistance: 4,
    platform,
    onActivate: () => {
      events.push('activate');
      return false;
    },
    onMove: () => events.push('move'),
    onCancel: () => events.push('cancel'),
    onRelease: () => events.push('release'),
    onEnd: () => events.push('end'),
  });

  assert.equal(sensor.pointerDown(pointer({ target: item }), item), true);
  sensor.pointerMove(pointer({ clientX: 4, target: item }));
  platform.flushFrame();

  assert.deepEqual(events, ['activate', 'end']);
  assert.equal(platform.listenerCount(), 0);
  assert.deepEqual(item.releasedPointers, [1]);
});

test('explicit handle takes precedence over the ignore selector', () => {
  const { events, platform, sensor } = sensorFixture({
    handle: '.handle',
    ignore: 'button',
  });
  const item = fakeElement('LI');
  const ignored = fakeElement('BUTTON', { parentElement: item });
  const handle = fakeElement('BUTTON', {
    parentElement: item,
    selectors: ['.handle'],
  });
  item.fixtureChildren.push(ignored, handle);

  sensor.pointerDown(pointer({ target: ignored }), item);
  sensor.pointerMove(pointer({ clientX: 4, target: ignored }));
  platform.flushFrame();
  sensor.pointerDown(pointer({ target: handle }), item);
  sensor.pointerMove(pointer({ clientX: 4, target: handle }));
  platform.flushFrame();

  assert.deepEqual(events, ['activate']);
});

test('pointer activates at four CSS pixels and captures the active pointer', () => {
  const { events, platform, sensor, snapshots } = sensorFixture();
  const item = fakeElement('LI');

  sensor.pointerDown(pointer({ clientX: 10, clientY: 10, target: item }), item);
  sensor.pointerMove(pointer({ clientX: 12, clientY: 12, target: item }));
  platform.flushFrame();
  assert.deepEqual(events, []);

  sensor.pointerMove(pointer({ clientX: 14, clientY: 10, target: item }));
  platform.flushFrame();

  assert.deepEqual(events, ['activate']);
  assert.deepEqual(snapshots, [{
    type: 'mouse',
    clientX: 14,
    clientY: 10,
    deltaX: 4,
    deltaY: 0,
  }]);
  assert.deepEqual(item.capturedPointers, [1]);
});

test('pointer movement is coalesced to the latest coordinates once per frame', () => {
  const { events, platform, sensor, snapshots } = sensorFixture();
  const item = fakeElement('LI');
  sensor.pointerDown(pointer({ target: item }), item);
  sensor.pointerMove(pointer({ clientX: 4, target: item }));
  platform.flushFrame();

  sensor.pointerMove(pointer({ clientX: 5, clientY: 1, target: item }));
  sensor.pointerMove(pointer({ clientX: 8, clientY: 3, target: item }));
  assert.equal(platform.frameCount(), 1);
  platform.flushFrame();

  assert.deepEqual(events, ['activate', 'move']);
  assert.deepEqual(snapshots[snapshots.length - 1], {
    type: 'mouse',
    clientX: 8,
    clientY: 3,
    deltaX: 8,
    deltaY: 3,
  });
});

test('pointerup releases an active drag and clears capture and resources', () => {
  const { events, platform, sensor } = sensorFixture();
  const item = fakeElement('LI');
  sensor.pointerDown(pointer({ target: item }), item);
  sensor.pointerMove(pointer({ clientX: 4, target: item }));
  platform.flushFrame();

  platform.dispatchDocument('pointerup', pointer({ clientX: 5, target: item }));

  assert.deepEqual(events, ['activate', 'release']);
  assert.deepEqual(item.releasedPointers, [1]);
  assert.equal(platform.listenerCount(), 0);
  assert.equal(platform.frameCount(), 0);
});

test('pointer capture failure aborts activation and reports after cleanup', () => {
  const { events, platform, sensor } = sensorFixture();
  const item = fakeElement('LI');
  item.setPointerCapture = () => {
    throw new Error('capture failed');
  };
  sensor.pointerDown(pointer({ target: item }), item);
  sensor.pointerMove(pointer({ clientX: 4, target: item }));

  assert.doesNotThrow(() => platform.flushFrame());
  assert.deepEqual(events, []);
  assert.equal(platform.reports.length, 1);
  assert.equal(platform.listenerCount(), 0);
});

test('lost pointer capture cannot block release cleanup or the release callback', () => {
  const { events, platform, sensor } = sensorFixture();
  const item = fakeElement('LI');
  sensor.pointerDown(pointer({ target: item }), item);
  sensor.pointerMove(pointer({ clientX: 4, target: item }));
  platform.flushFrame();
  item.releasePointerCapture = () => {
    throw new Error('capture already lost');
  };

  assert.doesNotThrow(() => sensor.pointerUp(pointer({ target: item })));
  assert.deepEqual(events, ['activate', 'release']);
  assert.equal(platform.reports.length, 1);
  assert.equal(platform.listenerCount(), 0);
});

test('pointercancel, Escape, blur, and hidden document cancel with stable reasons', () => {
  const cases = [
    ['pointercancel', 'document', 'pointer-cancel'],
    ['keydown', 'document', 'escape'],
    ['blur', 'window', 'blur'],
    ['visibilitychange', 'document', 'blur'],
  ] as const;

  for (const [eventName, target, reason] of cases) {
    const { events, platform, sensor } = sensorFixture();
    const item = fakeElement('LI');
    sensor.pointerDown(pointer({ target: item }), item);
    sensor.pointerMove(pointer({ clientX: 4, target: item }));
    platform.flushFrame();
    if (eventName === 'visibilitychange') {
      platform.setVisibility('hidden');
    }
    const event = eventName === 'keydown' ? { key: 'Escape' } : pointer({ target: item });
    if (target === 'document') {
      platform.dispatchDocument(eventName, event);
    } else {
      platform.dispatchWindow(eventName, event);
    }

    assert.deepEqual(events, ['activate', `cancel:${reason}`]);
    assert.equal(platform.listenerCount(), 0);
    assert.equal(platform.frameCount(), 0);
  }
});

test('unmount and destroy cancel only an activated drag and are idempotent', () => {
  for (const [method, reason] of [
    ['unmount', 'unmounted'],
    ['destroy', 'destroyed'],
  ] as const) {
    const { events, platform, sensor } = sensorFixture();
    const item = fakeElement('LI');
    sensor.pointerDown(pointer({ target: item }), item);
    sensor.pointerMove(pointer({ clientX: 4, target: item }));
    platform.flushFrame();

    sensor[method]();
    sensor[method]();

    assert.deepEqual(events, ['activate', `cancel:${reason}`]);
    assert.equal(platform.listenerCount(), 0);
    assert.equal(platform.frameCount(), 0);
  }
});

test('owner cancellation uses the supplied approved reason', () => {
  const { events, platform, sensor } = sensorFixture();
  const item = fakeElement('LI');
  sensor.pointerDown(pointer({ target: item }), item);
  sensor.pointerMove(pointer({ clientX: 4, target: item }));
  platform.flushFrame();

  sensor.cancel('disabled');

  assert.deepEqual(events, ['activate', 'cancel:disabled']);
  assert.equal(platform.listenerCount(), 0);
});

test('pending pointer attempts end silently on release, unmount, and destroy', () => {
  for (const method of ['pointerUp', 'unmount', 'destroy'] as const) {
    const { events, platform, sensor } = sensorFixture();
    const item = fakeElement('LI');
    sensor.pointerDown(pointer({ target: item }), item);

    if (method === 'pointerUp') {
      sensor.pointerUp(pointer({ target: item }));
    } else {
      sensor[method]();
    }

    assert.deepEqual(events, []);
    assert.equal(platform.listenerCount(), 0);
    assert.equal(platform.frameCount(), 0);
  }
});

test('callback failure is reported after active cleanup without retaining resources', () => {
  const platform = fakePlatform();
  const item = fakeElement('LI');
  const cleanupCounts: number[] = [];
  const sensor = createPointerSensor({
    activationDistance: 4,
    platform,
    onActivate: () => {},
    onMove: () => {
      throw new Error('consumer failure');
    },
    onCancel: () => cleanupCounts.push(platform.listenerCount()),
    onRelease: () => {},
  });
  sensor.pointerDown(pointer({ target: item }), item);
  sensor.pointerMove(pointer({ clientX: 4, target: item }));
  platform.flushFrame();

  sensor.pointerMove(pointer({ clientX: 8, target: item }));
  platform.flushFrame();

  assert.equal(platform.reports.length, 1);
  assert.deepEqual(cleanupCounts, [0]);
  assert.equal(platform.listenerCount(), 0);
  assert.equal(platform.frameCount(), 0);
});
