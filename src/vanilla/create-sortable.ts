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
  VanillaSortableAreaPatch,
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
    const registered: DomTransactionArea = {
      element: areaElement,
      item: areaOptions.item,
      getItemId: areaOptions.getItemId ?? defaultItemId,
      copyElement: areaOptions.copyElement,
    };
    const unregisterScope = scope.registerArea(
      areaElement,
      withCopyPreparation(areaOptions, transaction),
    );
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
    updateArea(areaId: string, patch: VanillaSortableAreaPatch): void {
      scope.updateArea(areaId, withCopyPreparation(patch, transaction));
      const area = areas.get(areaId);
      if (area !== undefined) {
        if (patch.item !== undefined) {
          area.item = patch.item;
        }
        if ('getItemId' in patch) {
          area.getItemId = patch.getItemId ?? defaultItemId;
        }
        if ('copyElement' in patch) {
          area.copyElement = patch.copyElement;
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

function withCopyPreparation<
  O extends VanillaSortableAreaOptions | VanillaSortableAreaPatch,
>(
  options: O,
  transaction: ReturnType<typeof createDomTransaction>,
): Omit<O, 'copyElement'> & Pick<SortableAreaPatch, 'prepareCopy'> {
  const { copyElement: _copyElement, ...coreOptions } = options;
  return {
    ...coreOptions,
    prepareCopy: (context) => transaction.prepareCopy(context.source.areaId, context),
  };
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
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const candidate = value as Partial<Element>;
  const document = candidate.ownerDocument;
  return document !== null
    && document !== undefined
    && typeof document.createElement === 'function'
    && typeof candidate.querySelectorAll === 'function'
    && typeof candidate.addEventListener === 'function'
    && typeof candidate.removeEventListener === 'function'
    && typeof candidate.getAttribute === 'function'
    && typeof candidate.setAttribute === 'function'
    && typeof candidate.hasAttribute === 'function'
    && typeof candidate.matches === 'function';
}

function defaultItemId(element: Element): SortableId {
  return element.getAttribute('data-sortable-id') as SortableId;
}
