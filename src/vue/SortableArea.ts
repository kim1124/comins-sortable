import { cloneVNode, defineComponent, inject, isVNode, onBeforeUnmount, onUpdated } from 'vue';
import { h } from 'vue';
import type { Component, ComponentPublicInstance, PropType, VNodeChild } from 'vue';

import type {
  CopyItem,
  CopyItemContext,
  DragContext,
  ItemKey,
  SortableAnimation,
  SortableDirection,
  SortableGroup,
  SortableParentLocation,
  SortablePlaceholderOptions,
} from '../core/model.js';
import { resolveItemId } from '../framework/item-key.js';
import { deferredElementRef } from '../framework/element-ref.js';
import {
  createVueSortableController,
  VueSortableContext,
  type VueSortableController,
} from './context.js';
import { createVueAreaLifecycle } from './lifecycle.js';

export interface VueSortableAreaProps<T> {
  modelValue: readonly T[];
  areaId: string;
  group?: SortableGroup;
  itemKey: ItemKey<T>;
  direction?: SortableDirection;
  disabled?: boolean;
  handle?: string;
  ignore?: string;
  activationDistance?: number;
  emptyInsertThreshold?: number;
  swapThreshold?: number;
  invertSwap?: boolean;
  swap?: boolean;
  multiDrag?: boolean;
  selectedClass?: string;
  autoScroll?: boolean;
  accept?: (context: DragContext) => boolean;
  copyItem?: CopyItem<T>;
  animation?: SortableAnimation;
  placeholder?: SortablePlaceholderOptions;
  parent?: SortableParentLocation;
  tag?: string | Component;
  componentProps?: Readonly<Record<string, unknown>>;
}

export interface VueSortableAreaSlots<T> {
  item(props: { item: T; index: number }): VNodeChild;
  header?(): VNodeChild;
  footer?(): VNodeChild;
}

const SortableAreaComponent = defineComponent({
  name: 'SortableArea',
  props: {
    modelValue: { type: Array as PropType<readonly unknown[]>, required: true },
    areaId: { type: String, required: true },
    group: [String, Object] as PropType<SortableGroup>,
    itemKey: { type: [String, Function] as PropType<ItemKey<unknown>>, required: true },
    direction: String as PropType<SortableDirection>,
    disabled: Boolean,
    handle: String,
    ignore: String,
    activationDistance: Number,
    emptyInsertThreshold: Number,
    swapThreshold: Number,
    invertSwap: { type: Boolean, default: undefined },
    swap: { type: Boolean, default: undefined },
    multiDrag: { type: Boolean, default: undefined },
    selectedClass: String,
    autoScroll: { type: Boolean, default: undefined },
    accept: Function as PropType<(context: DragContext) => boolean>,
    copyItem: Function as PropType<(item: unknown, context: CopyItemContext) => unknown>,
    animation: [Boolean, Number, Object] as PropType<SortableAnimation>,
    placeholder: Object as PropType<SortablePlaceholderOptions>,
    parent: Object as PropType<SortableParentLocation>,
    tag: { type: [String, Object, Function] as PropType<string | Component>, default: 'div' },
    componentProps: Object as PropType<Readonly<Record<string, unknown>>>,
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
    const commitElement = deferredElementRef((element) => lifecycle.setElement(element));
    const setAreaElement = (element: Element | ComponentPublicInstance | null): void => {
      const resolved = element !== null && '$el' in element
        ? (element.$el as HTMLElement | null)
        : element as HTMLElement | null;
      commitElement(resolved);
    };
    onUpdated(() => lifecycle.update(props));
    onBeforeUnmount(() => commitElement(null));

    return () => {
      const children: VNodeChild[] = [];
      if (slots.header !== undefined) children.push(slots.header());
      for (const [index, item] of props.modelValue.entries()) {
        const rendered = slots.item?.({ item, index });
        const itemNode = Array.isArray(rendered) ? rendered[0] : rendered;
        children.push(isVNode(itemNode)
          ? cloneVNode(itemNode, {
              key: resolveItemId(item, props.itemKey),
              'data-comins-sortable-item': '',
            })
          : itemNode);
      }
      if (slots.footer !== undefined) children.push(slots.footer());
      return h(props.tag, {
        ...props.componentProps,
        ref: setAreaElement as never,
        'data-comins-sortable-area': props.areaId,
      }, children);
    };
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
