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
  demoModel,
  hasSecondArea,
  playgroundOperation,
  type DemoItem,
  type DemoState,
} from './demo-data.js';
import source from './vue.ts?raw';

interface DemoCommands {
  dispatch(controlId: string, value?: string | number | boolean): void;
  reset(): void;
}

function itemCard(item: DemoItem, withHandle: boolean): VNode {
  return h('article', {
    class: `cs-demo-card cs-demo-card--${item.tone}`,
    'data-sortable-id': item.id,
    role: 'listitem',
    tabindex: 0,
  }, [
    withHandle ? h('button', { type: 'button', class: 'cs-demo-handle', 'aria-label': `Drag ${item.title}` }, '⠿') : null,
    h('span', { class: 'cs-demo-card__copy' }, [h('strong', item.title), h('small', item.detail)]),
  ]);
}

export const vueDemoModule: PlaygroundDemoModule = {
  adapterId: 'vue',
  source,
  mount(container, input, bridge) {
    let commands: DemoCommands | null = null;
    const Demo = defineComponent({
      name: 'VuePlaygroundDemo',
      setup() {
        const state = ref<DemoState>(createDemoState(input.exampleId));
        const allowed = ref(true);
        const secondArea = hasSecondArea(input.exampleId);
        const event = (name: string, result?: AfterDragResult): void => {
          bridge.publishEvent({ name, status: result?.status, reason: result?.reason });
        };
        const setItems = (areaId: 'todo' | 'done', items: readonly DemoItem[]): void => {
          state.value = { ...state.value, [areaId]: [...items] };
        };

        commands = {
          dispatch(controlId, value) {
            if (controlId === 'accept-destination' && typeof value === 'boolean') allowed.value = value;
          },
          reset() {
            allowed.value = true;
            state.value = createDemoState(input.exampleId);
            bridge.publishOperation(null);
          },
        };

        watchEffect(() => bridge.publishModel(demoModel(state.value, secondArea)));

        const area = (areaId: 'todo' | 'done', items: readonly DemoItem[]): VNode => h(
          'section',
          { class: 'cs-demo-column', 'data-demo-column': areaId },
          [
            h('header', [h('div', [h('strong', areaId === 'todo' ? 'To do' : 'Done'), h('small', `${items.length} items`)])]),
            h('div', { class: 'cs-demo-list-shell', role: 'list' }, [
              h(SortableArea<DemoItem>, {
                areaId,
                group: 'playground',
                modelValue: items,
                itemKey: 'id',
                handle: input.exampleId === 'handle' ? '.cs-demo-handle' : undefined,
                autoScroll: input.exampleId === 'auto-scroll',
                emptyInsertThreshold: areaId === 'done' && input.exampleId === 'empty' ? 42 : undefined,
                accept: areaId === 'done' && input.exampleId === 'accept' ? () => allowed.value : undefined,
                'onUpdate:modelValue': (nextItems: readonly DemoItem[]) => setItems(areaId, nextItems),
              }, {
                item: ({ item }: { item: DemoItem }) => itemCard(item, input.exampleId === 'handle'),
              }),
            ]),
          ],
        );

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
            class: `cs-demo-board${input.exampleId === 'auto-scroll' ? ' cs-demo-board--scroll' : ''}`,
          }, [area('todo', state.value.todo), secondArea ? area('done', state.value.done) : null]),
        });
      },
    });

    const app = createApp(Demo);
    app.mount(container);
    return {
      dispatch(controlId, value) { commands?.dispatch(controlId, value); },
      reset() { commands?.reset(); },
      destroy() { commands = null; app.unmount(); },
    };
  },
};
