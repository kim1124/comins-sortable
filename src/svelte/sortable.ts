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
  controllerForScope,
  createSortableScope,
  type SvelteSortableScope,
  type SvelteSortableScopeOptions,
} from './scope.js';

export type { SvelteSortableScope, SvelteSortableScopeOptions } from './scope.js';

export interface SvelteSortableOptions<T> {
  scope?: SvelteSortableScope<T>;
  areaId: string;
  group?: string;
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
}

export interface SvelteActionReturn<T> {
  update(options: SvelteSortableOptions<T>): void;
  destroy(): void;
}

export function sortable<T>(node: HTMLElement, initialOptions: SvelteSortableOptions<T>): SvelteActionReturn<T> {
  return createSvelteSortableAction(node, initialOptions);
}

export function createSvelteSortableAction<T>(
  node: HTMLElement,
  initialOptions: SvelteSortableOptions<T>,
  createScope: () => SvelteSortableScope<T> = () => createSortableScope<T>(),
): SvelteActionReturn<T> {
  let options = initialOptions;
  let scope: SvelteSortableScope<T> | null = initialOptions.scope ?? createScope();
  let ownsScope = initialOptions.scope === undefined;
  let unregister: (() => void) | null = null;
  let registeredOptions: SortableAreaOptions | null = null;
  let destroyed = false;

  const unregisterArea = (): void => {
    unregister?.();
    unregister = null;
    registeredOptions = null;
  };
  const register = (): void => {
    if (unregister !== null) return;
    const binding = createBinding(() => options, () => node);
    const areaOptions = toAreaOptions(options, itemIdForElement(() => node, () => options));
    unregister = controllerForScope(requireScope(scope)).registerArea(node, binding, areaOptions);
    registeredOptions = areaOptions;
  };
  const replaceScope = (nextScope: SvelteSortableScope<T> | undefined): void => {
    unregisterArea();
    if (ownsScope) scope?.destroy();
    scope = nextScope ?? createScope();
    ownsScope = nextScope === undefined;
  };

  register();

  return {
    update(nextOptions) {
      if (destroyed) return;
      const scopeChanged = options.scope !== nextOptions.scope;
      const areaChanged = options.areaId !== nextOptions.areaId;
      options = nextOptions;
      if (scopeChanged) replaceScope(nextOptions.scope);
      if (scopeChanged || areaChanged) {
        unregisterArea();
        register();
        return;
      }
      const nextAreaOptions = toAreaOptions(options, itemIdForElement(() => node, () => options));
      if (registeredOptions !== null && !sameOptions(registeredOptions, nextAreaOptions)) {
        controllerForScope(requireScope(scope)).updateArea(options.areaId, nextAreaOptions);
        registeredOptions = nextAreaOptions;
      }
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      unregisterArea();
      if (ownsScope) scope?.destroy();
      scope = null;
    },
  };
}

function requireScope<T>(scope: SvelteSortableScope<T> | null): SvelteSortableScope<T> {
  if (scope === null) throw new SortableError('INVALID_OPTION');
  return scope;
}

function createBinding<T>(
  getOptions: () => SvelteSortableOptions<T>,
  getElement: () => HTMLElement,
): FrameworkAreaBinding<T> {
  const initial = getOptions();
  return {
    areaId: initial.areaId,
    get group() { return getOptions().group ?? ''; },
    getItems: () => getOptions().items,
    getItemId: (item) => resolveItemId(item, getOptions().itemKey),
    setItems: (items) => getOptions().onItemsChange(items),
    getElement,
  };
}

export function itemIdForElement<T>(
  getArea: () => HTMLElement,
  getOptions: () => SvelteSortableOptions<T>,
): (element: Element) => SortableId {
  return (element) => {
    const area = getArea();
    const options = getOptions();
    if (element.parentElement !== area) throw new SortableError('INVALID_ELEMENT');
    const children = Array.from(area.children).filter(
      (child) => !child.hasAttribute('data-comins-sortable-placeholder'),
    );
    if (children.length !== options.items.length) throw new SortableError('INVALID_ELEMENT');
    const index = children.indexOf(element);
    const item = options.items[index];
    if (index < 0 || item === undefined) throw new SortableError('INVALID_ELEMENT');
    return resolveItemId(item, options.itemKey);
  };
}

function toAreaOptions<T>(
  options: SvelteSortableOptions<T>,
  getItemId: (element: Element) => SortableId,
): SortableAreaOptions {
  return {
    areaId: options.areaId,
    group: options.group,
    item: ':scope > *',
    getItemId,
    direction: options.direction,
    disabled: options.disabled,
    handle: options.handle,
    ignore: options.ignore,
    activationDistance: options.activationDistance,
    emptyInsertThreshold: options.emptyInsertThreshold,
    autoScroll: options.autoScroll,
    accept: options.accept,
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
    && left.accept === right.accept;
}
