import { createSortableScope, SortableError } from '../core.js';
import type {
  AfterDragResult,
  SortableAreaPatch,
  SortableChange,
  SortableId,
} from '../core.js';
import { createDomTransaction } from './dom-transaction.js';
import type { DomTransactionArea } from './dom-transaction.js';
import type {
  Sortable,
  VanillaSortableAreaOptions,
  VanillaSortableOptions,
} from './types.js';

export function createSortable(
  element: Element | string,
  options: VanillaSortableOptions,
): Sortable {
  const areas = new Map<string, DomTransactionArea>();
  const transaction = createDomTransaction(areas);
  const scope = createSortableScope({
    onBeforeDragStart: options.onBeforeDragStart,
    onDragStart: options.onDragStart,
    onDrag: options.onDrag,
    onInsertDragArea: options.onInsertDragArea,
    onChange: (change) => handleChange(change),
    onAfterDrag: (result) => handleAfterDrag(result),
    onError: options.onError,
  });
  let destroyed = false;

  const registerArea = (
    candidate: Element | string,
    areaOptions: VanillaSortableAreaOptions,
  ): (() => void) => {
    const areaElement = resolveElement(candidate);
    const unregisterScope = scope.registerArea(areaElement, areaOptions);
    const registered: DomTransactionArea = {
      element: areaElement,
      item: areaOptions.item,
      getItemId: areaOptions.getItemId ?? defaultItemId,
    };
    areas.set(areaOptions.areaId, registered);
    return () => {
      unregisterScope();
      if (areas.get(areaOptions.areaId) === registered) {
        areas.delete(areaOptions.areaId);
      }
    };
  };

  registerArea(element, options);

  return {
    registerArea,
    updateArea(areaId: string, patch: SortableAreaPatch): void {
      scope.updateArea(areaId, patch);
      const area = areas.get(areaId);
      if (area !== undefined) {
        if (patch.item !== undefined) {
          area.item = patch.item;
        }
        if ('getItemId' in patch) {
          area.getItemId = patch.getItemId ?? defaultItemId;
        }
      }
    },
    cancel(): void {
      scope.cancel();
    },
    destroy(): void {
      if (destroyed) {
        return;
      }
      destroyed = true;
      scope.destroy();
      areas.clear();
    },
  };

  function handleChange(change: SortableChange): void {
    transaction.apply(change);
    try {
      options.onChange?.(change);
    } catch (error) {
      transaction.rollback();
      throw error;
    }
  }

  function handleAfterDrag(result: AfterDragResult): void {
    if (result.status === 'dropped') {
      transaction.release();
    } else {
      transaction.rollback();
    }
    options.onAfterDrag?.(result);
  }
}

function resolveElement(candidate: Element | string): Element {
  if (typeof candidate !== 'string') {
    if (isElement(candidate)) {
      return candidate;
    }
    throw new SortableError('INVALID_ELEMENT');
  }
  try {
    const document = globalThis.document;
    const element = document?.querySelector(candidate) ?? null;
    if (!isElement(element)) {
      throw new SortableError('INVALID_ELEMENT');
    }
    return element;
  } catch {
    throw new SortableError('INVALID_ELEMENT');
  }
}

function isElement(value: unknown): value is Element {
  return typeof value === 'object'
    && value !== null
    && 'ownerDocument' in value
    && 'querySelectorAll' in value
    && 'addEventListener' in value;
}

function defaultItemId(element: Element): SortableId {
  return element.getAttribute('data-sortable-id') as SortableId;
}
