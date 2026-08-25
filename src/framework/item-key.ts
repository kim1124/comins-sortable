import { SortableError } from '../core/errors.js';
import type { ItemKey, SortableId } from '../core/model.js';

export function resolveItemIds<T>(
  items: readonly T[],
  itemKey: ItemKey<T>,
): readonly SortableId[] {
  return items.map((item) => resolveItemId(item, itemKey));
}

export function resolveItemId<T>(item: T, itemKey: ItemKey<T>): SortableId {
  const value = typeof itemKey === 'function'
    ? itemKey(item)
    : item[itemKey];

  if (typeof value !== 'string' && typeof value !== 'number') {
    throw new SortableError('MISSING_ITEM_ID');
  }

  return value;
}
