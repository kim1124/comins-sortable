import {
  cloneElement,
  useContext,
  useMemo,
  useLayoutEffect,
} from 'react';
import type { ReactElement } from 'react';

import type {
  DragContext,
  ItemKey,
  SortableDirection,
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
  group?: string;
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
}

export function SortableArea<T>(props: SortableAreaProps<T>): ReactElement {
  const rootController = useContext(ReactSortableContext) as ReactSortableController<T> | null;
  const privateController = useMemo(
    () => rootController === null
      ? createReactSortableController<T>({ getRootProps: () => ({}) })
      : null,
    [rootController],
  );
  const controller = rootController ?? privateController;
  const lifecycle = useMemo(() => createReactAreaLifecycle({
    controller,
    createController: () => createReactSortableController<T>({ getRootProps: () => ({}) }),
    props,
  }), [controller]);
  useLayoutEffect(() => {
    lifecycle.update(props);
  }, [lifecycle, props]);

  const children = props.items.map((item, index) => {
    const rendered = props.children(item, index);
    return cloneElement(rendered, { key: resolveItemId(item, props.itemKey) });
  });

  return (
    <div
      ref={(candidate) => lifecycle.setElement(candidate)}
      data-comins-sortable-area={props.areaId}
    >
      {children}
    </div>
  );
}
