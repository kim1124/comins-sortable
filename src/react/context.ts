import { createContext } from 'react';

import { createSortableScope } from '../core/scope.js';
import type {
  AfterDragResult,
  FrameworkSortableChange,
  SortableAreaOptions,
  SortableAreaPatch,
  SortableChange,
  SortableScope,
  SortableScopeOptions,
} from '../core/model.js';
import {
  BindingRegistry,
  type FrameworkAreaBinding,
} from '../framework/bindings.js';
import { ControlledTransaction } from '../framework/controlled-transaction.js';

export interface ReactSortableRootCallbacks<T>
  extends Omit<SortableScopeOptions, 'onChange'> {
  onChange?: (change: FrameworkSortableChange<T>) => void;
}

export interface ReactSortableController<T> {
  registerArea(
    element: Element,
    binding: FrameworkAreaBinding<T>,
    options: SortableAreaOptions,
  ): () => void;
  updateArea(areaId: string, patch: SortableAreaPatch): void;
  destroy(): void;
}

export interface ReactSortableControllerOptions<T> {
  getRootProps(): ReactSortableRootCallbacks<T>;
  createScope?(options: SortableScopeOptions): SortableScope;
}

export const ReactSortableContext = createContext<ReactSortableController<unknown> | null>(null);

export function createReactSortableController<T>(
  options: ReactSortableControllerOptions<T>,
): ReactSortableController<T> {
  const bindings = new BindingRegistry<T>();
  const transaction = new ControlledTransaction(bindings, (change) => {
    options.getRootProps().onChange?.(change);
  });
  const createScope = options.createScope ?? createSortableScope;
  const scope = createScope({
    onBeforeDragStart: (context) => options.getRootProps().onBeforeDragStart?.(context),
    onDragStart: (context) => options.getRootProps().onDragStart?.(context),
    onDrag: (context) => options.getRootProps().onDrag?.(context),
    onInsertDragArea: (event) => options.getRootProps().onInsertDragArea?.(event),
    onChange: (change) => transaction.apply(change),
    onAfterDrag: (result) => handleAfterDrag(transaction, options.getRootProps(), result),
    onError: (error) => options.getRootProps().onError?.(error),
  });
  let destroyed = false;

  return {
    registerArea(element, binding, areaOptions) {
      if (destroyed) {
        throw new Error('React sortable controller is destroyed');
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
        if (disposed) {
          return;
        }
        disposed = true;
        unregisterScope?.();
        unregisterBinding();
      };
    },
    updateArea(areaId, patch) {
      scope.updateArea(areaId, patch);
    },
    destroy() {
      if (destroyed) {
        return;
      }
      destroyed = true;
      scope.destroy();
      transaction.destroy();
    },
  };
}

function handleAfterDrag<T>(
  transaction: ControlledTransaction<T>,
  rootProps: ReactSortableRootCallbacks<T>,
  result: AfterDragResult,
): void {
  if (result.status === 'dropped') {
    transaction.finish();
  } else {
    transaction.rollback();
  }
  rootProps.onAfterDrag?.(result);
}
