import {
  createApp,
  defineComponent,
  h,
  ref,
  watchEffect,
  type VNode,
} from 'vue';

import { SortableArea, SortableRoot } from '../../../src/vue.js';
import type {
  AfterDragResult,
  FrameworkSortableChange,
} from '../../../src/core.js';
import type {
  PlaygroundBridge,
  PlaygroundDemoInput,
  PlaygroundDemoModule,
} from '../playground/types.js';
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
  updateDemoTreeArea,
  type DemoItem,
  type DemoState,
} from './demo-data.js';
import source from './vue.ts?raw';
import { waitForAdapterReady } from './adapter-ready.js';

interface DemoCommands {
  dispatch(controlId: string, value?: string | number | boolean): void;
  reset(): void;
}

const ComponentHost = defineComponent({
  name: 'PlaygroundComponentHost',
  inheritAttrs: false,
  setup(_props, { attrs, slots }) {
    return () => h('section', { ...attrs, 'data-demo-component-host': 'vue' }, slots.default?.());
  },
});

function itemCard(item: DemoItem, withHandle: boolean, child?: VNode): VNode {
  return h('article', {
    class: `cs-demo-card cs-demo-card--${item.tone}`,
    'data-sortable-id': item.id,
    role: 'listitem',
    tabindex: 0,
  }, [
    withHandle ? h('button', { type: 'button', class: 'cs-demo-handle', 'aria-label': `Drag ${item.title}` }, '⠿') : null,
    h('span', { class: 'cs-demo-card__copy' }, [h('strong', item.title), h('small', item.detail)]),
    child,
  ]);
}

export const vueDemoModule: PlaygroundDemoModule = {
  adapterId: 'vue',
  source,
  async mount(container, input, bridge) {
    let commands: DemoCommands | null = null;
    const Demo = defineComponent({
      name: 'VuePlaygroundDemo',
      setup() {
        const state = ref<DemoState>(createDemoState(input.exampleId));
        const allowed = ref(true);
        let copySequence = 0;
        const secondArea = hasSecondArea(input.exampleId);
        const todoGroup = input.exampleId === 'clone' || input.exampleId === 'custom-clone'
          ? { name: 'playground', pull: 'copy' as const }
          : input.exampleId === 'modifier-copy'
            ? {
                name: 'playground',
                pull: (context: import('../../../src/core.js').DragContext) => (
                  context.pointer.altKey ? 'copy' as const : 'move' as const
                ),
              }
            : 'playground';
        const event = (name: string, result?: AfterDragResult): void => {
          bridge.publishEvent({ name, status: result?.status, reason: result?.reason });
        };
        const setItems = (areaId: 'todo' | 'done' | 'child', items: readonly DemoItem[]): void => {
          state.value = input.exampleId === 'tree' && areaId !== 'done'
            ? updateDemoTreeArea(state.value, areaId, items)
            : { ...state.value, [areaId]: [...items] };
        };

        commands = {
          dispatch(controlId, value) {
            if (controlId === 'accept-destination' && typeof value === 'boolean') allowed.value = value;
            if (controlId === 'reverse-items') state.value = { ...state.value, todo: [...state.value.todo].reverse() };
            if (controlId === 'reverse-child') state.value = { ...state.value, child: [...state.value.child].reverse() };
          },
          reset() {
            copySequence = 0;
            allowed.value = true;
            state.value = createDemoState(input.exampleId);
            bridge.publishOperation(null);
          },
        };

        watchEffect(() => bridge.publishModel(demoModel(state.value, secondArea)));

        const animation = input.exampleId === 'transition'
          ? 180
          : input.exampleId === 'transitions'
            ? { duration: 280, easing: 'cubic-bezier(.2,.8,.2,1)' }
            : false;
        const childArea = (): VNode => {
          const treeArea = input.exampleId === 'tree' ? demoTreeArea(state.value, 'child') : null;
          return h('div', { class: 'cs-demo-nested-shell' }, [
          h('strong', 'Research children'),
          h(SortableArea<DemoItem>, {
            tag: input.exampleId === 'functional-third-party' ? ComponentHost : 'div',
            componentProps: {
              class: 'cs-demo-list cs-demo-list--nested',
              role: 'list',
              'data-demo-area': 'child',
            },
            areaId: 'child',
            group: 'playground',
            parent: treeArea?.parent ?? { areaId: 'todo', itemId: 'research' },
            modelValue: treeArea?.items ?? state.value.child,
            itemKey: 'id',
            animation: 160,
            'onUpdate:modelValue': (items: readonly DemoItem[]) => setItems('child', items),
          }, {
            item: ({ item }: { item: DemoItem }) => itemCard(item, false),
          }),
          ]);
        };
        const area = (areaId: 'todo' | 'done', items: readonly DemoItem[]): VNode => h(
          'section',
          { class: 'cs-demo-column', 'data-demo-column': areaId },
          [
            h('header', [h('div', [h('strong', areaId === 'todo' ? 'To do' : 'Done'), h('small', `${items.length} items`)])]),
            h('div', { class: 'cs-demo-list-shell', role: 'list' }, [
              h(SortableArea<DemoItem>, {
                tag: input.exampleId === 'third-party' || input.exampleId === 'functional-third-party'
                  ? ComponentHost
                  : 'div',
                componentProps: {
                  class: 'cs-demo-list',
                  role: 'list',
                  'data-demo-area': areaId,
                },
                areaId,
                group: areaId === 'todo' ? todoGroup : 'playground',
                modelValue: items,
                itemKey: 'id',
                handle: input.exampleId === 'handle' ? '.cs-demo-handle' : undefined,
                autoScroll: input.exampleId === 'auto-scroll',
                animation,
                placeholder: areaId === 'todo' ? placeholderForExample(input.exampleId) : undefined,
                emptyInsertThreshold: areaId === 'done' && input.exampleId === 'empty' ? 42 : undefined,
                accept: areaId === 'done' && input.exampleId === 'accept' ? () => allowed.value : undefined,
                copyItem: areaId === 'todo' && isCopyExample(input.exampleId)
                  ? (item: DemoItem) => copyDemoItem(item, input.exampleId, ++copySequence)
                  : undefined,
                'onUpdate:modelValue': (nextItems: readonly DemoItem[]) => setItems(areaId, nextItems),
              }, {
                header: input.exampleId === 'header-slot' || input.exampleId === 'two-list-slots'
                  ? () => h('div', { class: 'cs-demo-slot', 'data-demo-slot': 'header' }, 'Pinned header')
                  : undefined,
                footer: input.exampleId === 'footer-slot' || input.exampleId === 'two-list-slots'
                  ? () => h('div', { class: 'cs-demo-slot', 'data-demo-slot': 'footer' }, 'Pinned footer')
                  : undefined,
                item: ({ item }: { item: DemoItem }) => itemCard(
                  item,
                  input.exampleId === 'handle',
                  isNestedExample(input.exampleId) && areaId === 'todo' && item.id === 'research'
                    ? childArea()
                    : undefined,
                ),
              }),
            ]),
          ],
        );

        const table = (): VNode => input.exampleId === 'table-column'
          ? h('table', { class: 'cs-demo-table', 'data-demo-column': 'todo' }, [
              h('thead', [h(SortableArea<DemoItem>, {
                tag: 'tr',
                componentProps: { 'data-demo-area': 'todo' },
                areaId: 'todo',
                modelValue: state.value.todo,
                itemKey: 'id',
                direction: 'horizontal',
                animation: 160,
                'onUpdate:modelValue': (items: readonly DemoItem[]) => setItems('todo', items),
              }, { item: ({ item }: { item: DemoItem }) => h('th', { 'data-sortable-id': item.id, scope: 'col' }, item.title) })]),
              h('tbody', [h('tr', state.value.todo.map((item) => h('td', { key: item.id }, item.detail)))]),
            ])
          : h('table', { class: 'cs-demo-table', 'data-demo-column': 'todo' }, [
              h('thead', [h('tr', [h('th', 'Task'), h('th', 'Detail')])]),
              h(SortableArea<DemoItem>, {
                tag: 'tbody',
                componentProps: { 'data-demo-area': 'todo' },
                areaId: 'todo',
                modelValue: state.value.todo,
                itemKey: 'id',
                animation: 160,
                'onUpdate:modelValue': (items: readonly DemoItem[]) => setItems('todo', items),
              }, {
                item: ({ item }: { item: DemoItem }) => h('tr', { 'data-sortable-id': item.id }, [
                  h('th', { scope: 'row' }, item.title), h('td', item.detail),
                ]),
              }),
            ]);

        return () => h(SortableRoot<DemoItem>, {
          onBeforeDragStart: () => event('beforeDragStart'),
          onDragStart: () => event('dragStart'),
          onInsertDragArea: ({ destination }) => bridge.publishEvent({ name: 'insertDragArea', areaId: destination.areaId }),
          onChange: (change: FrameworkSortableChange<DemoItem>) => {
            event('change');
            bridge.publishOperation(playgroundOperation(change));
          },
          onAfterDrag: (result: AfterDragResult) => event('afterDrag', result),
        }, {
          default: () => h('div', {
            class: `cs-demo-board${input.exampleId === 'auto-scroll' ? ' cs-demo-board--scroll' : ''}${isNestedExample(input.exampleId) ? ' cs-demo-board--nested' : ''}`,
          }, [
            input.exampleId === 'table' || input.exampleId === 'table-column'
              ? table()
              : area('todo', input.exampleId === 'tree' ? demoTreeArea(state.value, 'todo').items : state.value.todo),
            secondArea ? area('done', state.value.done) : null,
          ]),
        });
      },
    });

    const app = createApp(Demo);
    app.mount(container);
    await waitForAdapterReady();
    return {
      dispatch(controlId, value) { commands?.dispatch(controlId, value); },
      reset() { commands?.reset(); },
      destroy() { commands = null; app.unmount(); },
    };
  },
};
