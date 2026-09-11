import assert from 'node:assert/strict';
import test from 'node:test';
import { scopeFixture } from '../helpers/scope-fixtures.js';
import { fakeElement } from '../helpers/core-fixtures.js';

function scrollingFixture() {
  const fixture = scopeFixture();
  Object.assign(fixture.platform.window, { scrollY: 100 });
  for (const element of fixture.elements()) {
    const read = element.getBoundingClientRect.bind(element);
    element.getBoundingClientRect = () => {
      const value = read();
      const offset = 100 - fixture.platform.window.scrollY;
      return { ...value, top: value.top + offset, bottom: value.bottom + offset };
    };
  }
  return fixture;
}

test('external scroll refreshes geometry before the next pointer movement', () => {
  const fixture = scrollingFixture();
  fixture.begin('todo', 1);
  Object.assign(fixture.platform.window, { scrollY: 60 });
  fixture.platform.dispatchWindow('scroll', { target: fixture.platform.document });
  fixture.move('todo', 0);
  fixture.release();
  fixture.platform.flushFrame();
  assert.deepEqual(fixture.ids('todo'), ['b', 'a']);
  fixture.scope.destroy();
});

test('external scroll updates a stationary pointer in one coalesced frame', () => {
  const fixture = scrollingFixture();
  fixture.begin('todo', 1);
  Object.assign(fixture.platform.window, { scrollY: 60 });
  fixture.platform.setHits([fixture.item('todo', 0), fixture.area('todo')]);
  for (let index = 0; index < 3; index++) {
    fixture.platform.dispatchWindow('scroll', { target: fixture.platform.document });
  }
  assert.equal(fixture.platform.frameCount(), 1);
  fixture.platform.flushFrame();
  fixture.release();
  fixture.platform.flushFrame();
  assert.deepEqual(fixture.ids('todo'), ['b', 'a']);
  fixture.scope.destroy();
});

test('release refreshes scrolled geometry before the scroll event is delivered', () => {
  const fixture = scrollingFixture();
  fixture.begin('todo', 1);
  Object.assign(fixture.platform.window, { scrollY: 60 });
  fixture.platform.setHits([fixture.item('todo', 0), fixture.area('todo')]);
  fixture.release();
  fixture.platform.flushFrame();
  assert.deepEqual(fixture.ids('todo'), ['b', 'a']);
  fixture.scope.destroy();
});

test('ancestor container scrolling refreshes a stationary pointer', () => {
  const fixture = scopeFixture({ todoItemIds: ['a', 'b', 'c'], doneItemIds: ['x', 'y'] });
  const container = fakeElement('DIV', { ownerDocument: fixture.platform.document });
  container.appendChild(fixture.area('todo'));
  for (const element of fixture.elements()) {
    if (!container.contains(element)) continue;
    const read = element.getBoundingClientRect.bind(element);
    element.getBoundingClientRect = () => {
      const value = read();
      return { ...value, top: value.top - container.scrollTop, bottom: value.bottom - container.scrollTop };
    };
  }
  fixture.begin('todo', 0);
  container.scrollTop = 30;
  fixture.platform.setHits([fixture.item('todo', 1), fixture.area('todo')]);
  fixture.platform.dispatchWindow('scroll', { target: container });
  fixture.platform.flushFrame();
  fixture.release();
  fixture.platform.flushFrame();
  assert.deepEqual(fixture.ids('todo'), ['b', 'a', 'c']);
  fixture.scope.destroy();
});

test('native auto-scroll notifications do not duplicate frames or scroll again on release', () => {
  const fixture = scopeFixture({ autoScroll: true, scrollableDone: true });
  fixture.begin('todo', 0);
  fixture.move('done', 2);
  const destination = fixture.area('done');
  assert.equal(destination.scrolledBy.length, 1);
  assert.equal(fixture.platform.frameCount(), 1);
  fixture.platform.dispatchWindow('scroll', { target: destination });
  assert.equal(fixture.platform.frameCount(), 1);
  destination.scrollTop += 10;
  fixture.platform.dispatchWindow('scroll', { target: destination });
  fixture.release();
  assert.equal(destination.scrolledBy.length, 1);
  fixture.platform.flushFrame();
  assert.equal(fixture.platform.frameCount(), 0);
  fixture.scope.destroy();
});

for (const signal of ['pointercancel', 'escape', 'blur', 'unmount', 'destroy'] as const) {
  test(`external scroll refresh is disposed on ${signal}`, () => {
    const fixture = scrollingFixture();
    fixture.begin('todo', 1);
    Object.assign(fixture.platform.window, { scrollY: 60 });
    fixture.platform.dispatchWindow('scroll', { target: fixture.platform.document });
    fixture.terminate(signal);
    assert.equal(fixture.platform.frameCount(), 0);
    assert.equal(fixture.placeholderCount(), 0);
    fixture.platform.dispatchWindow('scroll', { target: fixture.platform.document });
    assert.equal(fixture.platform.frameCount(), 0);
    fixture.scope.destroy();
    assert.equal(fixture.platform.listenerCount(), 0);
  });
}
