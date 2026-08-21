import { createSortable, type Sortable } from '../../../src/index.js';
import type { AfterDragResult, SortableChange } from '../../../src/core.js';
import type { PlaygroundDemoModule } from '../playground/types.js';
import {
  createDemoState,
  copyDemoItem,
  demoModel,
  hasSecondArea,
  isCopyExample,
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
      bridge.publishModel(model);
    };

    const event = (name: string, result?: AfterDragResult): void => {
      bridge.publishEvent({ name, status: result?.status, reason: result?.reason });
    };

    const render = (): void => {
      sortable?.destroy();
      const state = createDemoState(input.exampleId);
      copySequence = 0;
      itemsById = new Map(
        [...state.todo, ...state.done].map((item) => [item.id, item]),
      );
      allowed = true;
      container.replaceChildren();

      const board = document.createElement('div');
      board.className = `cs-demo-board${input.exampleId === 'auto-scroll' ? ' cs-demo-board--scroll' : ''}`;
      const todo = area('todo', input.locale === 'ko' ? '진행할 작업' : 'To do', state.todo, input.exampleId === 'handle');
      board.append(todo);
      let done: HTMLElement | null = null;
      if (hasSecondArea(input.exampleId)) {
        done = area('done', input.locale === 'ko' ? '완료' : 'Done', state.done, input.exampleId === 'handle');
        board.append(done);
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
      const todoList = todo.querySelector<HTMLElement>('[data-demo-area="todo"]')!;
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
        item: '.cs-demo-card',
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
      bridge.publishOperation(null);
      publishModel();
    };

    render();

    return {
      dispatch(controlId, value) {
        if (controlId === 'accept-destination' && typeof value === 'boolean') allowed = value;
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
