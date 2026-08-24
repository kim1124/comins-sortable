import { defineComponent, onBeforeUnmount, provide } from 'vue';
import type { PropType, VNodeChild } from 'vue';

import type {
  DragContext,
  FrameworkSortableChange,
  InsertDragAreaEvent,
  SortableScopeOptions,
} from '../core/model.js';
import {
  createVueSortableController,
  VueSortableContext,
  type VueSortableRootOptions,
} from './context.js';

export interface VueSortableRootProps<T> extends Omit<SortableScopeOptions, 'onChange'> {
  onChange?: (change: FrameworkSortableChange<T>) => void;
}

export interface VueSortableRootSlots {
  default?(): VNodeChild;
}

const SortableRootComponent = defineComponent({
  name: 'SortableRoot',
  props: {
    onBeforeDragStart: Function as PropType<(context: DragContext) => boolean | void>,
    onDragStart: Function as PropType<(context: DragContext) => void>,
    onDrag: Function as PropType<(context: DragContext) => void>,
    onInsertDragArea: Function as PropType<(event: InsertDragAreaEvent) => void>,
    onAfterDrag: Function as PropType<SortableScopeOptions['onAfterDrag']>,
    onError: Function as PropType<(error: unknown) => void>,
  },
  emits: ['change'],
  setup(props, { emit, slots }) {
    const controller = createVueSortableController<unknown>({
      getRootOptions: (): VueSortableRootOptions<unknown> => ({
        onBeforeDragStart: props.onBeforeDragStart,
        onDragStart: props.onDragStart,
        onDrag: props.onDrag,
        onInsertDragArea: props.onInsertDragArea,
        onAfterDrag: props.onAfterDrag,
        onError: props.onError,
        onChange: (change) => emit('change', change),
      }),
    });
    provide(VueSortableContext, controller);
    onBeforeUnmount(() => controller.destroy());
    return () => slots.default?.();
  },
});

export type VueSortableRootComponent = typeof SortableRootComponent & {
  new <T>(): {
    $props: VueSortableRootProps<T>;
    $slots: VueSortableRootSlots;
    $emit(event: 'change', change: FrameworkSortableChange<T>): void;
  };
};

export const SortableRoot = SortableRootComponent as VueSortableRootComponent;
