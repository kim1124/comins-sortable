import { createSortableScopeForFramework } from '../core/scope.js';
import { SortableError } from '../core/errors.js';
import type {
  AfterDragResult,
  FrameworkSortableChange,
  SortableAreaOptions,
  SortableAreaPatch,
  SortableScope,
  SortableScopeOptions,
} from '../core/model.js';
import { BindingRegistry, type FrameworkAreaBinding } from '../framework/bindings.js';
import { ControlledTransaction } from '../framework/controlled-transaction.js';

export interface SvelteSortableScopeOptions<T> extends Omit<SortableScopeOptions, 'onChange'> {
  onChange?: (change: FrameworkSortableChange<T>) => void;
}

export interface SvelteSortableController<T> {
  registerArea(
    element: Element,
    binding: FrameworkAreaBinding<T>,
    options: SortableAreaOptions,
  ): () => void;
  updateArea(areaId: string, patch: SortableAreaPatch): void;
  cancel(): void;
  destroy(): void;
}

export const svelteScopeBrand: unique symbol = Symbol('comins-sortable-svelte-scope');

export interface SvelteSortableScope<T> {
  readonly [svelteScopeBrand]: (item: T) => T;
  cancel(): void;
  destroy(): void;
}

const controllers = new WeakMap<object, SvelteSortableController<unknown>>();

export function createSortableScope<T>(
  options: SvelteSortableScopeOptions<T> = {},
): SvelteSortableScope<T> {
  return createSvelteSortableScope(options);
}

export function createSvelteSortableScope<T>(
  options: SvelteSortableScopeOptions<T> = {},
  createScope?: (options: SortableScopeOptions) => SortableScope,
): SvelteSortableScope<T> {
  let controller: SvelteSortableController<T> | null = createSvelteSortableController(options, createScope);
  let scope!: SvelteSortableScope<T>;
  scope = {
    [svelteScopeBrand]: (item) => item,
    cancel: () => controller?.cancel(),
    destroy: () => {
      controller?.destroy();
      controller = null;
      controllers.delete(scope);
    },
  };
  controllers.set(scope, controller as SvelteSortableController<unknown>);
  return scope;
}

export function controllerForScope<T>(scope: SvelteSortableScope<T>): SvelteSortableController<T> {
  const controller = controllers.get(scope);
  if (controller === undefined) {
    throw new SortableError('INVALID_OPTION');
  }
  return controller as SvelteSortableController<T>;
}

export function createSvelteSortableController<T>(
  scopeOptions: SvelteSortableScopeOptions<T>,
  createScope: (options: SortableScopeOptions) => SortableScope = createSortableScopeForFramework,
): SvelteSortableController<T> {
  const bindings = new BindingRegistry<T>();
  const transaction = new ControlledTransaction(bindings, (change) => {
    scopeOptions.onChange?.(change);
  });
  const scope = createScope({
    onBeforeDragStart: (context) => {
      bindings.validateElements();
      return scopeOptions.onBeforeDragStart?.(context);
    },
    onDragStart: (context) => scopeOptions.onDragStart?.(context),
    onDrag: (context) => scopeOptions.onDrag?.(context),
    onInsertDragArea: (event) => scopeOptions.onInsertDragArea?.(event),
    onChange: (change) => transaction.apply(change),
    onAfterDrag: (result) => handleAfterDrag(transaction, scopeOptions, result),
    onError: (error) => {
      const onError = scopeOptions.onError;
      if (onError === undefined) throw error;
      onError(error);
    },
  });
  let destroyed = false;
  const registrations = new Set<() => void>();

  return {
    registerArea(element, binding, areaOptions) {
      if (destroyed) throw new SortableError('INVALID_OPTION');
      const unregisterBinding = bindings.register(binding);
      let unregisterScope: (() => void) | null = null;
      try {
        unregisterScope = scope.registerArea(element, areaOptions);
      } catch (error) {
        unregisterBinding();
        throw error;
      }
      let disposed = false;
      const dispose = (): void => {
        if (disposed) return;
        disposed = true;
        registrations.delete(dispose);
        unregisterScope?.();
        unregisterBinding();
      };
      registrations.add(dispose);
      return dispose;
    },
    updateArea(areaId, patch) {
      scope.updateArea(areaId, patch);
    },
    cancel() {
      scope.cancel();
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      scope.destroy();
      for (const dispose of [...registrations]) dispose();
      transaction.destroy();
    },
  };
}

export function handleAfterDrag<T>(
  transaction: Pick<ControlledTransaction<T>, 'finish' | 'rollback'>,
  options: SvelteSortableScopeOptions<T>,
  result: AfterDragResult,
): void {
  let firstError: unknown;
  try {
    if (result.status === 'dropped') transaction.finish();
    else transaction.rollback();
  } catch (error) {
    firstError = error;
  }
  try {
    options.onAfterDrag?.(result);
  } catch (error) {
    firstError ??= error;
  }
  if (firstError !== undefined) throw firstError;
}
