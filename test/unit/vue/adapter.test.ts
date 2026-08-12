import assert from 'node:assert/strict';
import test from 'node:test';
import { h } from 'vue';
import { renderToString } from 'vue/server-renderer';

import {
  vueAdapterHarness,
  vueDoneProps,
  vueTodoProps,
  type Task,
} from '../helpers/framework-fixtures.js';
import { hasCode, dragContext, fakeElement, fakePlatform, pointer } from '../helpers/core-fixtures.js';
import { createSortableScopeInternal } from '../../../src/core/scope.js';
import { SortableArea, SortableRoot } from '../../../src/vue.js';
import {
  createVueSortableController,
  handleAfterDrag,
  type VueSortableController,
} from '../../../src/vue/context.js';
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
