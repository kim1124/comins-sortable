import { SortableError } from '../core.js';
import type { SortableChange, SortableId } from '../core.js';

export interface DomTransactionArea {
  element: Element;
  item?: string;
  getItemId?: (element: Element) => SortableId;
}

export type DomTransactionRegistry = ReadonlyMap<string, Element | DomTransactionArea>;

interface DomSnapshot {
  source: Element;
  parent: Element;
  nextSibling: Node | null;
}

export interface DomTransaction {
  apply(change: SortableChange): void;
  rollback(): void;
  release(): void;
}

export function createDomTransaction(registry: DomTransactionRegistry): DomTransaction {
  let snapshot: DomSnapshot | null = null;

  const apply = (change: SortableChange): void => {
    const source = findSource(registry, change.itemId);
    const parent = source.parentElement;
    if (parent === null) {
      throw new SortableError('INVALID_ELEMENT');
    }
    snapshot = {
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
      return;
    }
    const { source, parent, nextSibling } = snapshot;
    const before = nextSibling?.parentNode === parent ? nextSibling : null;
    parent.insertBefore(source, before);
    snapshot = null;
  };

  return {
    apply,
    rollback,
    release() {
      snapshot = null;
    },
  };
}

function findSource(registry: DomTransactionRegistry, itemId: SortableId): Element {
  for (const area of registry.values()) {
    for (const element of directItems(area)) {
      if (itemIdFor(area, element) === itemId) {
        return element;
      }
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
