import assert from 'node:assert/strict';
import test from 'node:test';

import { createSortableScope } from '../../../src/core.js';
import { createSortableScopeInternal } from '../../../src/core/scope.js';
import {
  fakeElement,
  fakePlatform,
  hasCode,
} from '../helpers/core-fixtures.js';
import {
  assertOriginalDom,
  scopeFixture,
} from '../helpers/scope-fixtures.js';

test('public scope can be created and destroyed without DOM globals', () => {
  const scope = createSortableScope();

  scope.cancel();
  scope.destroy();
  scope.destroy();
});

test('public scope binds its platform only after the first successful registration', () => {
  const firstPlatform = fakePlatform();
  const secondPlatform = fakePlatform();
  const invalidArea = fakeElement('UL', { ownerDocument: firstPlatform.document });
  const validArea = fakeElement('UL', { ownerDocument: secondPlatform.document });
  const validItem = fakeElement('LI', {
    ownerDocument: secondPlatform.document,
    attributes: {
      'data-sortable-item': '',
      'data-sortable-id': 'a',
    },
  });
  validArea.appendChild(validItem);
  const scope = createSortableScope();

  assert.throws(() => scope.registerArea(invalidArea, {
    areaId: 'invalid',
    item: '[',
  }), hasCode('INVALID_OPTION'));
  scope.registerArea(validArea, {
    areaId: 'valid',
    item: '[data-sortable-item]',
  });
  validArea.dispatch('pointerdown', {
    pointerId: 1,
    pointerType: 'mouse',
    clientX: 0,
    clientY: 0,
    isPrimary: true,
    button: 0,
    target: validItem,
  });

  assert.equal(firstPlatform.listenerCount(), 0);
  assert.equal(secondPlatform.listenerCount() > 0, true);
  scope.destroy();
});

test('scope validates selectors without exposing their values', () => {
  const platform = fakePlatform();
  const scope = createSortableScopeInternal({}, platform);
  const area = fakeElement('UL', { ownerDocument: platform.document });

  for (const options of [
    { item: '[' },
    { item: '[data-sortable-item]', handle: '[' },
    { item: '[data-sortable-item]', ignore: '[' },
  ]) {
    assert.throws(() => scope.registerArea(area, {
      areaId: 'todo',
      ...options,
    }), hasCode('INVALID_OPTION'));
  }
});

test('scope validates placeholder options before registering an area', () => {
  const platform = fakePlatform();
  const scope = createSortableScopeInternal({}, platform);
  const area = fakeElement('UL', { ownerDocument: platform.document });

  assert.throws(() => scope.registerArea(area, {
    areaId: 'invalid-preset',
    item: '[data-sortable-item]',
    placeholder: { preset: 'loading' as 'skeleton' },
  }), hasCode('INVALID_OPTION'));
  assert.throws(() => scope.registerArea(area, {
    areaId: 'invalid-class',
    item: '[data-sortable-item]',
    placeholder: { className: '   ' },
  }), hasCode('INVALID_OPTION'));
});

test('scope validates advanced sorting options before registering an area', () => {
  const platform = fakePlatform();
  const scope = createSortableScopeInternal({}, platform);

  for (const options of [
    { swapThreshold: -0.1 },
    { swapThreshold: 1.1 },
    { selectedClass: 'two classes' },
    { selectedClass: '  ' },
  ]) {
    const area = fakeElement('UL', { ownerDocument: platform.document });
    assert.throws(() => scope.registerArea(area, {
      areaId: `invalid-${String(options.swapThreshold ?? options.selectedClass)}`,
      item: '[data-sortable-item]',
      ...options,
    }), hasCode('INVALID_OPTION'));
  }
});

test('scope register, update, unregister, cancel, and destroy are idempotent', () => {
  const fixture = scopeFixture();

  fixture.scope.cancel();
  fixture.scope.updateArea('todo', { direction: 'horizontal' });
  fixture.unregister.todo();
  fixture.unregister.todo();
  fixture.scope.destroy();
  fixture.scope.destroy();

  assert.equal(fixture.platform.listenerCount(), 0);
});

test('uncommitted order is rejected and original DOM is preserved', () => {
  const fixture = scopeFixture({ commit: false });

  fixture.drop('todo', 1, 'done', 0);
  fixture.platform.flushFrame();

  assert.deepEqual(fixture.results[fixture.results.length - 1], {
    status: 'rejected',
    reason: 'state-not-committed',
  });
  assertOriginalDom(fixture);
});

test('scope reuses cached geometry across unchanged pointer frames', () => {
  const fixture = scopeFixture();
  let rectReads = 0;
  for (const element of fixture.elements()) {
    const readRect = element.getBoundingClientRect.bind(element);
    element.getBoundingClientRect = () => {
      rectReads += 1;
      return readRect();
    };
  }

  fixture.begin('todo', 0);
  fixture.move('done', 0);
  fixture.move('done', 0);
  const afterDirtyRefresh = rectReads;
  fixture.repeatMove();

  assert.equal(rectReads, afterDirtyRefresh);
});

test('quick release commits the latest queued pointer destination', () => {
  const fixture = scopeFixture();

  fixture.begin('todo', 1);
  fixture.queueMove('todo', 0);
  fixture.release();
  fixture.platform.flushFrame();

  assert.deepEqual(fixture.ids('todo'), ['b', 'a']);
});

test('multi drag supports additive and range selection then transfers as one group', () => {
  const changes: import('../../../src/core.js').SortableChange[] = [];
  const fixture = scopeFixture({
    todoItemIds: ['a', 'b', 'c', 'd'],
    doneItemIds: ['x'],
    multiDrag: true,
    selectedClass: 'is-selected',
    onChange: (change) => changes.push(change),
  });

  fixture.select('todo', 0, { ctrlKey: true });
  fixture.select('todo', 2, { shiftKey: true });
  assert.deepEqual(
    [0, 1, 2, 3].map((index) => fixture.item('todo', index).classList.contains('is-selected')),
    [true, true, true, false],
  );

  fixture.begin('todo', 1);
  fixture.move('done', 0);
  fixture.release();
  fixture.platform.flushFrame();

  assert.deepEqual(fixture.ids('todo'), ['d']);
  assert.deepEqual(fixture.ids('done'), ['a', 'b', 'c', 'x']);
  assert.deepEqual(changes[changes.length - 1]?.itemIds, ['a', 'b', 'c']);
});

test('multi drag compares same-area destinations in the selection-excluded index space', () => {
  const fixture = scopeFixture({
    todoItemIds: ['a', 'b', 'c', 'd', 'e'],
    doneItemIds: ['x'],
    multiDrag: true,
  });

  fixture.select('todo', 0, { ctrlKey: true });
  fixture.select('todo', 2, { shiftKey: true });
  fixture.begin('todo', 1);
  fixture.move('todo', 4);

  const placeholder = fixture.area('todo').querySelector(
    '[data-comins-sortable-placeholder]',
  );
  assert.equal(
    (placeholder?.nextSibling as Element | null)?.getAttribute('data-sortable-id'),
    'e',
  );
});

test('multi drag accepts Command/Meta as the additive selection modifier', () => {
  const fixture = scopeFixture({ multiDrag: true });

  fixture.select('todo', 0, { metaKey: true });
  fixture.select('todo', 1, { metaKey: true });

  assert.equal(fixture.item('todo', 0).hasAttribute('data-comins-sortable-selected'), true);
  assert.equal(fixture.item('todo', 1).hasAttribute('data-comins-sortable-selected'), true);
});

test('swap mode exchanges the source and hovered item instead of inserting', () => {
  const fixture = scopeFixture({
    todoItemIds: ['a', 'b', 'c', 'd'],
    doneItemIds: ['x'],
    swap: true,
  });

  fixture.begin('todo', 0);
  fixture.move('todo', 3);
  assert.equal(
    fixture.item('todo', 3).hasAttribute('data-comins-sortable-swap-target'),
    true,
  );
  fixture.release();
  fixture.platform.flushFrame();

  assert.deepEqual(fixture.ids('todo'), ['d', 'b', 'c', 'a']);
  assert.equal(fixture.results[fixture.results.length - 1]?.change?.operation, 'swap');
  assert.equal(fixture.area('todo').querySelector('[data-comins-sortable-swap-target]'), null);
});

test('copy drag leaves no source placeholder until it enters a destination', () => {
  const fixture = scopeFixture({
    groupTodo: { name: 'tasks', pull: 'copy' },
    prepareCopy: ({ itemId }) => `${String(itemId)}-copy`,
  });

  fixture.begin('todo', 0);
  assert.equal(fixture.placeholderCount(), 0);
  fixture.move('done', 0);
  assert.equal(fixture.placeholderCount(), 1);
  fixture.move('todo', 0);
  assert.equal(fixture.placeholderCount(), 0);
  fixture.move('done', 0);
  assert.equal(fixture.placeholderCount(), 1);
  fixture.release();
  fixture.platform.flushFrame();
  assert.deepEqual(fixture.ids('todo'), ['a', 'b']);
  assert.deepEqual(fixture.ids('done'), ['a-copy', 'c', 'd']);
});

test('end insertion keeps its placeholder before a trailing non-sortable slot', () => {
  const fixture = scopeFixture();
  const footer = fakeElement('DIV', {
    ownerDocument: fixture.platform.document,
    attributes: { 'data-demo-slot': 'footer' },
  });
  fixture.area('todo').appendChild(footer);

  fixture.begin('todo', 0);
  fixture.move('todo', 99);

  const placeholder = fixture.area('todo').querySelector(
    '[data-comins-sortable-placeholder]',
  );
  assert.equal(placeholder?.nextSibling, footer);
});

test('rejected destination exposes its reason during drag and clears it on exit', () => {
  const fixture = scopeFixture({ acceptDone: false });

  fixture.begin('todo', 0);
  fixture.move('done', 0);
  assert.equal(
    fixture.area('done').getAttribute('data-comins-sortable-rejection'),
    'not-accepted',
  );
  assert.equal(
    fixture.item('todo', 0).getAttribute('data-comins-sortable-rejection'),
    'not-accepted',
  );

  fixture.moveOutside();
  assert.equal(fixture.area('done').hasAttribute('data-comins-sortable-rejection'), false);
  assert.equal(fixture.item('todo', 0).hasAttribute('data-comins-sortable-rejection'), false);
  fixture.release();
});

test('activation-time ID failures report without starting an after-drag lifecycle', () => {
  const duplicateErrors: unknown[] = [];
  const duplicate = scopeFixture({ onError: (error) => { duplicateErrors.push(error); } });
  duplicate.item('todo', 1).setAttribute('data-sortable-id', 'a');
  duplicate.begin('todo', 0);

  assert.equal(duplicateErrors.some(hasCode('DUPLICATE_ITEM_ID')), true);
  assert.deepEqual(duplicate.results, []);
  assert.equal(duplicate.platform.listenerCount(), 0);

  const missingErrors: unknown[] = [];
  const missing = scopeFixture({ onError: (error) => { missingErrors.push(error); } });
  missing.item('todo', 0).removeAttribute('data-sortable-id');
  missing.begin('todo', 0);

  assert.equal(missingErrors.some(hasCode('MISSING_ITEM_ID')), true);
  assert.deepEqual(missing.results, []);
  assert.equal(missing.placeholderCount(), 0);
});

test('interaction getItemId errors are reported without escaping the event boundary', () => {
  const errors: unknown[] = [];
  let fail = false;
  const fixture = scopeFixture({
    getItemId: (element) => {
      if (fail) {
        throw new Error('consumer id failure');
      }
      return element.getAttribute('data-sortable-id') as string;
    },
    onError: (error) => { errors.push(error); },
  });
  fail = true;

  assert.doesNotThrow(() => fixture.begin('todo', 0));
  assert.equal(errors.length, 1);
  assert.deepEqual(fixture.results, []);
  assert.equal(fixture.platform.listenerCount(), 0);
});

test('pointerdown on a nested item descendant activates its direct sortable item', () => {
  const platform = fakePlatform();
  const starts: string[] = [];
  const scope = createSortableScopeInternal({
    onDragStart: (context) => { starts.push(String(context.itemId)); },
  }, platform);
  const area = fakeElement('UL', { ownerDocument: platform.document });
  const item = fakeElement('LI', {
    ownerDocument: platform.document,
    attributes: { 'data-sortable-item': '', 'data-sortable-id': 'a' },
  });
  const nested = fakeElement('SPAN', {
    ownerDocument: platform.document,
    attributes: { 'data-sortable-item': '' },
  });
  item.appendChild(nested);
  area.appendChild(item);
  scope.registerArea(area, { areaId: 'todo', item: '[data-sortable-item]' });

  const start = {
    pointerId: 1, pointerType: 'mouse', clientX: 0, clientY: 0,
    isPrimary: true, button: 0, target: nested,
  };
  area.dispatch('pointerdown', start);
  platform.dispatchDocument('pointermove', { ...start, clientX: 4 });
  platform.flushFrame();

  assert.deepEqual(starts, ['a']);
  scope.destroy();
});
