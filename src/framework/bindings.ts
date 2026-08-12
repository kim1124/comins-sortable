import { SortableError } from '../core/errors.js';
import type { SortableId } from '../core/model.js';

export interface FrameworkAreaBinding<T> {
  areaId: string;
  group: string;
  getItems(): readonly T[];
  getItemId(item: T): SortableId;
  setItems(items: readonly T[]): void;
  getElement(): Element | null;
}

export class BindingRegistry<T> {
  private readonly bindings = new Map<string, FrameworkAreaBinding<T>>();

  get size(): number {
    return this.bindings.size;
  }

  register(binding: FrameworkAreaBinding<T>): () => void {
    if (this.bindings.has(binding.areaId)) {
      throw new SortableError('DUPLICATE_AREA_ID');
    }

    const bindingItemIds = this.itemIds(binding);
    const groupItemIds = this.groupItemIds(binding.group);
    for (const itemId of bindingItemIds) {
      if (groupItemIds.has(itemId)) {
        throw new SortableError('DUPLICATE_ITEM_ID');
      }
      groupItemIds.add(itemId);
    }

    this.bindings.set(binding.areaId, binding);
    return () => {
      if (this.bindings.get(binding.areaId) === binding) {
        this.bindings.delete(binding.areaId);
      }
    };
  }

  unregister(areaId: string): void {
    this.bindings.delete(areaId);
  }

  get(areaId: string): FrameworkAreaBinding<T> | undefined {
    return this.bindings.get(areaId);
  }

  private groupItemIds(group: string): Set<SortableId> {
    const itemIds = new Set<SortableId>();
    for (const binding of this.bindings.values()) {
      if (binding.group !== group) {
        continue;
      }
      for (const itemId of this.itemIds(binding)) {
        itemIds.add(itemId);
      }
    }
    return itemIds;
  }

  private itemIds(binding: FrameworkAreaBinding<T>): readonly SortableId[] {
    return binding.getItems().map((item) => {
      const itemId = binding.getItemId(item);
      if (typeof itemId !== 'string' && typeof itemId !== 'number') {
        throw new SortableError('MISSING_ITEM_ID');
      }
      return itemId;
    });
  }
}
