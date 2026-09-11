import assert from 'node:assert/strict';
import test from 'node:test';

import { PlaygroundRuntimeHost } from '../../../example/src/playground/runtime-host.js';
import type {
  PlaygroundBridge,
  PlaygroundDemoInput,
  PlaygroundDemoModule,
} from '../../../example/src/playground/types.js';

const input = (adapterId: PlaygroundDemoInput['adapterId']): PlaygroundDemoInput => ({
  adapterId,
  exampleId: 'simple',
  locale: 'ko',
});

const sink: PlaygroundBridge = {
  publishEvent: () => undefined,
  publishModel: () => undefined,
  publishOperation: () => undefined,
};

function moduleFor(
  adapterId: PlaygroundDemoInput['adapterId'],
  calls: string[],
): PlaygroundDemoModule {
  return {
    adapterId,
    source: `source:${adapterId}`,
    mount: () => {
      calls.push(`mount:${adapterId}`);
      return {
        destroy: () => calls.push(`destroy:${adapterId}`),
        dispatch: () => undefined,
        reset: () => undefined,
      };
    },
  };
}

function element(calls: string[] = []): HTMLElement {
  return {
    dataset: {},
    replaceChildren: () => calls.push('clear'),
  } as unknown as HTMLElement;
}

test('adapter transition destroys the previous runtime before mounting the next', async () => {
  const calls: string[] = [];
  const target = element(calls);
  const host = new PlaygroundRuntimeHost(target, sink);

  await host.mount(moduleFor('react', calls), input('react'));
  await host.mount(moduleFor('vue', calls), input('vue'));

  assert.deepEqual(calls, [
    'clear',
    'mount:react',
    'destroy:react',
    'clear',
    'mount:vue',
  ]);
  assert.equal(target.dataset.playgroundMounted, 'simple/vue');
});

test('stale bridge publications are ignored after adapter transition', async () => {
  const published: string[] = [];
  let firstBridge: PlaygroundBridge | undefined;
  const first: PlaygroundDemoModule = {
    adapterId: 'react',
    source: 'react source',
    mount: (_container, _input, bridge) => {
      firstBridge = bridge;
      return { destroy: () => undefined, dispatch: () => undefined, reset: () => undefined };
    },
  };
  const host = new PlaygroundRuntimeHost(element(), {
    publishEvent: (event) => published.push(event.name),
    publishModel: () => undefined,
    publishOperation: () => undefined,
  });

  await host.mount(first, input('react'));
  await host.mount(moduleFor('vue', []), input('vue'));
  firstBridge?.publishEvent({ name: 'late' });

  assert.deepEqual(published, []);
});

test('destroy is idempotent and releases the current runtime', async () => {
  const calls: string[] = [];
  const target = element(calls);
  const host = new PlaygroundRuntimeHost(target, sink);

  await host.mount(moduleFor('svelte', calls), input('svelte'));
  host.destroy();
  host.destroy();

  assert.deepEqual(calls, ['clear', 'mount:svelte', 'destroy:svelte', 'clear']);
  assert.equal(target.dataset.playgroundMounted, undefined);
});

test('drag selection guard ends on completion and cannot leak across runtime replacement', async () => {
  const target = element();
  const host = new PlaygroundRuntimeHost(target, sink);
  let bridge!: PlaygroundBridge;
  const module: PlaygroundDemoModule = {
    adapterId: 'react', source: '',
    mount: (_container, _input, next) => {
      bridge = next;
      return { destroy() {}, dispatch() {}, reset() {} };
    },
  };
  await host.mount(module, input('react'));
  bridge.publishEvent({ name: 'beforeDragStart' });
  assert.equal(target.dataset.playgroundDragging, undefined);
  bridge.publishEvent({ name: 'dragStart' });
  assert.equal(target.dataset.playgroundDragging, '');
  bridge.publishEvent({ name: 'afterDrag', status: 'cancelled', reason: 'escape' });
  assert.equal(target.dataset.playgroundDragging, undefined);
  bridge.publishEvent({ name: 'dragStart' });
  const stale = bridge;
  await host.mount(module, input('react'));
  assert.equal(target.dataset.playgroundDragging, undefined);
  stale.publishEvent({ name: 'dragStart' });
  assert.equal(target.dataset.playgroundDragging, undefined);
  bridge.publishEvent({ name: 'dragStart' });
  host.destroy();
  assert.equal(target.dataset.playgroundDragging, undefined);
});
