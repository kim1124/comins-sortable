import { createSortable, type Sortable } from '../../src/index.js';
import type { AfterDragResult, SortableChange } from '../../src/core.js';

const app = document.querySelector('#app');
if (app === null) throw new Error('Missing fixture root');

const parameters = new URLSearchParams(location.search);
const nestedParent = parameters.has('nested-parent')
  ? { areaId: 'todo', itemId: 'a' } : undefined;
const itemSelector = parameters.has('scoped-items') ? ':scope > .fixture-item' : ':scope > *';
const copyItems = parameters.has('copy-items');
if (parameters.has('page-scroll')) {
  const top = document.createElement('div'); top.style.height = '400px';
  const bottom = document.createElement('div'); bottom.style.height = '800px';
  document.body.prepend(top); document.body.append(bottom);
}

let sortable: Sortable | null = null;
let events: string[] = [];
let lastOperation: { operation: string; sourceAreaId: string; destinationAreaId: string; itemId: string; destinationIndex: number } | null = null;
let rejectDone = false;
let throwOnChange = false;
let unregisterDone: (() => void) | null = null;

function ids(areaId: string): string[] {
  return Array.from(document.querySelectorAll(`[data-test-area="${areaId}"] > [data-sortable-id]`), (element) => element.getAttribute('data-sortable-id') ?? '');
}
function sortableArea(areaId: string): HTMLElement | null { return document.querySelector(`[data-comins-sortable-area="${areaId}"]`); }
function log(value: string): void { events.push(value); document.querySelector<HTMLOutputElement>('[data-test-events]')!.value = events.join(','); }
function record(change: SortableChange): void {
  lastOperation = { operation: change.operation, sourceAreaId: change.source.areaId, destinationAreaId: change.destination.areaId, itemId: String(change.itemId), destinationIndex: change.destination.index };
}
function result(result: AfterDragResult): void { log(`after:${result.status}:${result.reason}`); }
function card(id: string): HTMLDivElement { const element = document.createElement('div'); element.className = 'fixture-item'; element.tabIndex = 0; element.setAttribute('role', 'listitem'); element.setAttribute('data-sortable-id', id); element.setAttribute('aria-label', `Item ${id}`); element.setAttribute('aria-selected', 'false'); element.textContent = id; return element; }
function section(id: string, title: string, values: string[]): HTMLElement {
  const sectionElement = document.createElement('section'); sectionElement.setAttribute('data-area-section', id);
  const heading = document.createElement('h2'); heading.textContent = title;
  const area = document.createElement('div'); area.setAttribute('data-test-area', id); area.setAttribute('role', 'list');
  for (const value of values) area.append(card(value));
  if (parameters.has('slots')) {
    const footer = document.createElement('footer'); footer.textContent = 'Footer'; footer.setAttribute('data-test-footer', id); area.append(footer);
  }
  sectionElement.append(heading, area); return sectionElement;
}
function mount(): void {
  sortable?.destroy(); events = []; lastOperation = null; rejectDone = false; throwOnChange = false; unregisterDone = null;
  app.replaceChildren(); const scroll = document.createElement('div'); scroll.setAttribute('data-test-scroll', '');
  scroll.append(section('todo', 'Todo', ['a', 'b']), section('done', 'Done', ['c', 'd']));
  const clear = document.createElement('button'); clear.type = 'button'; clear.setAttribute('aria-label', 'Clear done'); clear.textContent = 'Clear done';
  clear.addEventListener('click', () => document.querySelector('[data-test-area="done"]')?.replaceChildren());
  const output = document.createElement('output'); output.setAttribute('data-test-events', ''); app.append(scroll, clear, output);
  const todo = document.querySelector('[data-test-area="todo"]')!; const done = document.querySelector('[data-test-area="done"]')!;
  sortable = createSortable(todo, {
    areaId: 'todo', group: copyItems ? { name: 'fixture', pull: 'copy' } : 'fixture', item: itemSelector, autoScroll: true,
    swap: parameters.has('swap'),
    multiDrag: parameters.has('selection-lifecycle'),
    selectedClass: 'selection-before',
    copyElement: copyItems ? (source) => {
      const copy = source.cloneNode(true) as Element;
      copy.setAttribute('data-sortable-id', `${source.getAttribute('data-sortable-id')}-copy`);
      if (parameters.has('invalid-copy')) copy.classList.remove('fixture-item');
      return copy;
    } : undefined,
    onError: copyItems ? () => log('error') : undefined,
    onBeforeDragStart: () => { log('before'); }, onDragStart: (context) => {
      log('start');
      if (copyItems) log(`source:${context.source.areaId}:${context.itemId}`);
    }, onDrag: () => log('drag'), onInsertDragArea: () => log('insert'),
    onChange: (change) => { record(change); log('change'); if (throwOnChange) throw new Error('fixture change error'); }, onAfterDrag: result,
  });
  unregisterDone = sortable.registerArea(done, { areaId: 'done', parent: nestedParent, group: 'fixture', item: itemSelector, autoScroll: true, accept: () => !rejectDone });
  if (parameters.has('selection-lifecycle')) {
    const updateSelection = document.createElement('button');
    updateSelection.textContent = 'Update selected class';
    updateSelection.setAttribute('data-test-selection-class', '');
    updateSelection.addEventListener('click', () => sortable?.updateArea('todo', {
      selectedClass: 'selection-after',
    }));
    app.append(updateSelection);
  }
}
mount();

window.__sortableFixture = {
  state: () => ({ areas: { todo: ids('todo'), done: ids('done') }, events: [...events], lastOperation, resources: { activeSessions: document.querySelectorAll('[data-comins-sortable-dragging]').length, placeholders: document.querySelectorAll('[data-comins-sortable-placeholder]').length } }),
  controls: {
    horizontal: () => { sortable?.updateArea('todo', { direction: 'horizontal' }); sortableArea('todo')?.classList.add('horizontal'); },
    emptyGeometry: () => { sortable?.updateArea('done', { direction: 'horizontal', emptyInsertThreshold: 32 }); const done = sortableArea('done'); done?.classList.add('horizontal', 'zero-primary-axis'); done?.replaceChildren(); },
    scrollable: () => { const scroll = document.querySelector<HTMLElement>('[data-test-scroll]'); scroll?.classList.add('scrollable'); if (scroll?.querySelector('[data-test-scroll-spacer]') === null) { const spacer = document.createElement('div'); spacer.setAttribute('data-test-scroll-spacer', ''); scroll?.append(spacer); } scroll?.scrollTo({ top: 100 }); },
    outside: () => undefined,
    escape: () => undefined,
    'pointer-cancel': () => [0, 1].forEach((pointerId) => document.dispatchEvent(new PointerEvent('pointercancel', { pointerId, bubbles: true }))),
    blur: () => window.dispatchEvent(new Event('blur')),
    disabled: () => sortable?.updateArea('todo', { disabled: true }),
    reject: () => { rejectDone = true; },
    unmount: () => { unregisterDone?.(); document.querySelector('[data-area-section="done"]')?.remove(); },
    destroy: () => sortable?.destroy(),
    'callback-error': () => { throwOnChange = true; },
    'state-not-committed': () => undefined,
    remount: mount,
  },
};
