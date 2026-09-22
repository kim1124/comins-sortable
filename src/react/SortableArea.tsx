import {
  cloneElement,
  createElement,
  useContext,
  useMemo,
  useLayoutEffect,
} from 'react';
import type {
  ElementType,
  HTMLAttributes,
  ReactElement,
  ReactNode,
} from 'react';

import type {
  CopyItem,
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
  createReactSortableController,
  ReactSortableContext,
  type ReactSortableController,
} from './context.js';
import { createReactAreaLifecycle } from './lifecycle.js';

export interface SortableAreaProps<T> {
  areaId: string;
  group?: SortableGroup;
  items: readonly T[];
  itemKey: ItemKey<T>;
  onItemsChange(items: readonly T[]): void;
  children(item: T, index: number): ReactElement;
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
  as?: ElementType;
  areaProps?: HTMLAttributes<HTMLElement>;
  header?: ReactNode;
  footer?: ReactNode;
}

export function SortableArea<T>(props: SortableAreaProps<T>): ReactElement {
  const rootController = useContext(ReactSortableContext) as ReactSortableController<T> | null;
  const lifecycle = useMemo(() => createReactAreaLifecycle({
    controller: rootController,
    createController: () => createReactSortableController<T>({ getRootProps: () => ({}) }),
    props,
  }), [rootController]);
  useLayoutEffect(() => {
    lifecycle.update(props);
  }, [lifecycle, props]);
  const setAreaElement = useMemo(
    () => deferredElementRef((element) => lifecycle.setElement(element)),
    [lifecycle],
  );

  const children = props.items.map((item, index) => {
    const rendered = props.children(item, index);
    return cloneElement(rendered as ReactElement<Record<string, unknown>>, {
      key: resolveItemId(item, props.itemKey),
      'data-comins-sortable-item': '',
    });
  });

  return createElement(
    props.as ?? 'div',
    {
      ...props.areaProps,
      ref: setAreaElement,
      'data-comins-sortable-area': props.areaId,
    },
    props.header,
    // Keep the item collection in one React child slot so header/footer hosts
    // retain their identity when the collection becomes empty or grows.
    children,
    props.footer,
  );
}
