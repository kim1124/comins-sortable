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
}

export interface SvelteActionReturn<T> {
  update(options: SvelteSortableOptions<T>): void;
  destroy(): void;
}

interface ActionState<T> {
  node: HTMLElement | null;
  options: SvelteSortableOptions<T> | null;
  pendingOptions: SvelteSortableOptions<T> | null;
  scope: SvelteSortableScope<T> | null;
  ownsScope: boolean;
  createScope: (() => SvelteSortableScope<T>) | null;
  unregister: (() => void) | null;
  registeredOptions: SortableAreaOptions | null;
}

interface SvelteActionInspection {
  hasNode: boolean;
  hasOptions: boolean;
  hasScope: boolean;
  hasCreateScope: boolean;
  hasRegistration: boolean;
}

interface Registration {
  unregister: () => void;
  options: SortableAreaOptions;
}

const inspections = new WeakMap<object, () => SvelteActionInspection>();

export function sortable<T>(node: HTMLElement, initialOptions: SvelteSortableOptions<T>): SvelteActionReturn<T> {
  return createSvelteSortableAction(node, initialOptions);
}

export function createSvelteSortableAction<T>(
  node: HTMLElement,
  initialOptions: SvelteSortableOptions<T>,
  createScope: () => SvelteSortableScope<T> = () => createSortableScope<T>(),
): SvelteActionReturn<T> {
  const ownsInitialScope = initialOptions.scope === undefined;
  const initialScope = initialOptions.scope ?? createScope();
  let state: ActionState<T> | null = {
    node,
    options: initialOptions,
    pendingOptions: null,
    scope: initialScope,
    ownsScope: ownsInitialScope,
    createScope,
    unregister: null,
    registeredOptions: null,
  };
  try {
    const registration = register(state, initialScope, initialOptions);
    state.unregister = registration.unregister;
    state.registeredOptions = registration.options;
  } catch (error) {
    if (ownsInitialScope) initialScope.destroy();
    clearState(state);
    state = null;
    throw error;
  }

  const action: SvelteActionReturn<T> = {
    update(nextOptions) {
      if (state !== null) updateAction(state, nextOptions);
    },
    destroy() {
      const current = state;
      if (current === null) return;
      try {
        disposeRegistration(current);
      } finally {
        try {
          if (current.ownsScope) current.scope?.destroy();
        } finally {
          clearState(current);
          state = null;
        }
      }
    },
  };
  inspections.set(action, () => inspectState(state));
  return action;
}

export function inspectSvelteActionForTest(action: object): SvelteActionInspection {
  const inspect = inspections.get(action);
  if (inspect === undefined) throw new SortableError('INVALID_OPTION');
  return inspect();
}

function updateAction<T>(state: ActionState<T>, nextOptions: SvelteSortableOptions<T>): void {
  const currentOptions = requireOptions(state);
  const scopeChanged = currentOptions.scope !== nextOptions.scope;
  const areaChanged = currentOptions.areaId !== nextOptions.areaId;
  if (scopeChanged || areaChanged) {
    transition(state, nextOptions, scopeChanged);
    return;
  }
  const nextAreaOptions = areaOptionsFor(state, nextOptions);
  const areaOptionsChanged = state.registeredOptions !== null
    && !sameOptions(state.registeredOptions, nextAreaOptions);
  state.options = nextOptions;
  if (areaOptionsChanged) {
    try {
      controllerForScope(requireScope(state.scope)).updateArea(currentOptions.areaId, nextAreaOptions);
      state.registeredOptions = nextAreaOptions;
    } catch (error) {
      state.options = currentOptions;
      throw error;
    }
  }
}

function transition<T>(
  state: ActionState<T>,
  nextOptions: SvelteSortableOptions<T>,
  scopeChanged: boolean,
): void {
  const previousOptions = requireOptions(state);
  const previousScope = requireScope(state.scope);
  const previousOwnsScope = state.ownsScope;
  const previousRegistration = state.unregister;
  const previousRegisteredOptions = state.registeredOptions;
  const ownsCandidateScope = scopeChanged ? nextOptions.scope === undefined : previousOwnsScope;
  let candidateScope = previousScope;
  let createdCandidate = false;
  let candidateRegistration: Registration | null = null;
  let previousDetached = false;

  try {
    if (scopeChanged) {
      candidateScope = nextOptions.scope ?? createOwnedScope(state);
      createdCandidate = nextOptions.scope === undefined;
      disposeRegistration(state);
      previousDetached = true;
      candidateRegistration = register(state, candidateScope, nextOptions);
    } else {
      disposeRegistration(state);
      previousDetached = true;
      candidateRegistration = register(state, candidateScope, nextOptions);
    }
    if (previousOwnsScope && previousScope !== candidateScope) previousScope.destroy();
    state.options = nextOptions;
    state.scope = candidateScope;
    state.ownsScope = ownsCandidateScope;
    state.unregister = candidateRegistration.unregister;
    state.registeredOptions = candidateRegistration.options;
  } catch (error) {
    candidateRegistration?.unregister();
    if (createdCandidate && candidateScope !== previousScope) candidateScope.destroy();
    state.options = previousOptions;
    state.scope = previousScope;
    state.ownsScope = previousOwnsScope;
    state.unregister = previousDetached ? null : previousRegistration;
    state.registeredOptions = previousDetached ? null : previousRegisteredOptions;
    if (previousDetached) {
      try {
        const restored = register(state, previousScope, previousOptions);
        state.unregister = restored.unregister;
        state.registeredOptions = restored.options;
      } catch {
        if (previousOwnsScope) previousScope.destroy();
        state.unregister = null;
        state.registeredOptions = null;
      }
    }
    throw error;
  }
}

function register<T>(
  state: ActionState<T>,
  scope: SvelteSortableScope<T>,
  options: SvelteSortableOptions<T>,
): Registration {
  state.pendingOptions = options;
  try {
    const areaOptions = areaOptionsFor(state, options);
    return {
      unregister: controllerForScope(scope).registerArea(
        requireNode(state),
        createBinding(() => bindingOptions(state), () => requireNode(state)),
        areaOptions,
      ),
      options: areaOptions,
    };
  } finally {
    state.pendingOptions = null;
  }
}

function disposeRegistration<T>(state: ActionState<T>): void {
  const unregister = state.unregister;
  state.unregister = null;
  state.registeredOptions = null;
  unregister?.();
}

function createOwnedScope<T>(state: ActionState<T>): SvelteSortableScope<T> {
  const createScope = state.createScope;
  if (createScope === null) throw new SortableError('INVALID_OPTION');
  return createScope();
}

function bindingOptions<T>(state: ActionState<T>): SvelteSortableOptions<T> {
  return state.pendingOptions ?? requireOptions(state);
}

function areaOptionsFor<T>(
  state: ActionState<T>,
  options: SvelteSortableOptions<T>,
): SortableAreaOptions {
  return toAreaOptions(options, itemIdForElement(() => requireNode(state), () => bindingOptions(state)));
}

function requireNode<T>(state: ActionState<T>): HTMLElement {
  if (state.node === null) throw new SortableError('INVALID_ELEMENT');
  return state.node;
}

function requireOptions<T>(state: ActionState<T>): SvelteSortableOptions<T> {
  if (state.options === null) throw new SortableError('INVALID_OPTION');
  return state.options;
}

function clearState<T>(state: ActionState<T>): void {
  state.node = null;
  state.options = null;
  state.pendingOptions = null;
  state.scope = null;
  state.createScope = null;
  state.unregister = null;
  state.registeredOptions = null;
  state.ownsScope = false;
}

function inspectState<T>(state: ActionState<T> | null): SvelteActionInspection {
  return {
    hasNode: state?.node !== null && state?.node !== undefined,
    hasOptions: state?.options !== null && state?.options !== undefined,
    hasScope: state?.scope !== null && state?.scope !== undefined,
    hasCreateScope: state?.createScope !== null && state?.createScope !== undefined,
    hasRegistration: state?.unregister !== null && state?.unregister !== undefined,
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
    get group() {
      const group = getOptions().group;
      return typeof group === 'string' ? group : group?.name ?? '';
    },
    getItems: () => getOptions().items,
    getItemId: (item) => resolveItemId(item, getOptions().itemKey),
    setItems: (items) => getOptions().onItemsChange(items),
    getElement,
    copyItem: (context) => {
      const current = getOptions();
      const item = current.items[context.source.index];
      if (item === undefined || current.copyItem === undefined) {
        throw new SortableError('INVALID_OPTION');
      }
      return current.copyItem(item, context);
    },
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
