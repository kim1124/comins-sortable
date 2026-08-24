import type { ReactSortableController } from './context.js';

export function createReactRootLifecycle<T>(
  createController: () => ReactSortableController<T>,
): ReactSortableController<T> {
  let controller: ReactSortableController<T> | null = null;

  const current = (): ReactSortableController<T> => {
    controller ??= createController();
    return controller;
  };

  return {
    registerArea(element, binding, options) {
      return current().registerArea(element, binding, options);
    },
    updateArea(areaId, patch) {
      current().updateArea(areaId, patch);
    },
    destroy() {
      controller?.destroy();
      controller = null;
    },
  };
}
