<script lang="ts">
  import { tick } from 'svelte';
  import { createSortableScope, sortable } from '../../src/svelte.js';
  import type { AfterDragResult, FrameworkSortableChange } from '../../src/core.js';

  type Item = { id: string };
  const nestedParent = new URLSearchParams(location.search).has('nested-parent')
    ? { areaId: 'todo', itemId: 'a' } : undefined;
  let todo: Item[] = [{ id: 'a' }, { id: 'b' }];
  let done: Item[] = [{ id: 'c' }, { id: 'd' }];
  const eventLog: string[] = [];
  let rejectDone = false;
  let todoDisabled = false;
  let mounted = true;
  let commitChanges = true;
  let throwOnChange = false;
  let todoDirection: 'vertical' | 'horizontal' = 'vertical';
  let doneDirection: 'vertical' | 'horizontal' = 'vertical';
  let doneThreshold: number | undefined;
  let scopeDestroyed = false;
  let lastOperation: { operation: string; sourceAreaId: string; destinationAreaId: string; itemId: string; destinationIndex: number } | null = null;
  const createScope = () => createSortableScope<Item>({
    onBeforeDragStart: () => log('before'), onDragStart: () => log('start'), onDrag: () => log('drag'), onInsertDragArea: () => log('insert'),
    onChange: (change) => { lastOperation = { operation: change.operation, sourceAreaId: change.source.areaId, destinationAreaId: change.destination.areaId, itemId: String(change.itemId), destinationIndex: change.destination.index }; log('change'); if (throwOnChange) throw new Error('fixture change error'); },
    onAfterDrag: (result: AfterDragResult) => log(`after:${result.status}:${result.reason}`),
  });
  let scope = createScope();
  const log = (value: string) => {
    eventLog.push(value);
    const output = document.querySelector<HTMLOutputElement>('[data-test-events]');
    if (output !== null) output.value = eventLog.join(',');
  };
  $: todoOptions = { scope, areaId: 'todo', group: 'fixture', items: todo, itemKey: 'id', onItemsChange: (items: readonly Item[]) => { if (commitChanges) todo = [...items]; }, autoScroll: true, direction: todoDirection, disabled: todoDisabled };
  $: doneOptions = { scope, areaId: 'done', parent: nestedParent, group: 'fixture', items: done, itemKey: 'id', onItemsChange: (items: readonly Item[]) => { if (commitChanges) done = [...items]; }, autoScroll: true, direction: doneDirection, emptyInsertThreshold: doneThreshold, accept: () => !rejectDone };
  window.__sortableFixture = {
    state: () => ({ areas: { todo: todo.map((item) => item.id), done: done.map((item) => item.id) }, events: [...eventLog], lastOperation, resources: { activeSessions: document.querySelectorAll('[data-comins-sortable-dragging]').length, placeholders: document.querySelectorAll('[data-comins-sortable-placeholder]').length } }),
    controls: { horizontal: () => { todoDirection = 'horizontal'; }, emptyGeometry: () => { doneDirection = 'horizontal'; doneThreshold = 32; done = []; }, scrollable: () => { const scroll = document.querySelector<HTMLElement>('[data-test-scroll]'); scroll?.classList.add('scrollable'); if (scroll?.querySelector('[data-test-scroll-spacer]') === null) { const spacer = document.createElement('div'); spacer.setAttribute('data-test-scroll-spacer', ''); scroll?.append(spacer); } scroll?.scrollTo({ top: 100 }); }, outside: () => undefined, escape: () => undefined, 'pointer-cancel': () => [0, 1].forEach((pointerId) => document.dispatchEvent(new PointerEvent('pointercancel', { pointerId, bubbles: true }))), blur: () => window.dispatchEvent(new Event('blur')), disabled: () => { todoDisabled = true; }, reject: () => { rejectDone = true; }, unmount: () => { mounted = false; }, destroy: () => { scope.destroy(); scopeDestroyed = true; mounted = false; }, 'callback-error': () => { throwOnChange = true; }, 'state-not-committed': () => { commitChanges = false; }, remount: async () => { mounted = false; await tick(); if (scopeDestroyed) { scope = createScope(); scopeDestroyed = false; } todoDisabled = false; commitChanges = true; throwOnChange = false; todoDirection = 'vertical'; doneDirection = 'vertical'; doneThreshold = undefined; mounted = true; await tick(); } },
  };
</script>

<div class="svelte-fixture-probe" data-test-scroll>
  <section data-area-section="todo"><h2>Todo</h2>{#if mounted}<div data-test-area="todo" class:horizontal={todoDirection === 'horizontal'} role="list" use:sortable={todoOptions}>{#each todo as item (item.id)}<div tabindex="0" role="listitem" data-sortable-id={item.id} aria-label={`Item ${item.id}`} aria-selected="false">{item.id}</div>{/each}</div>{/if}</section>
  <section data-area-section="done"><h2>Done</h2>{#if mounted}<div data-test-area="done" class:horizontal={doneDirection === 'horizontal'} class:zero-primary-axis={doneDirection === 'horizontal' && doneThreshold !== undefined} role="list" use:sortable={doneOptions}>{#each done as item (item.id)}<div tabindex="0" role="listitem" data-sortable-id={item.id} aria-label={`Item ${item.id}`} aria-selected="false">{item.id}</div>{/each}</div>{/if}</section>
</div>
<button type="button" aria-label="Clear done" on:click={() => { done = []; }}>Clear done</button>
<output data-test-events></output>

<style>
  .svelte-fixture-probe { outline: 0 solid transparent; }
</style>
