import assert from 'node:assert/strict';
import test from 'node:test';
import { createRenderer, defineComponent, h, nextTick, provide, reactive } from 'vue';
import type { Renderer } from 'vue';
import { renderToString } from 'vue/server-renderer';

import {
  vueAdapterHarness,
  vueDoneProps,
  vueTodoProps,
  type Task,
} from '../helpers/framework-fixtures.js';
import {
  hasCode,
  fakeElement,
  fakePlatform,
  pointer,
  type FakeElement,
} from '../helpers/core-fixtures.js';
import { createSortableScopeInternal } from '../../../src/core/scope.js';
import { SortableArea, SortableRoot } from '../../../src/vue.js';
import {
  createVueSortableController,
  handleAfterDrag,
  VueSortableContext,
  type VueSortableController,
} from '../../../src/vue/context.js';
import { createReactSortableController } from '../../../src/react/context.js';
import { createVueAreaLifecycle, itemIdForElement } from '../../../src/vue/lifecycle.js';

test('transfer emits both model updates before one Root change', () => {
  const harness = vueAdapterHarness<Task>();
  harness.mountRoot();
  harness.mountArea(vueTodoProps());
  harness.mountArea(vueDoneProps());

  harness.transfer('b', 'todo', 1, 'done', 1);

  assert.deepEqual(harness.calls, [
    'update:todo:a',
    'update:done:c,b',
    'change:transfer',
  ]);
});

test('Area update replaces current items without re-registering', () => {
  const harness = vueAdapterHarness<Task>();
  harness.mountRoot();
  const area = harness.mountArea(vueTodoProps());

  area.update({ ...vueTodoProps(), disabled: true });

  assert.equal(harness.registrationCount('todo'), 1);
  assert.equal(harness.area('todo').disabled, true);
});

test('mount-unmount-mount leaves one registration', () => {
  const harness = vueAdapterHarness<Task>();
  const area = harness.mountArea(vueTodoProps());
  area.dispose();
  harness.mountArea(vueTodoProps());

  assert.equal(harness.registrationCount('todo'), 1);
});

test('an Area without Root owns and cleans up a one-area scope', () => {
  const harness = vueAdapterHarness<Task>();
  const area = harness.mountArea(vueTodoProps());

  assert.equal(harness.scopeCount(), 1);
  area.dispose();
  assert.equal(harness.destroyCount(), 1);
});

test('shared lifecycle uses the latest model and emit callback without registration churn', () => {
  const calls: string[] = [];
  let binding: Parameters<VueSortableController<Task>['registerArea']>[1] | undefined;
  const controller: VueSortableController<Task> = {
    registerArea(_element, nextBinding) {
      binding = nextBinding;
      calls.push('register');
      return () => calls.push('unregister');
    },
    updateArea: () => calls.push('update'),
    destroy: () => calls.push('destroy'),
  };
  const element = { children: [] } as unknown as HTMLDivElement;
  const emitted: (readonly Task[])[] = [];
  let props = vueTodoProps();
  const lifecycle = createVueAreaLifecycle({
    controller,
    props: () => props,
    emitModelValue: (items) => emitted.push(items),
  });

  lifecycle.setElement(element);
  props = { ...props, modelValue: [{ id: 'c' }], itemKey: 'id' };
  lifecycle.update(props);
  binding?.setItems([{ id: 'd' }]);

  assert.deepEqual(calls, ['register']);
  assert.equal(binding?.getItemId({ id: 'c' }), 'c');
  assert.deepEqual(emitted, [[{ id: 'd' }]]);
});

test('shared lifecycle unregisters an old area before registering its replacement', () => {
  const calls: string[] = [];
  const controller: VueSortableController<Task> = {
    registerArea(_element, _binding, options) {
      calls.push(`register:${options.areaId}`);
      return () => calls.push(`unregister:${options.areaId}`);
    },
    updateArea: () => calls.push('update'),
    destroy: () => calls.push('destroy'),
  };
  const props = vueTodoProps();
  const lifecycle = createVueAreaLifecycle({
    controller,
    props: () => props,
    emitModelValue: () => undefined,
  });

  lifecycle.setElement({ children: [] } as unknown as HTMLDivElement);
  lifecycle.update({ ...props, areaId: 'done' });

  assert.deepEqual(calls, ['register:todo', 'unregister:todo', 'register:done']);
});

test('public Area unregisters its old reactive area ID before registering the new one', async () => {
  const calls: string[] = [];
  const controller = trackingController(calls);
  const state = reactive({
    areaId: 'todo', modelValue: [{ id: 'a' }], itemKey: 'id' as const,
  });
  const { render, container } = mountPublicVueArea(state, controller);

  state.areaId = 'done';
  await nextTick();
  render(null, container);

  assert.deepEqual(calls, [
    'register:todo',
    'unregister:todo',
    'register:done',
    'unregister:done',
  ]);
});

test('public Area preserves omitted autoScroll and updates explicit Boolean values once', async () => {
  const calls: string[] = [];
  const registered: import('../../../src/core.js').SortableAreaOptions[] = [];
  const updates: import('../../../src/core.js').SortableAreaPatch[] = [];
  const controller = trackingController(calls, registered, updates);
  const state = reactive({
    areaId: 'todo', modelValue: [{ id: 'a' }], itemKey: 'id' as const,
    autoScroll: undefined as boolean | undefined,
  });
  const { render, container } = mountPublicVueArea(state, controller);

  assert.equal(registered[0]?.autoScroll, undefined);
  state.autoScroll = false;
  await nextTick();
  state.autoScroll = true;
  await nextTick();
  render(null, container);

  assert.deepEqual(updates.map((patch) => patch.autoScroll), [false, true]);
  assert.deepEqual(calls, ['register:todo', 'update:todo', 'update:todo', 'unregister:todo']);
});

test('a non-drop result restores controlled arrays before the consumer callback', () => {
  const states: (readonly Task[])[] = [];
  const harness = vueAdapterHarness<Task>();
  harness.mountRoot({ onAfterDrag: () => states.push(harness.items('todo')) });
  harness.mountArea(vueTodoProps());
  harness.mountArea(vueDoneProps());

  harness.beginTransfer('b', 'todo', 1, 'done', 0);
  harness.cancel();

  assert.deepEqual(harness.items('todo'), [{ id: 'a' }, { id: 'b' }]);
  assert.deepEqual(states, [[{ id: 'a' }, { id: 'b' }]]);
});

test('rollback errors do not skip the consumer callback and preserve the first error', () => {
  const errors: unknown[] = [];
  const callbacks: string[] = [];
  const transaction = {
    finish() {},
    rollback() { throw new Error('rollback failed'); },
  } as never;

  assert.throws(() => handleAfterDrag(transaction, {
    onAfterDrag: () => callbacks.push('after'),
  }, { status: 'cancelled', reason: 'escape' }), /rollback failed/);
  errors.push(...callbacks);

  assert.deepEqual(errors, ['after']);
});

test('activation rejects a direct-child count mismatch including zero children', () => {
  const area = { children: [] as Element[] } as unknown as HTMLDivElement;
  const child = { parentElement: area, hasAttribute: () => false } as unknown as Element;
  const getItemId = itemIdForElement(
    () => area,
    () => ({
      areaId: 'todo',
      modelValue: [{ id: 'a' }],
      itemKey: 'id',
    }),
  );

  assert.throws(() => getItemId(child), hasCode('INVALID_ELEMENT'));
});

test('the Core error boundary receives structural activation failures before consumers', () => {
  const platform = fakePlatform();
  const errors: unknown[] = [];
  let consumerCalls = 0;
  const controller = createVueSortableController<Task>({
    getRootOptions: () => ({
      onBeforeDragStart: () => { consumerCalls += 1; },
      onChange: () => { consumerCalls += 1; },
      onAfterDrag: () => { consumerCalls += 1; },
      onError: (error) => errors.push(error),
    }),
    createScope: (options) => createSortableScopeInternal(options, platform),
  });
  const sourceArea = fakeElement('UL', { ownerDocument: platform.document, selectors: [':scope > *'] });
  const source = fakeElement('LI', { ownerDocument: platform.document, selectors: [':scope > *'] });
  sourceArea.appendChild(source);
  const destinationArea = fakeElement('UL', { ownerDocument: platform.document, selectors: [':scope > *'] });
  controller.registerArea(sourceArea, binding('todo', sourceArea, [{ id: 'a' }]), areaOptions('todo', 'a'));
  controller.registerArea(destinationArea, binding('done', destinationArea, [{ id: 'b' }]), areaOptions('done', 'b'));
  const down = pointer({ target: source, clientX: 1, clientY: 1 });
  platform.setHits([source, sourceArea]);
  sourceArea.dispatch('pointerdown', down);
  platform.dispatchDocument('pointermove', pointer({ ...down, target: source, clientX: 5 }));
  platform.flushFrame();

  assert.equal((errors[0] as { code?: string }).code, 'INVALID_ELEMENT');
  assert.equal(consumerCalls, 0);
});

test('Vue Core error wrapper preserves fallback, consumer, and throwing-handler boundaries', () => {
  const consumerError = new Error('Vue consumer error');
  const absent = structuralActivationFailure((platform, onChange) => createVueSortableController<Task>({
    getRootOptions: () => ({ onChange }),
    createScope: (options) => createSortableScopeInternal(options, platform),
  }));
  const received: unknown[] = [];
  const present = structuralActivationFailure((platform, onChange) => createVueSortableController<Task>({
    getRootOptions: () => ({ onChange, onError: (error) => received.push(error) }),
    createScope: (options) => createSortableScopeInternal(options, platform),
  }));
  const throwing = structuralActivationFailure((platform, onChange) => createVueSortableController<Task>({
    getRootOptions: () => ({ onChange, onError: () => { throw consumerError; } }),
    createScope: (options) => createSortableScopeInternal(options, platform),
  }));

  assert.equal((absent.reports[0] as { code?: string }).code, 'INVALID_ELEMENT');
  assert.equal(absent.setterCalls, 0);
  assert.equal(absent.changeCalls, 0);
  assert.equal((received[0] as { code?: string }).code, 'INVALID_ELEMENT');
  assert.deepEqual(present.reports, []);
  assert.equal(present.setterCalls, 0);
  assert.equal(present.changeCalls, 0);
  assert.deepEqual(throwing.reports, [consumerError]);
  assert.equal(throwing.setterCalls, 0);
  assert.equal(throwing.changeCalls, 0);
});

test('React Core error wrapper reports structural failures without a consumer handler', () => {
  const result = structuralActivationFailure((platform, onChange) => createReactSortableController<Task>({
    getRootProps: () => ({ onChange }),
    createScope: (options) => createSortableScopeInternal(options, platform),
  }));

  assert.equal((result.reports[0] as { code?: string }).code, 'INVALID_ELEMENT');
  assert.equal(result.setterCalls, 0);
  assert.equal(result.changeCalls, 0);
});

test('public components SSR-render a provider-only Root and one direct Area div', async () => {
  const markup = await renderToString(h(SortableRoot<Task>, null, {
    default: () => h(SortableArea<Task>, {
      areaId: 'todo',
      modelValue: [{ id: 'a' }],
      itemKey: 'id',
      'onUpdate:modelValue': () => undefined,
    }, { item: ({ item }: { item: Task }) => h('span', item.id) }),
  }));

  assert.equal(markup, '<!--[--><div data-comins-sortable-area="todo"><!--[--><span>a</span><!--]--></div><!--]-->');
});

function binding(areaId: string, element: Element, modelValue: readonly Task[]) {
  return {
    areaId,
    group: 'tasks',
    getItems: () => modelValue,
    getItemId: (item: Task) => item.id,
    setItems: () => undefined,
    getElement: () => element,
  };
}

function areaOptions(areaId: string, itemId: string) {
  return { areaId, group: 'tasks', item: ':scope > *', getItemId: () => itemId };
}

function trackingController(
  calls: string[],
  registered: import('../../../src/core.js').SortableAreaOptions[] = [],
  updates: import('../../../src/core.js').SortableAreaPatch[] = [],
): VueSortableController<Task> {
  return {
    registerArea(_element, _binding, options) {
      calls.push(`register:${options.areaId}`);
      registered.push(options);
      return () => calls.push(`unregister:${options.areaId}`);
    },
    updateArea(areaId, patch) {
      calls.push(`update:${areaId}`);
      updates.push(patch);
    },
    destroy() {},
  };
}

function mountPublicVueArea(
  state: {
    areaId: string;
    modelValue: { id: string }[];
    itemKey: 'id';
    autoScroll?: boolean | undefined;
  },
  controller: VueSortableController<Task>,
): { render: Renderer<FakeElement>['render']; container: FakeElement } {
  const renderer = testRenderer();
  const container = fakeElement('ROOT');
  const Host = defineComponent({
    setup() {
      provide(VueSortableContext, controller);
      return () => {
        const props: Record<string, unknown> = {
          areaId: state.areaId,
          modelValue: state.modelValue,
          itemKey: state.itemKey,
        };
        if (state.autoScroll !== undefined) props.autoScroll = state.autoScroll;
        return h(SortableArea as unknown as import('vue').Component, props, {
          item: ({ item }: { item: Task }) => h('span', item.id),
        });
      };
    },
  });
  renderer.render(h(Host), container);
  return { render: renderer.render, container };
}

function testRenderer(): Renderer<FakeElement> {
  return createRenderer<FakeElement, FakeElement>({
    patchProp(element, key, _previous, next) {
      if (key !== 'key' && next !== undefined && next !== null) {
        element.setAttribute(key, String(next));
      }
    },
    insert(child, parent, anchor) { parent.insertBefore(child, anchor ?? null); },
    remove(child) { child.remove(); },
    createElement(type) { return fakeElement(type.toUpperCase()); },
    createText(text) { return fakeElement('#TEXT', { textContent: text }); },
    createComment(text) { return fakeElement('#COMMENT', { textContent: text }); },
    setText(node, text) { node.textContent = text; },
    setElementText(node, text) { node.textContent = text; },
    parentNode(node) { return node.parentElement as FakeElement | null; },
    nextSibling(node) { return node.nextSibling as FakeElement | null; },
  });
}

function structuralActivationFailure(
  createController: (
    platform: ReturnType<typeof fakePlatform>,
    onChange: () => void,
  ) => {
    registerArea: VueSortableController<Task>['registerArea'];
  },
): { reports: unknown[]; setterCalls: number; changeCalls: number } {
  const platform = fakePlatform();
  let setterCalls = 0;
  let changeCalls = 0;
  const controller = createController(platform, () => { changeCalls += 1; });
  const sourceArea = fakeElement('UL', { ownerDocument: platform.document, selectors: [':scope > *'] });
  const source = fakeElement('LI', { ownerDocument: platform.document, selectors: [':scope > *'] });
  sourceArea.appendChild(source);
  const destinationArea = fakeElement('UL', { ownerDocument: platform.document, selectors: [':scope > *'] });
  controller.registerArea(sourceArea, {
    areaId: 'todo', group: 'tasks', getItems: () => [{ id: 'a' }],
    getItemId: (item) => item.id, setItems: () => { setterCalls += 1; }, getElement: () => sourceArea,
  }, areaOptions('todo', 'a'));
  controller.registerArea(destinationArea, {
    areaId: 'done', group: 'tasks', getItems: () => [{ id: 'b' }],
    getItemId: (item) => item.id, setItems: () => { setterCalls += 1; }, getElement: () => destinationArea,
  }, areaOptions('done', 'b'));
  const down = pointer({ target: source, clientX: 1, clientY: 1 });
  platform.setHits([source, sourceArea]);
  sourceArea.dispatch('pointerdown', down);
  platform.dispatchDocument('pointermove', pointer({ ...down, target: source, clientX: 5 }));
  platform.flushFrame();
  return { reports: platform.reports, setterCalls, changeCalls };
}
