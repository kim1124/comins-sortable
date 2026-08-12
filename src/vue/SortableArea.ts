import { cloneVNode, defineComponent, inject, isVNode, onBeforeUnmount, onUpdated } from 'vue';
import { h } from 'vue';
import type { PropType, VNodeChild } from 'vue';

import type { DragContext, ItemKey, SortableDirection } from '../core/model.js';
import { resolveItemId } from '../framework/item-key.js';
import {
  createVueSortableController,
  VueSortableContext,
  type VueSortableController,
} from './context.js';
import { createVueAreaLifecycle } from './lifecycle.js';

export interface VueSortableAreaProps<T> {
  modelValue: readonly T[];
  areaId: string;
  group?: string;
  itemKey: ItemKey<T>;
  direction?: SortableDirection;
  disabled?: boolean;
  handle?: string;
  ignore?: string;
  activationDistance?: number;
  emptyInsertThreshold?: number;
  autoScroll?: boolean;
  accept?: (context: DragContext) => boolean;
}

export interface VueSortableAreaSlots<T> {
  item(props: { item: T; index: number }): VNodeChild;
}

const SortableAreaComponent = defineComponent({
  name: 'SortableArea',
  props: {
    modelValue: { type: Array as PropType<readonly unknown[]>, required: true },
    areaId: { type: String, required: true },
    group: String,
    itemKey: { type: [String, Function] as PropType<ItemKey<unknown>>, required: true },
    direction: String as PropType<SortableDirection>,
    disabled: Boolean,
    handle: String,
    ignore: String,
    activationDistance: Number,
    emptyInsertThreshold: Number,
    autoScroll: { type: Boolean, default: undefined },
    accept: Function as PropType<(context: DragContext) => boolean>,
  },
  emits: ['update:modelValue'],
  setup(props, { emit, slots }) {
    const rootController = inject(VueSortableContext, null) as VueSortableController<unknown> | null;
    const lifecycle = createVueAreaLifecycle<unknown>({
      controller: rootController,
      createController: () => createVueSortableController<unknown>({ getRootOptions: () => ({}) }),
      props: () => props,
      emitModelValue: (items) => emit('update:modelValue', items),
    });
    const setAreaElement = (element: Element | null): void => {
      lifecycle.setElement(element as HTMLDivElement | null);
    };
    onUpdated(() => lifecycle.update(props));
    onBeforeUnmount(() => lifecycle.dispose());

    return () => h('div', {
      ref: setAreaElement as never,
      'data-comins-sortable-area': props.areaId,
    }, props.modelValue.map((item, index) => {
      const rendered = slots.item?.({ item, index });
      return isVNode(rendered)
        ? cloneVNode(rendered, { key: resolveItemId(item, props.itemKey) })
        : rendered;
    }));
  },
});

export type VueSortableAreaComponent = typeof SortableAreaComponent & {
  new <T>(): {
    $props: VueSortableAreaProps<T> & {
      'onUpdate:modelValue'?: (items: readonly T[]) => void;
    };
    $slots: VueSortableAreaSlots<T>;
    $emit(event: 'update:modelValue', items: readonly T[]): void;
  };
};

export const SortableArea = SortableAreaComponent as VueSortableAreaComponent;
