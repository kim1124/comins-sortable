import {
  cloneElement,
  useContext,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { ReactElement } from 'react';

import { SortableError } from '../core/errors.js';
import type {
  DragContext,
  ItemKey,
  SortableAreaOptions,
  SortableDirection,
  SortableId,
} from '../core/model.js';
import type { FrameworkAreaBinding } from '../framework/bindings.js';
import { resolveItemId } from '../framework/item-key.js';
import {
  createReactSortableController,
  ReactSortableContext,
  type ReactSortableController,
} from './context.js';

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
  if (controller === null) {
    throw new SortableError('INVALID_ELEMENT');
  }

  const propsRef = useRef(props);
  propsRef.current = props;
  const elementRef = useRef<HTMLDivElement | null>(null);
  const [element, setElement] = useState<HTMLDivElement | null>(null);
  const getItemId = useMemo(() => itemIdForElement(elementRef, propsRef), []);
  const binding = useMemo<FrameworkAreaBinding<T>>(() => ({
    areaId: props.areaId,
    get group() {
      return propsRef.current.group ?? '';
    },
    getItems: () => propsRef.current.items,
    getItemId: (item) => resolveItemId(item, propsRef.current.itemKey),
    setItems: (items) => propsRef.current.onItemsChange(items),
    getElement: () => elementRef.current,
  }), [props.areaId, getItemId, propsRef]);

  useLayoutEffect(() => {
    if (element === null) {
      return undefined;
    }
    return controller.registerArea(element, binding, areaOptions(propsRef.current, getItemId));
  }, [binding, controller, element, getItemId, props.areaId, propsRef]);

  useLayoutEffect(() => {
    if (element !== null) {
      controller.updateArea(props.areaId, areaOptions(propsRef.current, getItemId));
    }
  }, [
    controller,
    element,
    getItemId,
    props.accept,
    props.activationDistance,
    props.areaId,
    props.autoScroll,
    props.direction,
    props.disabled,
    props.emptyInsertThreshold,
    props.group,
    props.handle,
    props.ignore,
  ]);

  const children = props.items.map((item, index) => {
    const rendered = props.children(item, index);
    return cloneElement(rendered, { key: resolveItemId(item, props.itemKey) });
  });

  return (
    <div
      ref={(candidate) => {
        elementRef.current = candidate;
        setElement(candidate);
      }}
      data-comins-sortable-area={props.areaId}
    >
      {children}
    </div>
  );
}

function areaOptions<T>(
  props: SortableAreaProps<T>,
  getItemId: (element: Element) => SortableId,
): SortableAreaOptions {
  return {
    areaId: props.areaId,
    group: props.group,
    item: ':scope > *',
    getItemId,
    direction: props.direction,
    disabled: props.disabled,
    handle: props.handle,
    ignore: props.ignore,
    activationDistance: props.activationDistance,
    emptyInsertThreshold: props.emptyInsertThreshold,
    autoScroll: props.autoScroll,
    accept: props.accept,
  };
}

export function itemIdForElement<T>(
  elementRef: { current: HTMLDivElement | null },
  propsRef: { current: SortableAreaProps<T> },
): (element: Element) => SortableId {
  return (element) => {
    const area = elementRef.current;
    if (area === null || element.parentElement !== area) {
      throw new SortableError('INVALID_ELEMENT');
    }
    const directChildren = Array.from(area.children).filter(
      (child) => !child.hasAttribute('data-comins-sortable-placeholder'),
    );
    if (directChildren.length !== propsRef.current.items.length) {
      throw new SortableError('INVALID_ELEMENT');
    }
    const index = directChildren.indexOf(element);
    const item = propsRef.current.items[index];
    if (index < 0 || item === undefined) {
      throw new SortableError('INVALID_ELEMENT');
    }
    return resolveItemId(item, propsRef.current.itemKey);
  };
}
