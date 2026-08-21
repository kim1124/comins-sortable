import { SortableError } from '../core/errors.js';
import type {
  CopyItem,
  DragContext,
  ItemKey,
  SortableAreaOptions,
  SortableDirection,
  SortableGroup,
  SortableId,
} from '../core/model.js';
import type { FrameworkAreaBinding } from '../framework/bindings.js';
import { resolveItemId } from '../framework/item-key.js';
import type { VueSortableController } from './context.js';

export interface VueAreaLifecycleProps<T> {
  areaId: string;
  group?: SortableGroup;
  modelValue: readonly T[];
  itemKey: ItemKey<T>;
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

export interface VueAreaLifecycle<T> {
  update(props: VueAreaLifecycleProps<T>): void;
  setElement(element: HTMLDivElement | null): void;
  dispose(): void;
}

export function createVueAreaLifecycle<T>(options: {
  controller?: VueSortableController<T> | null;
  createController?(): VueSortableController<T>;
  props: () => VueAreaLifecycleProps<T>;
  emitModelValue(items: readonly T[]): void;
}): VueAreaLifecycle<T> {
  let props = options.props();
  let element: HTMLDivElement | null = null;
  let controller = options.controller ?? null;
  let ownsController = false;
  let unregister: (() => void) | null = null;
  let registeredOptions: SortableAreaOptions | null = null;

  const ensureController = (): VueSortableController<T> => {
    if (controller !== null) return controller;
    if (options.createController === undefined) throw new SortableError('INVALID_ELEMENT');
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
    if (element === null || unregister !== null) return;
    const binding = createBinding(() => props, () => element, options.emitModelValue);
    const nextOptions = areaOptions(props, itemIdForElement(() => element, () => props));
    unregister = ensureController().registerArea(element, binding, nextOptions);
    registeredOptions = nextOptions;
  };

  return {
    update(nextProps) {
      const areaChanged = registeredOptions !== null && registeredOptions.areaId !== nextProps.areaId;
      props = nextProps;
      if (areaChanged) {
        disposeRegistration();
        register();
        return;
      }
      const nextOptions = areaOptions(props, itemIdForElement(() => element, () => props));
      if (unregister !== null && registeredOptions !== null && !sameOptions(registeredOptions, nextOptions)) {
        ensureController().updateArea(props.areaId, nextOptions);
        registeredOptions = nextOptions;
      }
      register();
    },
    setElement(nextElement) {
      if (element === nextElement) return;
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
  getProps: () => VueAreaLifecycleProps<T>,
  getElement: () => HTMLDivElement | null,
  emitModelValue: (items: readonly T[]) => void,
): FrameworkAreaBinding<T> {
  const initial = getProps();
  return {
    areaId: initial.areaId,
    get group() {
      const group = getProps().group;
      return typeof group === 'string' ? group : group?.name ?? '';
    },
    getItems: () => getProps().modelValue,
    getItemId: (item) => resolveItemId(item, getProps().itemKey),
    setItems: emitModelValue,
    getElement,
    copyItem: (context) => {
      const current = getProps();
      const item = current.modelValue[context.source.index];
      if (item === undefined || current.copyItem === undefined) {
        throw new SortableError('INVALID_OPTION');
      }
      return current.copyItem(item, context);
    },
  };
}

export function itemIdForElement<T>(
  getArea: () => HTMLDivElement | null,
  getProps: () => VueAreaLifecycleProps<T>,
): (element: Element) => SortableId {
  return (element) => {
    const area = getArea();
    const props = getProps();
    if (area === null || element.parentElement !== area) throw new SortableError('INVALID_ELEMENT');
    const children = Array.from(area.children).filter(
      (child) => !child.hasAttribute('data-comins-sortable-placeholder'),
    );
    if (children.length !== props.modelValue.length) throw new SortableError('INVALID_ELEMENT');
    const index = children.indexOf(element);
    const item = props.modelValue[index];
    if (index < 0 || item === undefined) throw new SortableError('INVALID_ELEMENT');
    return resolveItemId(item, props.itemKey);
  };
}

function areaOptions<T>(
  props: VueAreaLifecycleProps<T>,
  getItemId: (element: Element) => SortableId,
): SortableAreaOptions {
  return {
    areaId: props.areaId, group: props.group, item: ':scope > *', getItemId,
    direction: props.direction, disabled: props.disabled, handle: props.handle, ignore: props.ignore,
    activationDistance: props.activationDistance, emptyInsertThreshold: props.emptyInsertThreshold,
    autoScroll: props.autoScroll, accept: props.accept,
  };
}

function sameOptions(left: SortableAreaOptions, right: SortableAreaOptions): boolean {
  return left.areaId === right.areaId && left.group === right.group && left.direction === right.direction
    && left.disabled === right.disabled && left.handle === right.handle && left.ignore === right.ignore
    && left.activationDistance === right.activationDistance
    && left.emptyInsertThreshold === right.emptyInsertThreshold && left.autoScroll === right.autoScroll
    && left.accept === right.accept;
}
