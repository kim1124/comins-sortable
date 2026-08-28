import { SortableError } from '../core/errors.js';
import type {
  CopyItem,
  DragContext,
  ItemKey,
  SortableAreaOptions,
  SortableAnimation,
  SortableDirection,
  SortableGroup,
  SortableId,
  SortableParentLocation,
  SortablePlaceholderOptions,
} from '../core/model.js';
import type { FrameworkAreaBinding } from '../framework/bindings.js';
import { resolveItemId } from '../framework/item-key.js';
import type { ReactSortableController } from './context.js';

export interface ReactAreaLifecycleProps<T> {
  areaId: string;
  group?: SortableGroup;
  items: readonly T[];
  itemKey: ItemKey<T>;
  onItemsChange(items: readonly T[]): void;
  direction?: SortableDirection;
  disabled?: boolean;
  handle?: string;
  ignore?: string;
  activationDistance?: number;
  emptyInsertThreshold?: number;
  autoScroll?: boolean;
  accept?: (context: DragContext) => boolean;
  copyItem?: CopyItem<T>;
  animation?: SortableAnimation;
  placeholder?: SortablePlaceholderOptions;
  parent?: SortableParentLocation;
}

export interface ReactAreaLifecycle<T> {
  update(props: ReactAreaLifecycleProps<T>): void;
  setElement(element: HTMLElement | null): void;
  dispose(): void;
}

export function createReactAreaLifecycle<T>(options: {
  controller?: ReactSortableController<T> | null;
  createController?(): ReactSortableController<T>;
  props: ReactAreaLifecycleProps<T>;
}): ReactAreaLifecycle<T> {
  let props = options.props;
  let element: HTMLElement | null = null;
  let controller = options.controller ?? null;
  let ownsController = false;
  let unregister: (() => void) | null = null;
  let registeredOptions: SortableAreaOptions | null = null;

  const ensureController = (): ReactSortableController<T> => {
    if (controller !== null) {
      return controller;
    }
    if (options.createController === undefined) {
      throw new SortableError('INVALID_ELEMENT');
    }
    controller = options.createController();
    ownsController = true;
    return controller;
  };

  const disposeRegistration = (): void => {
    unregister?.();
    unregister = null;
    registeredOptions = null;
  };

  const register = (): void => {
    if (element === null || unregister !== null) {
      return;
    }
    const binding = createBinding(() => props, () => element);
    const nextOptions = areaOptions(props, itemIdForElement(() => element, () => props));
    unregister = ensureController().registerArea(element, binding, nextOptions);
    registeredOptions = nextOptions;
  };

  return {
    update(nextProps) {
      const areaChanged = props.areaId !== nextProps.areaId;
      const itemsChanged = props.items !== nextProps.items;
      props = nextProps;
      if (areaChanged) {
        disposeRegistration();
        register();
        return;
      }
      const nextOptions = areaOptions(props, itemIdForElement(() => element, () => props));
      if (unregister !== null && registeredOptions !== null) {
        if (!sameOptions(registeredOptions, nextOptions)) {
          ensureController().updateArea(props.areaId, nextOptions);
          registeredOptions = nextOptions;
        } else if (itemsChanged && nextOptions.animation !== false && nextOptions.animation !== undefined) {
          const currentController = ensureController();
          currentController.refreshArea?.(props.areaId);
        }
      }
      register();
    },
    setElement(nextElement) {
      if (element === nextElement) {
        return;
      }
      disposeRegistration();
      element = nextElement;
      if (element === null && ownsController) {
        controller?.destroy();
        controller = null;
        ownsController = false;
        return;
      }
      register();
    },
    dispose() {
      this.setElement(null);
    },
  };
}

function createBinding<T>(
  getProps: () => ReactAreaLifecycleProps<T>,
  getElement: () => HTMLElement | null,
): FrameworkAreaBinding<T> {
  const initial = getProps();
  return {
    areaId: initial.areaId,
    get group() {
      const group = getProps().group;
      return typeof group === 'string' ? group : group?.name ?? '';
    },
    getItems: () => getProps().items,
    getItemId: (item) => resolveItemId(item, getProps().itemKey),
    setItems: (items) => getProps().onItemsChange(items),
    getElement,
    getItemElements: () => {
      const area = getElement();
      return area === null ? [] : Array.from(area.children).filter(
        (child) => child.hasAttribute('data-comins-sortable-item'),
      );
    },
    copyItem: (context) => {
      const current = getProps();
      const item = current.items[context.source.index];
      if (item === undefined || current.copyItem === undefined) {
        throw new SortableError('INVALID_OPTION');
      }
      return current.copyItem(item, context);
    },
  };
}

export function itemIdForElement<T>(
  getArea: () => HTMLElement | null,
  getProps: () => ReactAreaLifecycleProps<T>,
): (element: Element) => SortableId {
  return (element) => {
    const area = getArea();
    const props = getProps();
    if (area === null || element.parentElement !== area) {
      throw new SortableError('INVALID_ELEMENT');
    }
    const directChildren = Array.from(area.children).filter(
      (child) => child.hasAttribute('data-comins-sortable-item'),
    );
    if (directChildren.length !== props.items.length) {
      throw new SortableError('INVALID_ELEMENT');
    }
    const index = directChildren.indexOf(element);
    const item = props.items[index];
    if (index < 0 || item === undefined) {
      throw new SortableError('INVALID_ELEMENT');
    }
    return resolveItemId(item, props.itemKey);
  };
}

function areaOptions<T>(
  props: ReactAreaLifecycleProps<T>,
  getItemId: (element: Element) => SortableId,
): SortableAreaOptions {
  return {
    areaId: props.areaId,
    group: props.group,
    item: '[data-comins-sortable-item]',
    getItemId,
    direction: props.direction,
    disabled: props.disabled,
    handle: props.handle,
    ignore: props.ignore,
    activationDistance: props.activationDistance,
    emptyInsertThreshold: props.emptyInsertThreshold,
    autoScroll: props.autoScroll,
    animation: props.animation,
    placeholder: props.placeholder,
    parent: props.parent,
    accept: props.accept,
  };
}

function sameOptions(left: SortableAreaOptions, right: SortableAreaOptions): boolean {
  return left.areaId === right.areaId
    && left.group === right.group
    && left.direction === right.direction
    && left.disabled === right.disabled
    && left.handle === right.handle
    && left.ignore === right.ignore
    && left.activationDistance === right.activationDistance
    && left.emptyInsertThreshold === right.emptyInsertThreshold
    && left.autoScroll === right.autoScroll
    && sameAnimation(left.animation, right.animation)
    && left.placeholder?.preset === right.placeholder?.preset
    && left.placeholder?.className === right.placeholder?.className
    && left.parent?.areaId === right.parent?.areaId
    && left.parent?.itemId === right.parent?.itemId
    && left.accept === right.accept;
}

function sameAnimation(
  left: SortableAreaOptions['animation'],
  right: SortableAreaOptions['animation'],
): boolean {
  if (left === right) return true;
  if (typeof left !== 'object' || left === null || typeof right !== 'object' || right === null) {
    return false;
  }
  return left.duration === right.duration && left.easing === right.easing;
}
