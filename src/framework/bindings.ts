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

export interface BindingSnapshot<T> {
  binding: FrameworkAreaBinding<T>;
  items: readonly T[];
}

interface BindingRecord<T> {
  token: symbol;
  binding: FrameworkAreaBinding<T>;
}

export class BindingRegistry<T> {
  private readonly bindings = new Map<string, BindingRecord<T>>();

  get size(): number {
    return this.bindings.size;
  }

  register(binding: FrameworkAreaBinding<T>): () => void {
    const areaId = binding.areaId;
    if (this.bindings.has(areaId)) {
      throw new SortableError('DUPLICATE_AREA_ID');
    }

    this.scanGroups(new Set([binding.group]), binding);
    const token = Symbol(areaId);
    this.bindings.set(areaId, { token, binding });
    return () => {
      if (this.bindings.get(areaId)?.token === token) {
        this.bindings.delete(areaId);
      }
    };
  }

  unregister(areaId: string): void {
    this.bindings.delete(areaId);
  }

  get(areaId: string): FrameworkAreaBinding<T> | undefined {
    return this.bindings.get(areaId)?.binding;
  }

  snapshot(areaIds: readonly string[]): readonly BindingSnapshot<T>[] {
    const records = areaIds.map((areaId) => this.requireRecord(areaId));
    const itemsByBinding = this.scanGroups(
      new Set(records.map((record) => record.binding.group)),
    );
    return records.map((record) => ({
      binding: record.binding,
      items: itemsByBinding.get(record.binding) as readonly T[],
    }));
  }

  private scanGroups(
    groups: ReadonlySet<string>,
    candidate?: FrameworkAreaBinding<T>,
  ): Map<FrameworkAreaBinding<T>, readonly T[]> {
    const itemsByBinding = new Map<FrameworkAreaBinding<T>, readonly T[]>();
    const bindings: FrameworkAreaBinding<T>[] = [];
    const read = (binding: FrameworkAreaBinding<T>): void => {
      const items = binding.getItems();
      itemsByBinding.set(binding, items);
      bindings.push(binding);
    };

    for (const record of this.bindings.values()) {
      if (groups.has(record.binding.group)) {
        read(record.binding);
      }
    }
    if (candidate !== undefined) {
      read(candidate);
    }

    const itemIdsByGroup = new Map<string, Set<SortableId>>();
    for (const binding of bindings) {
      const items = itemsByBinding.get(binding) as readonly T[];
      let itemIds = itemIdsByGroup.get(binding.group);
      if (itemIds === undefined) {
        itemIds = new Set<SortableId>();
        itemIdsByGroup.set(binding.group, itemIds);
      }
      for (const item of items) {
        const itemId = this.itemId(binding, item);
        if (itemIds.has(itemId)) {
          throw new SortableError('DUPLICATE_ITEM_ID');
        }
        itemIds.add(itemId);
      }
    }
    return itemsByBinding;
  }

  private itemId(binding: FrameworkAreaBinding<T>, item: T): SortableId {
    const itemId = binding.getItemId(item);
    if (typeof itemId !== 'string' && typeof itemId !== 'number') {
      throw new SortableError('MISSING_ITEM_ID');
    }
    return itemId;
  }

  private requireRecord(areaId: string): BindingRecord<T> {
    const record = this.bindings.get(areaId);
    if (record === undefined) {
      throw new SortableError('INVALID_OPTION');
    }
    return record;
  }
}
