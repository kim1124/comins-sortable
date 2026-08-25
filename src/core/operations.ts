import type {
  SortableChange,
  SortableId,
  SortableLocation,
} from './model.js';

function assertIndex(
  index: number,
  length: number,
  allowEnd: boolean,
): void {
  const maximum = allowEnd ? length : length - 1;

  if (!Number.isInteger(index) || index < 0 || index > maximum) {
    throw new RangeError('sortable index is out of range');
  }
}

export function reorder<T>(
  items: readonly T[],
  fromIndex: number,
  toIndex: number,
): readonly T[] {
  assertIndex(fromIndex, items.length, false);
  assertIndex(toIndex, items.length, false);

  if (fromIndex === toIndex) {
    return items;
  }

  const next = [...items];
  const [item] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, item as T);

  return next;
}

export function transfer<T>(
  sourceItems: readonly T[],
  destinationItems: readonly T[],
  sourceIndex: number,
  destinationIndex: number,
): {
  sourceItems: readonly T[];
  destinationItems: readonly T[];
} {
  assertIndex(sourceIndex, sourceItems.length, false);
  assertIndex(destinationIndex, destinationItems.length, true);

  const source = [...sourceItems];
  const [item] = source.splice(sourceIndex, 1);
  const destination = [...destinationItems];
  destination.splice(destinationIndex, 0, item as T);

  return {
    sourceItems: source,
    destinationItems: destination,
  };
}

export function buildReorderChange(
  itemIds: readonly SortableId[],
  source: SortableLocation,
  destination: SortableLocation,
): SortableChange | null {
  const nextItemIds = reorder(itemIds, source.index, destination.index);

  if (nextItemIds === itemIds) {
    return null;
  }

  return {
    operation: 'reorder',
    itemId: itemIds[source.index] as SortableId,
    source,
    destination,
    orders: [{ areaId: source.areaId, itemIds: nextItemIds }],
  };
}

export function buildTransferChange(
  sourceItemIds: readonly SortableId[],
  destinationItemIds: readonly SortableId[],
  source: SortableLocation,
  destination: SortableLocation,
): SortableChange {
  const next = transfer(
    sourceItemIds,
    destinationItemIds,
    source.index,
    destination.index,
  );

  return {
    operation: 'transfer',
    itemId: sourceItemIds[source.index] as SortableId,
    source,
    destination,
    orders: [
      { areaId: source.areaId, itemIds: next.sourceItems },
      { areaId: destination.areaId, itemIds: next.destinationItems },
    ],
  };
}

export function buildCopyChange(
  sourceItemIds: readonly SortableId[],
  destinationItemIds: readonly SortableId[],
  source: SortableLocation,
  destination: SortableLocation,
  itemId: SortableId,
): SortableChange {
  assertIndex(source.index, sourceItemIds.length, false);
  assertIndex(destination.index, destinationItemIds.length, true);

  const sourceItemId = sourceItemIds[source.index] as SortableId;
  const nextDestinationItemIds = [...destinationItemIds];
  nextDestinationItemIds.splice(destination.index, 0, itemId);

  return {
    operation: 'copy',
    sourceItemId,
    itemId,
    source,
    destination,
    orders: [
      { areaId: source.areaId, itemIds: sourceItemIds },
      { areaId: destination.areaId, itemIds: nextDestinationItemIds },
    ],
  };
}
