import {
  cloneElement,
  useCallback,
  useContext,
  useMemo,
  useLayoutEffect,
} from 'react';
import type { ReactElement } from 'react';

import type {
  CopyItem,
  DragContext,
  ItemKey,
  SortableDirection,
  SortableGroup,
} from '../core/model.js';
import { resolveItemId } from '../framework/item-key.js';
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
  autoScroll?: boolean;
  accept?: (context: DragContext) => boolean;
  copyItem?: CopyItem<T>;
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
  const setAreaElement = useCallback(
    (element: HTMLDivElement | null) => lifecycle.setElement(element),
    [lifecycle],
  );

  const children = props.items.map((item, index) => {
    const rendered = props.children(item, index);
    return cloneElement(rendered, { key: resolveItemId(item, props.itemKey) });
  });

  return (
    <div
      ref={setAreaElement}
      data-comins-sortable-area={props.areaId}
    >
      {children}
    </div>
  );
}
