import type { InjectionKey } from 'vue';

import { createSortableScope } from '../core/scope.js';
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

export interface VueSortableRootOptions<T> extends Omit<SortableScopeOptions, 'onChange'> {
  onChange?: (change: FrameworkSortableChange<T>) => void;
}

export interface VueSortableController<T> {
  registerArea(
    element: Element,
    binding: FrameworkAreaBinding<T>,
    options: SortableAreaOptions,
  ): () => void;
  updateArea(areaId: string, patch: SortableAreaPatch): void;
  destroy(): void;
}

export interface VueSortableControllerOptions<T> {
  getRootOptions(): VueSortableRootOptions<T>;
  createScope?(options: SortableScopeOptions): SortableScope;
}

export const VueSortableContext: InjectionKey<VueSortableController<unknown> | null> = Symbol('comins-sortable-vue');

export function createVueSortableController<T>(
  options: VueSortableControllerOptions<T>,
): VueSortableController<T> {
  const bindings = new BindingRegistry<T>();
  const transaction = new ControlledTransaction(bindings, (change) => {
    options.getRootOptions().onChange?.(change);
  });
  const scope = (options.createScope ?? createSortableScope)({
    onBeforeDragStart: (context) => {
      bindings.validateElements();
      return options.getRootOptions().onBeforeDragStart?.(context);
    },
    onDragStart: (context) => options.getRootOptions().onDragStart?.(context),
    onDrag: (context) => options.getRootOptions().onDrag?.(context),
    onInsertDragArea: (event) => options.getRootOptions().onInsertDragArea?.(event),
    onChange: (change) => transaction.apply(change),
    onAfterDrag: (result) => handleAfterDrag(transaction, options.getRootOptions(), result),
    onError: (error) => {
      const onError = options.getRootOptions().onError;
      if (onError === undefined) throw error;
      onError(error);
    },
  });
  let destroyed = false;

  return {
    registerArea(element, binding, areaOptions) {
      if (destroyed) {
        throw new Error('Vue sortable controller is destroyed');
      }
      const unregisterBinding = bindings.register(binding);
      let unregisterScope: (() => void) | null = null;
      try {
        unregisterScope = scope.registerArea(element, areaOptions);
      } catch (error) {
        unregisterBinding();
        throw error;
      }
      let disposed = false;
      return () => {
        if (disposed) return;
        disposed = true;
        unregisterScope?.();
        unregisterBinding();
      };
    },
    updateArea(areaId, patch) {
      scope.updateArea(areaId, patch);
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      scope.destroy();
      transaction.destroy();
    },
  };
}

export function handleAfterDrag<T>(
  transaction: Pick<ControlledTransaction<T>, 'finish' | 'rollback'>,
  rootOptions: VueSortableRootOptions<T>,
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
    rootOptions.onAfterDrag?.(result);
  } catch (error) {
    firstError ??= error;
  }
  if (firstError !== undefined) throw firstError;
}
