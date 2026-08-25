import { SortableError } from '../core/errors.js';
import { reorder, transfer } from '../core/operations.js';
import type {
  CopyItemContext,
  FrameworkSortableChange,
  SortableAreaUpdate,
  SortableChange,
} from '../core/model.js';
import type { BindingSnapshot, FrameworkAreaBinding } from './bindings.js';
import { BindingRegistry } from './bindings.js';

export interface ControlledTransaction<T> {
  prepareCopy(areaId: string, context: CopyItemContext): string | number;
  apply(change: SortableChange): FrameworkSortableChange<T>;
  confirm(change: SortableChange): boolean;
  finish(): void;
  rollback(): void;
  destroy(): void;
}

export class ControlledTransaction<T> implements ControlledTransaction<T> {
  private originals: readonly BindingSnapshot<T>[] | null = null;
  private preparedCopy: {
    sourceAreaId: string;
    item: T;
    itemId: string | number;
  } | null = null;

  constructor(
    private readonly registry: BindingRegistry<T>,
    private readonly onChange: (change: FrameworkSortableChange<T>) => void,
  ) {}

  prepareCopy(areaId: string, context: CopyItemContext): string | number {
    if (this.preparedCopy !== null) {
      throw new SortableError('INVALID_OPTION');
    }
    const binding = this.requireBinding(areaId);
    const sourceItem = binding.getItems()[context.source.index];
    if (
      context.source.areaId !== areaId
      || sourceItem === undefined
      || binding.getItemId(sourceItem) !== context.itemId
      || binding.copyItem === undefined
    ) {
      throw new SortableError('INVALID_OPTION');
    }
    const item = binding.copyItem(context);
    const itemId = binding.getItemId(item);
    if (typeof itemId !== 'string' && typeof itemId !== 'number') {
      throw new SortableError('MISSING_ITEM_ID');
    }
    if (this.registry.hasItemIdInGroup(binding.group, itemId)) {
      throw new SortableError('DUPLICATE_ITEM_ID');
    }
    this.preparedCopy = { sourceAreaId: areaId, item, itemId };
    return itemId;
  }

  apply(change: SortableChange): FrameworkSortableChange<T> {
    const snapshots = this.snapshots(change);
    const updates = this.updates(change, snapshots);
    const enhancedChange: FrameworkSortableChange<T> = {
      ...change,
      updates,
    };
    this.originals = snapshots;

    try {
      for (const update of updates) {
        const snapshot = snapshots.find(
          (candidate) => candidate.binding.areaId === update.areaId,
        );
        if (snapshot === undefined) {
          throw new SortableError('INVALID_OPTION');
        }
        snapshot.binding.setItems(update.items);
      }
      this.onChange(enhancedChange);
      return enhancedChange;
    } catch (error) {
      try {
        this.rollback();
      } catch {
        // The original callback failure remains the transaction failure.
      }
      throw error;
    }
  }

  confirm(change: SortableChange): boolean {
    for (const order of change.orders) {
      const binding = this.registry.get(order.areaId);
      if (binding === undefined) {
        return false;
      }
      const element = binding.getElement();
      if (element === null) {
        return false;
      }
      const items = binding.getItems();
      if (!sameIds(items.map((item) => binding.getItemId(item)), order.itemIds)) {
        return false;
      }
      const renderedItems = Array.from(element.children).filter(
        (child) => !child.hasAttribute('data-comins-sortable-placeholder'),
      );
      if (renderedItems.length !== items.length) {
        return false;
      }
    }
    return true;
  }

  finish(): void {
    this.originals = null;
    this.preparedCopy = null;
  }

  rollback(): void {
    const originals = this.originals;
    this.originals = null;
    this.preparedCopy = null;
    if (originals === null) {
      return;
    }

    let firstError: unknown;
    for (const snapshot of originals) {
      try {
        snapshot.binding.setItems(snapshot.items);
      } catch (error) {
        firstError ??= error;
      }
    }
    if (firstError !== undefined) {
      throw firstError;
    }
  }

  destroy(): void {
    this.finish();
  }

  private snapshots(change: SortableChange): readonly BindingSnapshot<T>[] {
    return this.registry.snapshot(change.orders.map((order) => order.areaId));
  }

  private updates(
    change: SortableChange,
    snapshots: readonly BindingSnapshot<T>[],
  ): readonly SortableAreaUpdate<T>[] {
    const snapshotsByAreaId = new Map(
      snapshots.map((snapshot) => [snapshot.binding.areaId, snapshot]),
    );
    const source = snapshotsByAreaId.get(change.source.areaId);
    const destination = snapshotsByAreaId.get(change.destination.areaId);
    if (source === undefined || destination === undefined) {
      throw new SortableError('INVALID_OPTION');
    }

    const nextItemsByAreaId = new Map<string, readonly T[]>();
    if (change.operation === 'reorder') {
      nextItemsByAreaId.set(
        source.binding.areaId,
        reorder(source.items, change.source.index, change.destination.index),
      );
    } else if (change.operation === 'transfer') {
      const next = transfer(
        source.items,
        destination.items,
        change.source.index,
        change.destination.index,
      );
      nextItemsByAreaId.set(source.binding.areaId, next.sourceItems);
      nextItemsByAreaId.set(destination.binding.areaId, next.destinationItems);
    } else {
      const prepared = this.preparedCopy;
      const sourceItem = source.items[change.source.index];
      if (
        prepared === null
        || prepared.sourceAreaId !== source.binding.areaId
        || prepared.itemId !== change.itemId
        || sourceItem === undefined
        || source.binding.getItemId(sourceItem) !== change.sourceItemId
      ) {
        throw new SortableError('INVALID_OPTION');
      }
      const nextDestinationItems = [...destination.items];
      nextDestinationItems.splice(change.destination.index, 0, prepared.item);
      nextItemsByAreaId.set(destination.binding.areaId, nextDestinationItems);
    }

    return [...nextItemsByAreaId].map(([areaId, items]) => {
      return { areaId, items };
    });
  }

  private requireBinding(areaId: string): FrameworkAreaBinding<T> {
    const binding = this.registry.get(areaId);
    if (binding === undefined) {
      throw new SortableError('INVALID_OPTION');
    }
    return binding;
  }
}

function sameIds(
  left: readonly (string | number)[],
  right: readonly (string | number)[],
): boolean {
  return left.length === right.length && left.every((itemId, index) => itemId === right[index]);
}
