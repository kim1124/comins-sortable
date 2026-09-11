import { SortableError } from '../core.js';
import type { CopyItemContext, SortableChange, SortableId } from '../core.js';

export interface DomTransactionArea {
  element: Element;
  item?: string;
  getItemId?: (element: Element) => SortableId;
  copyElement?: (source: Element, context: CopyItemContext) => Element;
}

export type DomTransactionRegistry = ReadonlyMap<string, Element | DomTransactionArea>;

interface MoveDomSnapshot {
  operation: 'move';
  areas: readonly {
    parent: Element;
    items: readonly Element[];
    boundary: Element | null;
  }[];
}

interface CopyDomSnapshot {
  operation: 'copy';
  copy: Element;
}

type DomSnapshot = MoveDomSnapshot | CopyDomSnapshot;

export interface DomTransaction {
  prepareCopy(areaId: string, context: CopyItemContext): SortableId;
  apply(change: SortableChange): void;
  rollback(): void;
  release(): void;
}

export function createDomTransaction(registry: DomTransactionRegistry): DomTransaction {
  let snapshot: DomSnapshot | null = null;
  let preparedCopy: { sourceAreaId: string; element: Element; itemId: SortableId } | null = null;

  const prepareCopy = (areaId: string, context: CopyItemContext): SortableId => {
    if (preparedCopy !== null) {
      throw new SortableError('INVALID_OPTION');
    }
    const area = registry.get(areaId);
    if (area === undefined || !isTransactionArea(area) || area.copyElement === undefined) {
      throw new SortableError('INVALID_OPTION');
    }
    if (context.source.areaId !== areaId) {
      throw new SortableError('INVALID_OPTION');
    }
    const source = findSourceInArea(area, context.itemId);
    const copy = area.copyElement(source, context);
    if (
      !isElement(copy)
      || copy.ownerDocument !== area.element.ownerDocument
      || copy.parentElement !== null
    ) {
      throw new SortableError('INVALID_ELEMENT');
    }
    const itemId = itemIdFor(area, copy);
    if (typeof itemId !== 'string' && typeof itemId !== 'number') {
      throw new SortableError('MISSING_ITEM_ID');
    }
    for (const registeredArea of registry.values()) {
      if (directItems(registeredArea).some(
        (element) => itemIdFor(registeredArea, element) === itemId,
      )) {
        throw new SortableError('DUPLICATE_ITEM_ID');
      }
    }
    preparedCopy = { sourceAreaId: areaId, element: copy, itemId };
    return itemId;
  };

  const apply = (change: SortableChange): void => {
    if (change.operation === 'copy') {
      const prepared = preparedCopy;
      if (
        prepared === null
        || prepared.sourceAreaId !== change.source.areaId
        || prepared.itemId !== change.itemId
      ) {
        throw new SortableError('INVALID_OPTION');
      }
      const destinationArea = registry.get(change.destination.areaId);
      const destination = areaElement(destinationArea);
      const remaining = directItems(destinationArea);
      const before = remaining[change.destination.index] ?? trailingBoundary(destination, remaining);
      snapshot = { operation: 'copy', copy: prepared.element };
      try {
        destination.insertBefore(prepared.element, before);
        // Relative selectors only have meaning in the registered destination.
        if (
          !directItems(destinationArea).includes(prepared.element)
          || itemIdFor(destinationArea as Element | DomTransactionArea, prepared.element) !== prepared.itemId
        ) {
          throw new SortableError('INVALID_ELEMENT');
        }
      } catch (error) {
        rollback();
        throw error;
      }
      return;
    }

    const elements = new Map<SortableId, Element>();
    const affected = change.orders.map((order) => {
      const registered = registry.get(order.areaId);
      const parent = areaElement(registered);
      const items = directItems(registered);
      for (const element of items) {
        const itemId = itemIdFor(registered as Element | DomTransactionArea, element);
        if (elements.has(itemId)) throw new SortableError('DUPLICATE_ITEM_ID');
        elements.set(itemId, element);
      }
      return { parent, items, boundary: trailingBoundary(parent, items) };
    });
    snapshot = { operation: 'move', areas: affected };
    for (const order of change.orders) {
      const registered = registry.get(order.areaId);
      const parent = areaElement(registered);
      const currentItems = directItems(registered);
      const boundary = trailingBoundary(parent, currentItems);
      for (const itemId of order.itemIds) {
        const element = elements.get(itemId);
        if (element === undefined) throw new SortableError('INVALID_ELEMENT');
        parent.insertBefore(element, boundary);
      }
    }
  };

  const rollback = (): void => {
    if (snapshot === null) {
      preparedCopy = null;
      return;
    }
    if (snapshot.operation === 'copy') {
      snapshot.copy.remove();
      snapshot = null;
      preparedCopy = null;
      return;
    }
    for (const area of snapshot.areas) {
      const before = area.boundary?.parentNode === area.parent ? area.boundary : null;
      for (const item of area.items) area.parent.insertBefore(item, before);
    }
    snapshot = null;
    preparedCopy = null;
  };

  return {
    prepareCopy,
    apply,
    rollback,
    release() {
      snapshot = null;
      preparedCopy = null;
    },
  };
}

function isElement(value: unknown): value is Element {
  return typeof value === 'object'
    && value !== null
    && 'ownerDocument' in value
    && 'matches' in value
    && typeof value.matches === 'function'
    && 'querySelectorAll' in value
    && typeof value.querySelectorAll === 'function';
}

function findSourceInArea(
  area: Element | DomTransactionArea,
  itemId: SortableId,
): Element {
  for (const element of directItems(area)) {
    if (itemIdFor(area, element) === itemId) {
      return element;
    }
  }
  throw new SortableError('INVALID_ELEMENT');
}

function areaElement(area: Element | DomTransactionArea | undefined): Element {
  if (area === undefined) {
    throw new SortableError('INVALID_ELEMENT');
  }
  return isTransactionArea(area) ? area.element : area;
}

function directItems(area: Element | DomTransactionArea | undefined): Element[] {
  const element = areaElement(area);
  if (area === undefined || !isTransactionArea(area) || area.item === undefined) {
    return Array.from(element.children).filter(
      (candidate) => !candidate.hasAttribute('data-comins-sortable-placeholder'),
    );
  }
  return Array.from(element.querySelectorAll(area.item)).filter(
    (candidate) => (
      candidate.parentElement === element
      && !candidate.hasAttribute('data-comins-sortable-placeholder')
    ),
  );
}

function itemIdFor(area: Element | DomTransactionArea, element: Element): SortableId {
  if (isTransactionArea(area) && area.getItemId !== undefined) {
    return area.getItemId(element);
  }
  return element.getAttribute('data-sortable-id') as SortableId;
}

function isTransactionArea(
  area: Element | DomTransactionArea,
): area is DomTransactionArea {
  return 'element' in area;
}

function trailingBoundary(parent: Element, items: readonly Element[]): Element | null {
  const last = items[items.length - 1];
  if (last === undefined) return null;
  const children = Array.from(parent.children);
  return children[children.indexOf(last) + 1] ?? null;
}
