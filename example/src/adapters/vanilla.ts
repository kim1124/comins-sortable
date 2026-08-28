import { createSortable, type Sortable } from '../../../src/index.js';
import type { AfterDragResult, SortableChange } from '../../../src/core.js';
import type { PlaygroundDemoModule } from '../playground/types.js';
import {
  createDemoState,
  copyDemoItem,
  demoModel,
  demoTreeArea,
  hasSecondArea,
  isCopyExample,
  isNestedExample,
  placeholderForExample,
  playgroundOperation,
  type DemoItem,
} from './demo-data.js';
import source from './vanilla.ts?raw';

function card(item: DemoItem, withHandle: boolean): HTMLElement {
  const element = document.createElement('article');
  element.className = `cs-demo-card cs-demo-card--${item.tone}`;
  element.dataset.sortableId = item.id;
  element.setAttribute('role', 'listitem');
  element.tabIndex = 0;

  const handle = document.createElement('button');
  handle.type = 'button';
  handle.className = 'cs-demo-handle';
  handle.setAttribute('aria-label', `Drag ${item.title}`);
  handle.textContent = '⠿';

  const copy = document.createElement('span');
  copy.className = 'cs-demo-card__copy';
  const title = document.createElement('strong');
  title.textContent = item.title;
  const detail = document.createElement('small');
  detail.textContent = item.detail;
  copy.append(title, detail);

  if (withHandle) element.append(handle);
  element.append(copy);
  return element;
}

function area(areaId: 'todo' | 'done', title: string, items: readonly DemoItem[], withHandle: boolean): HTMLElement {
  const section = document.createElement('section');
  section.className = 'cs-demo-column';
  section.dataset.demoColumn = areaId;
  const heading = document.createElement('header');
  heading.innerHTML = `<div><strong>${title}</strong><small>${items.length} items</small></div>`;
  const list = document.createElement('div');
  list.className = 'cs-demo-list';
  list.dataset.demoArea = areaId;
  list.setAttribute('role', 'list');
  for (const item of items) list.append(card(item, withHandle));
  section.append(heading, list);
  return section;
}

function slot(position: 'header' | 'footer'): HTMLElement {
  const element = document.createElement('div');
  element.className = 'cs-demo-slot';
  element.dataset.demoSlot = position;
  element.textContent = `Pinned ${position}`;
  return element;
}

function table(items: readonly DemoItem[], columns: boolean): { table: HTMLTableElement; area: HTMLElement } {
  const element = document.createElement('table');
  element.className = 'cs-demo-table';
  element.dataset.demoColumn = 'todo';
  if (columns) {
    const thead = element.createTHead();
    const row = thead.insertRow();
    row.dataset.demoArea = 'todo';
    for (const item of items) {
      const heading = document.createElement('th');
      heading.className = 'cs-demo-column-header';
      heading.dataset.sortableId = item.id;
      heading.scope = 'col';
      heading.textContent = item.title;
      row.append(heading);
    }
    const detail = element.createTBody().insertRow();
    for (const item of items) detail.insertCell().textContent = item.detail;
    return { table: element, area: row };
  }
  const heading = element.createTHead().insertRow();
  for (const label of ['Task', 'Detail']) {
    const cell = document.createElement('th');
    cell.textContent = label;
    heading.append(cell);
  }
  const body = element.createTBody();
  body.dataset.demoArea = 'todo';
  for (const item of items) {
    const row = body.insertRow();
    row.className = 'cs-demo-row';
    row.dataset.sortableId = item.id;
    const title = document.createElement('th');
    title.scope = 'row';
    title.textContent = item.title;
    row.append(title);
    row.insertCell().textContent = item.detail;
  }
  return { table: element, area: body };
}

export const vanillaDemoModule: PlaygroundDemoModule = {
  adapterId: 'vanilla',
  source,
  mount(container, input, bridge) {
    let sortable: Sortable | null = null;
    let allowed = true;
    let destroyed = false;
    let copySequence = 0;
    let itemsById = new Map<string, DemoItem>();

    const publishModel = (): void => {
      const read = (areaId: string): string[] => Array.from(
        container.querySelectorAll(`[data-demo-area="${areaId}"] > [data-sortable-id]`),
        (element) => element.getAttribute('data-sortable-id') ?? '',
      );
      const model: Record<string, readonly string[]> = { todo: read('todo') };
      if (hasSecondArea(input.exampleId)) model.done = read('done');
      if (isNestedExample(input.exampleId)) model.child = read('child');
      bridge.publishModel(model);
    };

    const event = (name: string, result?: AfterDragResult): void => {
      bridge.publishEvent({ name, status: result?.status, reason: result?.reason });
    };

    const render = (): void => {
      sortable?.destroy();
      const state = createDemoState(input.exampleId);
      const treeRoot = input.exampleId === 'tree' ? demoTreeArea(state, 'todo') : null;
      const treeChild = input.exampleId === 'tree' ? demoTreeArea(state, 'child') : null;
      const todoItems = treeRoot?.items ?? state.todo;
      const childItems = treeChild?.items ?? state.child;
      copySequence = 0;
      itemsById = new Map(
        [...state.todo, ...state.done, ...state.child].map((item) => [item.id, item]),
      );
      allowed = true;
      container.replaceChildren();

      const board = document.createElement('div');
      board.className = `cs-demo-board${input.exampleId === 'auto-scroll' ? ' cs-demo-board--scroll' : ''}${isNestedExample(input.exampleId) ? ' cs-demo-board--nested' : ''}`;
      let todo: HTMLElement;
      let todoList: HTMLElement;
      if (input.exampleId === 'table' || input.exampleId === 'table-column') {
        const rendered = table(todoItems, input.exampleId === 'table-column');
        todo = rendered.table;
        todoList = rendered.area;
        board.append(todo);
      } else {
        todo = area('todo', input.locale === 'ko' ? '진행할 작업' : 'To do', todoItems, input.exampleId === 'handle');
        todoList = todo.querySelector<HTMLElement>('[data-demo-area="todo"]')!;
        if (input.exampleId === 'third-party' || input.exampleId === 'functional-third-party') {
          todoList.classList.add('cs-demo-component-host');
          todoList.dataset.demoComponentHost = 'vanilla';
        }
        if (input.exampleId === 'header-slot' || input.exampleId === 'two-list-slots') todoList.prepend(slot('header'));
        if (input.exampleId === 'footer-slot' || input.exampleId === 'two-list-slots') todoList.append(slot('footer'));
        board.append(todo);
      }
      let done: HTMLElement | null = null;
      if (hasSecondArea(input.exampleId)) {
        done = area('done', input.locale === 'ko' ? '완료' : 'Done', state.done, input.exampleId === 'handle');
        const doneList = done.querySelector<HTMLElement>('[data-demo-area="done"]')!;
        if (input.exampleId === 'two-list-slots') {
          doneList.prepend(slot('header'));
          doneList.append(slot('footer'));
        }
        board.append(done);
      }
      let childList: HTMLElement | null = null;
      if (isNestedExample(input.exampleId)) {
        const parent = todoList.querySelector<HTMLElement>('[data-sortable-id="research"]')!;
        const shell = document.createElement('div');
        shell.className = 'cs-demo-nested-shell';
        const title = document.createElement('strong');
        title.textContent = 'Research children';
        childList = document.createElement('div');
        childList.className = 'cs-demo-list cs-demo-list--nested';
        childList.dataset.demoArea = 'child';
        childList.setAttribute('role', 'list');
        if (input.exampleId === 'functional-third-party') {
          childList.classList.add('cs-demo-component-host');
          childList.dataset.demoComponentHost = 'vanilla';
        }
        for (const item of childItems) childList.append(card(item, false));
        shell.append(title, childList);
        parent.append(shell);
      }
      container.append(board);

      const onChange = (change: SortableChange): void => {
        event('change');
        bridge.publishOperation(playgroundOperation(change));
        publishModel();
      };
      const onAfterDrag = (result: AfterDragResult): void => {
        event('afterDrag', result);
        publishModel();
      };
      sortable = createSortable(todoList, {
        areaId: 'todo',
        group: input.exampleId === 'clone' || input.exampleId === 'custom-clone'
          ? { name: 'playground', pull: 'copy' }
          : input.exampleId === 'modifier-copy'
            ? {
                name: 'playground',
                pull: (context) => context.pointer.altKey ? 'copy' : 'move',
              }
            : 'playground',
        item: input.exampleId === 'table'
          ? '.cs-demo-row'
          : input.exampleId === 'table-column'
            ? '.cs-demo-column-header'
            : '.cs-demo-card',
        copyElement: isCopyExample(input.exampleId)
          ? (source) => {
              const sourceItem = itemsById.get(source.getAttribute('data-sortable-id') ?? '');
              if (sourceItem === undefined) throw new Error('Unknown demo copy source');
              const copy = copyDemoItem(sourceItem, input.exampleId, ++copySequence);
              itemsById.set(copy.id, copy);
              return card(copy, false);
            }
          : undefined,
        handle: input.exampleId === 'handle' ? '.cs-demo-handle' : undefined,
        autoScroll: input.exampleId === 'auto-scroll',
        animation: input.exampleId === 'transition'
          ? 180
          : input.exampleId === 'transitions'
            ? { duration: 280, easing: 'cubic-bezier(.2,.8,.2,1)' }
            : false,
        placeholder: placeholderForExample(input.exampleId),
        direction: input.exampleId === 'table-column' ? 'horizontal' : undefined,
        onBeforeDragStart: () => event('beforeDragStart'),
        onDragStart: () => event('dragStart'),
        onInsertDragArea: ({ destination }) => bridge.publishEvent({ name: 'insertDragArea', areaId: destination.areaId }),
        onChange,
        onAfterDrag,
      });
      if (done !== null) {
        sortable.registerArea(done.querySelector<HTMLElement>('[data-demo-area="done"]')!, {
          areaId: 'done',
          group: 'playground',
          item: '.cs-demo-card',
          emptyInsertThreshold: input.exampleId === 'empty' ? 42 : undefined,
          accept: input.exampleId === 'accept' ? () => allowed : undefined,
        });
      }
      if (childList !== null) {
        sortable.registerArea(childList, {
          areaId: 'child',
          group: 'playground',
          item: '.cs-demo-card',
          parent: treeChild?.parent ?? { areaId: 'todo', itemId: 'research' },
          animation: 160,
        });
      }
      bridge.publishOperation(null);
      publishModel();
    };

    render();

    return {
      dispatch(controlId, value) {
        if (controlId === 'accept-destination' && typeof value === 'boolean') allowed = value;
        const targetArea = controlId === 'reverse-child' ? 'child' : 'todo';
        if (controlId === 'reverse-items' || controlId === 'reverse-child') {
          const target = container.querySelector<HTMLElement>(`[data-demo-area="${targetArea}"]`);
          const items = Array.from(target?.children ?? []).filter((element) => element.hasAttribute('data-sortable-id'));
          for (const item of items.reverse()) target?.append(item);
          sortable?.refreshArea(targetArea);
          publishModel();
        }
      },
      reset: render,
      destroy() {
        if (destroyed) return;
        destroyed = true;
        sortable?.destroy();
        sortable = null;
        container.replaceChildren();
      },
    };
  },
};
