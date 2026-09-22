import { createSortable, type Sortable } from '../../../src/index.js';
import type { AfterDragResult, SortableChange } from '../../../src/core.js';
import type { PlaygroundDemoModule } from '../playground/types.js';
import {
  createDemoState,
  copyDemoItem,
  demoModel,
  demoTreeArea,
  demoTreeAreas,
  treeChildAreaId,
  applyDemoChange,
  reverseDemoChildren,
  hasSecondArea,
  isCopyExample,
  isNestedExample,
  placeholderForExample,
  playgroundOperation,
  type DemoItem,
} from './demo-data.js';
import source from './vanilla.ts?raw';

function card(item: DemoItem): HTMLElement {
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

  element.append(handle);
  element.append(copy);
  return element;
}

function area(areaId: 'todo' | 'done', title: string, items: readonly DemoItem[]): HTMLElement {
  const section = document.createElement('section');
  section.className = 'cs-demo-column';
  section.dataset.demoColumn = areaId;
  const heading = document.createElement('header');
  heading.innerHTML = `<div><strong>${title}</strong><small>${items.length} items</small></div>`;
  const list = document.createElement('div');
  list.className = 'cs-demo-list';
  list.dataset.demoArea = areaId;
  list.setAttribute('role', 'list');
  for (const item of items) list.append(card(item));
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

export const vanillaDemoModule: PlaygroundDemoModule = {
  adapterId: 'vanilla',
  source,
  mount(container, input, bridge) {
    let sortable: Sortable | null = null;
    let state = createDemoState(input.exampleId);
    let locale = input.locale;
    let allowed = true;
    let destroyed = false;
    let copySequence = 0;
    let swapThreshold = 0.5;
    let invertSwap = false;
    let itemsById = new Map<string, DemoItem>();

    const publishModel = (): void => {
      if (state.tree !== undefined) { bridge.publishModel(demoModel(state)); return; }
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

    const renderTree = (): void => {
      const hosts = new Map<string, HTMLElement>();
      const treeArea = (areaId: string): HTMLElement => {
        const current = demoTreeArea(state, areaId);
        const list = document.createElement('div');
        list.className = 'cs-demo-list cs-demo-tree-list';
        list.dataset.demoArea = areaId;
        list.setAttribute('role', 'list');
        hosts.set(areaId, list);
        for (const item of current.items) {
          const element = card(item);
          if (item.acceptsChildren) {
            const shell = document.createElement('div');
            shell.className = 'cs-demo-nested-shell';
            const label = document.createElement('strong');
            label.dataset.childrenTitle = item.title;
            label.textContent = `${item.title} ${locale === 'ko' ? '하위 항목' : 'children'}`;
            shell.append(label, treeArea(treeChildAreaId(item)));
            element.append(shell);
          }
          list.append(element);
        }
        return list;
      };
      const section = document.createElement('section');
      section.className = 'cs-demo-column cs-demo-tree';
      section.dataset.demoColumn = 'todo';
      const root = treeArea('todo');
      section.append(root);
      container.append(section);
      sortable = createSortable(root, {
        areaId: 'todo', group: 'playground', item: '.cs-demo-card', handle: '.cs-demo-handle',
        onBeforeDragStart: () => event('beforeDragStart'),
        onDragStart: ({ source, itemId }) => bridge.publishEvent({ name: 'dragStart', areaId: source.areaId, itemId: String(itemId) }),
        onInsertDragArea: ({ destination }) => bridge.publishEvent({ name: 'insertDragArea', areaId: destination.areaId }),
        onChange(change) {
          state = applyDemoChange(state, change);
          for (const area of demoTreeAreas(state)) {
            if (area.parent !== undefined) sortable?.updateArea(area.areaId, { parent: area.parent });
          }
          event('change');
          bridge.publishOperation(playgroundOperation(change));
          publishModel();
        },
        onAfterDrag(result) { event('afterDrag', result); publishModel(); },
      });
      for (const current of demoTreeAreas(state)) {
        if (current.parent === undefined) continue;
        sortable.registerArea(hosts.get(current.areaId)!, {
          areaId: current.areaId, group: 'playground', item: '.cs-demo-card', handle: '.cs-demo-handle', parent: current.parent,
        });
      }
      bridge.publishOperation(null);
      publishModel();
    };

    const render = (): void => {
      sortable?.destroy();
      state = createDemoState(input.exampleId);
      const treeRoot = input.exampleId === 'tree' ? demoTreeArea(state, 'todo') : null;
      const treeChild = input.exampleId === 'tree' ? demoTreeArea(state, 'child') : null;
      const todoItems = treeRoot?.items ?? state.todo;
      const childItems = treeChild?.items ?? state.child;
      copySequence = 0;
      itemsById = new Map(
        [...state.todo, ...state.done, ...state.child].map((item) => [item.id, item]),
      );
      allowed = true;
      swapThreshold = 0.5;
      invertSwap = false;
      container.replaceChildren();
      if (input.exampleId === 'tree') { renderTree(); return; }

      const board = document.createElement('div');
      board.className = `cs-demo-board${input.exampleId === 'auto-scroll' ? ' cs-demo-board--scroll' : ''}${isNestedExample(input.exampleId) ? ' cs-demo-board--nested' : ''}${(input.exampleId === 'grid' || input.exampleId === 'swap-grid') ? ' cs-demo-board--grid' : ''}`;
      const todo = area('todo', locale === 'ko' ? '진행할 작업' : 'To do', todoItems);
      const todoList = todo.querySelector<HTMLElement>('[data-demo-area="todo"]')!;
      if ((input.exampleId === 'grid' || input.exampleId === 'swap-grid')) todoList.classList.add('cs-demo-list--grid');
      if (input.exampleId === 'third-party' || input.exampleId === 'functional-third-party') {
        todoList.classList.add('cs-demo-component-host');
        todoList.dataset.demoComponentHost = 'vanilla';
      }
      if (input.exampleId === 'header-slot' || input.exampleId === 'two-list-slots') todoList.prepend(slot('header'));
      if (input.exampleId === 'footer-slot' || input.exampleId === 'two-list-slots') todoList.append(slot('footer'));
      board.append(todo);
      let done: HTMLElement | null = null;
      if (hasSecondArea(input.exampleId)) {
        done = area('done', locale === 'ko' ? '완료' : 'Done', state.done);
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
        title.dataset.childrenTitle = 'Research';
        title.textContent = `Research ${locale === 'ko' ? '하위 항목' : 'children'}`;
        childList = document.createElement('div');
        childList.className = 'cs-demo-list cs-demo-list--nested';
        childList.dataset.demoArea = 'child';
        childList.setAttribute('role', 'list');
        if (input.exampleId === 'functional-third-party') {
          childList.classList.add('cs-demo-component-host');
          childList.dataset.demoComponentHost = 'vanilla';
        }
        for (const item of childItems) childList.append(card(item));
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
        item: '.cs-demo-card', handle: '.cs-demo-handle',
        copyElement: isCopyExample(input.exampleId)
          ? (source) => {
              const sourceItem = itemsById.get(source.getAttribute('data-sortable-id') ?? '');
              if (sourceItem === undefined) throw new Error('Unknown demo copy source');
              const copy = copyDemoItem(sourceItem, input.exampleId, ++copySequence);
              itemsById.set(copy.id, copy);
              return card(copy);
            }
          : undefined,
        autoScroll: input.exampleId === 'auto-scroll',
        animation: input.exampleId === 'transition' ? 180 : false,
        direction: (input.exampleId === 'grid' || input.exampleId === 'swap-grid') ? 'grid' : undefined,
        swapThreshold: input.exampleId === 'thresholds' ? swapThreshold : undefined,
        invertSwap: input.exampleId === 'thresholds' ? invertSwap : undefined,
        swap: (input.exampleId === 'swap' || input.exampleId === 'swap-grid'),
        multiDrag: input.exampleId === 'transitions',
        selectedClass: input.exampleId === 'transitions' ? 'cs-demo-card--selected' : undefined,
        placeholder: placeholderForExample(input.exampleId),
        onBeforeDragStart: () => event('beforeDragStart'),
        onDragStart: ({ source, itemId }) => bridge.publishEvent({ name: 'dragStart', areaId: source.areaId, itemId: String(itemId) }),
        onInsertDragArea: ({ destination }) => bridge.publishEvent({ name: 'insertDragArea', areaId: destination.areaId }),
        onChange,
        onAfterDrag,
      });
      if (done !== null) {
        sortable.registerArea(done.querySelector<HTMLElement>('[data-demo-area="done"]')!, {
          areaId: 'done',
          group: 'playground',
          item: '.cs-demo-card', handle: '.cs-demo-handle',
          emptyInsertThreshold: input.exampleId === 'empty' ? 42 : undefined,
          accept: input.exampleId === 'accept' ? () => allowed : undefined,
        });
      }
      if (childList !== null) {
        sortable.registerArea(childList, {
          areaId: 'child',
          group: 'playground',
          item: '.cs-demo-card', handle: '.cs-demo-handle',
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
        if (controlId === 'swap-threshold' && typeof value === 'number') {
          swapThreshold = value;
          sortable?.updateArea('todo', { swapThreshold });
        }
        if (controlId === 'invert-swap' && typeof value === 'boolean') {
          invertSwap = value;
          sortable?.updateArea('todo', { invertSwap });
        }
        const targetArea = controlId === 'reverse-child' ? 'child' : 'todo';
        if (controlId === 'reverse-items' || controlId === 'reverse-child') {
          if (state.tree !== undefined && controlId === 'reverse-child') state = reverseDemoChildren(state);
          const target = container.querySelector<HTMLElement>(`[data-demo-area="${targetArea}"]`);
          const items = Array.from(target?.children ?? []).filter((element) => element.hasAttribute('data-sortable-id'));
          for (const item of items.reverse()) target?.append(item);
          sortable?.refreshArea(targetArea);
          publishModel();
        }
      },
      setLocale(value) {
        locale = value;
        for (const label of container.querySelectorAll<HTMLElement>('[data-children-title]')) {
          label.textContent = `${label.dataset.childrenTitle} ${locale === 'ko' ? '하위 항목' : 'children'}`;
        }
        for (const areaId of ['todo', 'done']) {
          const title = container.querySelector(`[data-demo-column="${areaId}"] > header strong`);
          if (title !== null) title.textContent = areaId === 'todo'
            ? (locale === 'ko' ? '진행할 작업' : 'To do') : (locale === 'ko' ? '완료' : 'Done');
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
