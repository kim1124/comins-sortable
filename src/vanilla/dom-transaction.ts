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
  source: Element;
  parent: Element;
  nextSibling: Node | null;
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
      || (area.item !== undefined && !copy.matches(area.item))
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
      const before = remaining[change.destination.index] ?? null;
      destination.insertBefore(prepared.element, before);
      snapshot = { operation: 'copy', copy: prepared.element };
      return;
    }

    const sourceArea = registry.get(change.source.areaId);
    if (sourceArea === undefined) {
      throw new SortableError('INVALID_ELEMENT');
    }
    const source = findSourceInArea(sourceArea, change.itemId);
    const parent = source.parentElement;
    if (parent === null) {
      throw new SortableError('INVALID_ELEMENT');
    }
    snapshot = {
      operation: 'move',
      source,
      parent,
      nextSibling: source.nextSibling,
    };

    const destination = areaElement(registry.get(change.destination.areaId));
    const remaining = directItems(
      registry.get(change.destination.areaId),
    ).filter((element) => element !== source);
    const before = remaining[change.destination.index] ?? null;
    destination.insertBefore(source, before);
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
    const { source, parent, nextSibling } = snapshot;
    const before = nextSibling?.parentNode === parent ? nextSibling : null;
    parent.insertBefore(source, before);
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
