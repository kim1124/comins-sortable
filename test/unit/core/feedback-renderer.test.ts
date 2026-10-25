import assert from 'node:assert/strict';
import test from 'node:test';
import type { SortableFeedbackContext, SortableFeedbackRenderer } from '../../../src/core.js';
import { createFeedback } from '../../../src/core/feedback.js';
import { fakeElement, fakePlatform, hasCode } from '../helpers/core-fixtures.js';
import { scopeFixture, assertOriginalDom } from '../helpers/scope-fixtures.js';

test('custom hosts render once, update only for semantic changes, and preserve the source parent', () => {
  const contexts: SortableFeedbackContext[] = [];
  let destroyed = 0;
  const render: SortableFeedbackRenderer = (context) => {
    contexts.push(context);
    context.container.textContent = String(context.itemId);
    return { update: (next) => contexts.push(next), destroy: () => { destroyed += 1; } };
  };
  const fixture = scopeFixture({ acceptDone: false });
  fixture.scope.updateArea('todo', { placeholder: { render }, dragOverlay: { render } });
  const source = fixture.item('todo', 0);
  fixture.begin('todo', 0);
  assert.equal(contexts.length, 2);
  assert.equal(source.parentElement, fixture.area('todo'));
  assert.equal(source.style.display, 'none');
  const overlay = fixture.platform.document.body.children[0];
  assert.equal(overlay?.hasAttribute('data-comins-sortable-overlay'), true);
  assert.equal(overlay?.getAttribute('aria-hidden'), 'true');
  assert.equal(overlay?.hasAttribute('inert'), true);
  assert.equal((overlay as HTMLElement).style.pointerEvents, 'none');
  fixture.repeatMove();
  fixture.repeatMove();
  assert.equal(contexts.length, 2);
  fixture.move('done', 0);
  assert.equal(contexts.length, 4);
  assert.equal(contexts[2]?.destination, null);
  assert.equal(contexts[2]?.rejection, 'not-accepted');
  fixture.repeatMove();
  assert.equal(contexts.length, 4);
  fixture.move('todo', 0);
  assert.equal(contexts.length, 6);
  assert.equal(contexts[4]?.rejection, null);
  assert.equal(Object.isFrozen(contexts[0]), true);
  assert.equal(Object.isFrozen(contexts[0]?.source), true);
  assert.equal(Object.isFrozen(contexts[0]?.itemIds), true);
  fixture.scope.cancel();
  assert.equal(destroyed, 2);
  assert.equal(source.style.display, '');
  assert.equal(fixture.placeholderCount(), 0);
  assert.equal(fixture.platform.document.body.children.length, 0);
  assertOriginalDom(fixture);
});

test('render options are captured at activation; later registrations use the new renderer', () => {
  const calls: string[] = [];
  const first = () => { calls.push('first'); };
  const second = () => { calls.push('second'); };
  const fixture = scopeFixture();
  fixture.scope.updateArea('todo', { placeholder: { render: first } });
  fixture.begin('todo', 0);
  fixture.scope.updateArea('todo', { placeholder: { render: second } });
  fixture.move('done', 0);
  fixture.scope.cancel();
  fixture.begin('todo', 0);
  fixture.scope.cancel();
  assert.deepEqual(calls, ['first', 'second']);
});

for (const phase of ['render', 'update', 'destroy'] as const) {
  test(`a renderer ${phase} exception cancels safely, restores styles and reports once`, () => {
    const expected = new Error(phase);
    const errors: unknown[] = [];
    let placeholderDestroyed = 0;
    let overlayDestroyed = 0;
    const fixture = scopeFixture({ onError: (error) => errors.push(error) });
    const source = fixture.item('todo', 0);
    source.style.display = 'list-item';
    source.style.transform = 'scale(1)';
    fixture.scope.updateArea('todo', {
      placeholder: { render: () => ({ destroy: () => { placeholderDestroyed += 1; } }) },
      dragOverlay: { render: () => {
        if (phase === 'render') throw expected;
        return {
          update: () => { if (phase === 'update') throw expected; },
          destroy: () => { overlayDestroyed += 1; if (phase === 'destroy') throw expected; },
        };
      } },
    });
    fixture.begin('todo', 0);
    if (phase === 'update') fixture.move('done', 0);
    if (phase === 'destroy') fixture.scope.cancel();
    assert.equal(fixture.results.length, 1);
    assert.equal(fixture.results[0]?.reason, 'error');
    assert.deepEqual(errors, [expected]);
    assert.equal(placeholderDestroyed, 1);
    assert.equal(overlayDestroyed, phase === 'render' ? 0 : 1);
    assert.equal(source.style.display, 'list-item');
    assert.equal(source.style.transform, 'scale(1)');
    assert.equal(fixture.placeholderCount(), 0);
    assert.equal(fixture.platform.document.body.children.length, 0);
    assertOriginalDom(fixture);
    fixture.scope.destroy();
  });
}

for (const phase of ['render', 'update', 'destroy', 'onDrag', 'onChange'] as const) {
  for (const action of ['cancel', 'destroy'] as const) {
    test(`${action} reentry from ${phase} completes one lifecycle and cleans both renderers`, () => {
      let handlesDestroyed = 0;
      let starts = 0;
      const fixture = scopeFixture({
        onDragStart: () => { starts += 1; },
        onDrag: () => { if (phase === 'onDrag') fixture.scope[action](); },
        onChange: () => { if (phase === 'onChange') fixture.scope[action](); },
      });
      const reenter = () => fixture.scope[action]();
      fixture.scope.updateArea('todo', {
        placeholder: { render: () => {
          if (phase === 'render') reenter();
          return {
            update: () => { if (phase === 'update') reenter(); },
            destroy: () => { handlesDestroyed += 1; if (phase === 'destroy') reenter(); },
          };
        } },
        dragOverlay: { render: () => ({ destroy: () => { handlesDestroyed += 1; } }) },
      });
      fixture.begin('todo', 0);
      if (phase === 'render') assert.equal(starts, 0);
      if (phase === 'update' || phase === 'onDrag' || phase === 'onChange') fixture.move('done', 0);
      if (phase === 'onChange') fixture.release();
      if (phase === 'destroy') fixture.scope.cancel();
      fixture.platform.flushFrame();
      assert.equal(fixture.results.length, 1);
      assert.equal(handlesDestroyed, phase === 'render' ? 1 : 2);
      assert.equal(fixture.placeholderCount(), 0);
      assert.equal(fixture.platform.document.body.children.length, 0);
      assert.equal(fixture.item('done', 0).style.position, '');
      fixture.scope.destroy();
    });
  }
}

test('custom copy overlay leaves the source unchanged and receives copy and selected IDs', () => {
  let context: SortableFeedbackContext | undefined;
  const fixture = scopeFixture({ groupTodo: { name: 'tasks', pull: 'copy' }, prepareCopy: () => 'copy-a' });
  fixture.scope.updateArea('todo', { dragOverlay: { render: (next) => { context = next; } } });
  const source = fixture.item('todo', 0);
  fixture.begin('todo', 0);
  assert.equal(context?.mode, 'copy');
  assert.deepEqual(context?.itemIds, ['a']);
  assert.equal(source.style.display, '');
  assert.equal(source.style.position, '');
  fixture.scope.cancel();
  assertOriginalDom(fixture);
});

test('table custom renderers are explicitly rejected before modifying source state', () => {
  const platform = fakePlatform();
  const source = fakeElement('TR', { ownerDocument: platform.document });
  assert.throws(() => createFeedback(source, platform, { render: () => undefined }), hasCode('INVALID_OPTION'));
  assert.equal(source.style.display, '');
  assert.equal(platform.document.body.children.length, 0);
});

test('invalid renderer options are rejected during registration updates', () => {
  const fixture = scopeFixture();
  for (const patch of [{ placeholder: { render: true } }, { dragOverlay: {} }, { dragOverlay: null }]) {
    assert.throws(() => fixture.scope.updateArea('todo', patch as never), hasCode('INVALID_OPTION'));
  }
  fixture.scope.destroy();
});

test('500 repeated renderer drags release both hosts, handles, listeners and frames', () => {
  let rendered = 0;
  let disposed = 0;
  let updated = 0;
  const render: SortableFeedbackRenderer = () => {
    rendered += 1;
    return { update: () => { updated += 1; }, destroy: () => { disposed += 1; } };
  };
  const fixture = scopeFixture();
  for (const areaId of ['todo', 'done']) fixture.scope.updateArea(areaId, { placeholder: { render }, dragOverlay: { render } });
  for (let cycle = 0; cycle < 500; cycle += 1) {
    const sourceArea = fixture.ids('todo').includes('a') ? 'todo' : 'done';
    const sourceIndex = fixture.ids(sourceArea).indexOf('a');
    const source = fixture.item(sourceArea, sourceIndex);
    fixture.begin(sourceArea, sourceIndex);
    fixture.move(sourceArea === 'todo' ? 'done' : 'todo', 0);
    if (cycle % 2 === 0) fixture.scope.cancel();
    else fixture.release();
    fixture.platform.flushFrame();
    assert.equal(fixture.platform.document.body.children.length, 0);
    assert.equal(fixture.placeholderCount(), 0);
    assert.equal(fixture.platform.listenerCount(), 0);
    assert.equal(fixture.platform.frameCount(), 0);
    assert.equal(source.style.position, '');
    assert.equal(source.style.display, '');
    assert.equal(source.hasAttribute('data-comins-sortable-dragging'), false);
  }
  assert.equal(rendered, 1000);
  assert.equal(disposed, 1000);
  assert.equal(updated, 1000);
  assert.equal(fixture.results.length, 500);
  assert.equal(fixture.results.filter((result) => result.reason === 'error').length, 0);
  fixture.scope.destroy();
});

for (const action of ['cancel', 'unregister', 'destroy'] as const) {
  test(`committing ${action} reports renderer destroy exceptions without escaping the owner call`, () => {
    const expected = new Error('renderer destroy');
    const errors: unknown[] = [];
    let handlesDestroyed = 0;
    const fixture = scopeFixture({ onError: (error) => errors.push(error) });
    const source = fixture.item('todo', 0);
    fixture.scope.updateArea('todo', {
      placeholder: { render: () => ({ destroy: () => { handlesDestroyed += 1; } }) },
      dragOverlay: { render: () => ({ destroy: () => {
        handlesDestroyed += 1;
        throw expected;
      } }) },
    });
    fixture.drop('todo', 0, 'done', 0);
    assert.equal(fixture.platform.frameCount(), 1);
    const terminate = action === 'unregister' ? fixture.unregister.todo : () => fixture.scope[action]();

    assert.doesNotThrow(terminate);
    fixture.platform.flushFrame();
    fixture.scope.destroy();
    fixture.unregister.todo();
    fixture.unregister.done();
    assert.deepEqual(errors, [expected]);
    assert.deepEqual(fixture.results, [{ status: 'cancelled', reason: 'error' }]);
    assert.equal(handlesDestroyed, 2);
    assert.equal(source.style.display, '');
    assert.equal(fixture.placeholderCount(), 0);
    assert.equal(fixture.platform.document.body.children.length, 0);
    assert.equal(fixture.platform.listenerCount(), 0);
    assert.equal(fixture.platform.frameCount(), 0);
  });
}

test('committing destroy reports renderer errors while preserving the first synchronous native cleanup error', () => {
  const rendererError = new Error('renderer destroy');
  const nativeError = new Error('native marker cleanup');
  const errors: unknown[] = [];
  const fixture = scopeFixture({ onError: (error) => errors.push(error) });
  fixture.scope.updateArea('todo', {
    dragOverlay: { render: () => ({ destroy: () => { throw rendererError; } }) },
  });
  fixture.drop('todo', 0, 'done', 0);
  const destination = fixture.area('done');
  const remove = destination.removeAttribute.bind(destination);
  destination.removeAttribute = (name: string) => {
    remove(name);
    if (name === 'data-comins-sortable-over') throw nativeError;
  };

  assert.throws(() => fixture.scope.destroy(), (error) => error === nativeError);
  assert.deepEqual(errors, [rendererError]);
  assert.deepEqual(fixture.results, [{ status: 'cancelled', reason: 'error' }]);
  assert.equal(fixture.placeholderCount(), 0);
  assert.equal(fixture.platform.document.body.children.length, 0);
  assert.equal(fixture.platform.listenerCount(), 0);
  assert.equal(fixture.platform.frameCount(), 0);
});
