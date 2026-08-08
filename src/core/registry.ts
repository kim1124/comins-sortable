import { SortableError } from './errors.js';
import type { DragContext, SortableDirection, SortableId } from './model.js';

export interface RegisteredArea {
  element: Element;
  areaId: string;
  group: string;
  direction: SortableDirection;
  disabled: boolean;
  itemSelector: string;
  getItemId(element: Element): SortableId;
  accept(context: DragContext): boolean;
}

export class AreaRegistry {
  private readonly areas = new Map<string, RegisteredArea>();
  private readonly elements = new WeakMap<Element, RegisteredArea>();
  private ownerDocument: Document | null = null;

  get size(): number {
    return this.areas.size;
  }

  register(area: RegisteredArea): () => void {
    if (this.areas.has(area.areaId)) {
      throw new SortableError('DUPLICATE_AREA_ID');
    }
    if (this.elements.has(area.element)) {
      throw new SortableError('INVALID_ELEMENT');
    }

    const document = area.element.ownerDocument;
    if (document === null || (this.ownerDocument !== null && document !== this.ownerDocument)) {
      throw new SortableError('INVALID_ELEMENT');
    }

    this.validateItemIds([...this.areas.values(), area]);
    this.areas.set(area.areaId, area);
    this.elements.set(area.element, area);
    this.ownerDocument = document;

    let registered = true;
    return () => {
      if (!registered) {
        return;
      }
      registered = false;
      this.unregisterRegistered(area);
    };
  }

  unregister(areaId: string): void {
    const area = this.areas.get(areaId);
    if (area === undefined) {
      return;
    }

    this.unregisterRegistered(area);
  }

  private unregisterRegistered(area: RegisteredArea): void {
    if (this.areas.get(area.areaId) !== area) {
      return;
    }

    this.areas.delete(area.areaId);
    this.elements.delete(area.element);
    if (this.areas.size === 0) {
      this.ownerDocument = null;
    }
  }

  get(areaId: string): RegisteredArea | undefined {
    return this.areas.get(areaId);
  }

  getByElement(element: Element): RegisteredArea | undefined {
    return this.elements.get(element);
  }

  itemIds(areaId: string): readonly SortableId[] {
    const area = this.areas.get(areaId);
    if (area === undefined) {
      return [];
    }

    this.validateItemIds(this.areas.values());
    return this.collectItemIds(area);
  }

  areasInGroup(group: string): readonly RegisteredArea[] {
    return [...this.areas.values()].filter((area) => area.group === group);
  }

  private validateItemIds(areas: Iterable<RegisteredArea>): void {
    const idsByGroup = new Map<string, Set<SortableId>>();

    for (const area of areas) {
      let ids = idsByGroup.get(area.group);
      if (ids === undefined) {
        ids = new Set<SortableId>();
        idsByGroup.set(area.group, ids);
      }

      for (const itemId of this.collectItemIds(area)) {
        if (ids.has(itemId)) {
          throw new SortableError('DUPLICATE_ITEM_ID');
        }
        ids.add(itemId);
      }
    }
  }

  private collectItemIds(area: RegisteredArea): readonly SortableId[] {
    const elements = Array.from(area.element.querySelectorAll(area.itemSelector))
      .filter((element) => element.parentElement === area.element);
    const ids: SortableId[] = [];

    for (const element of elements) {
      const itemId = area.getItemId(element);
      if (itemId === undefined || itemId === null) {
        throw new SortableError('MISSING_ITEM_ID');
      }
      ids.push(itemId);
    }

    return ids;
  }
}
