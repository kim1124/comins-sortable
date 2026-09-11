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

export function buildMultiReorderChange(
  itemIds: readonly SortableId[],
  selectedItemIds: readonly SortableId[],
  source: SortableLocation,
  destination: SortableLocation,
): SortableChange | null {
  assertIndex(source.index, itemIds.length, false);
  const selected = orderedSelection(itemIds, selectedItemIds);
  if (!selected.includes(itemIds[source.index] as SortableId)) {
    throw new RangeError('sortable selection must include the source item');
  }
  const remaining = itemIds.filter((itemId) => !selected.includes(itemId));
  assertIndex(destination.index, remaining.length, true);
  const next = [...remaining];
  next.splice(destination.index, 0, ...selected);
  if (sameOrder(next, itemIds)) return null;

  return {
    operation: 'reorder',
    itemId: itemIds[source.index] as SortableId,
    itemIds: selected,
    source,
    destination,
    orders: [{ areaId: source.areaId, itemIds: next }],
  };
}

export function buildMultiTransferChange(
  sourceItemIds: readonly SortableId[],
  destinationItemIds: readonly SortableId[],
  selectedItemIds: readonly SortableId[],
  source: SortableLocation,
  destination: SortableLocation,
): SortableChange {
  assertIndex(source.index, sourceItemIds.length, false);
  assertIndex(destination.index, destinationItemIds.length, true);
  const selected = orderedSelection(sourceItemIds, selectedItemIds);
  if (!selected.includes(sourceItemIds[source.index] as SortableId)) {
    throw new RangeError('sortable selection must include the source item');
  }
  const nextSource = sourceItemIds.filter((itemId) => !selected.includes(itemId));
  const nextDestination = [...destinationItemIds];
  nextDestination.splice(destination.index, 0, ...selected);

  return {
    operation: 'transfer',
    itemId: sourceItemIds[source.index] as SortableId,
    itemIds: selected,
    source,
    destination,
    orders: [
      { areaId: source.areaId, itemIds: nextSource },
      { areaId: destination.areaId, itemIds: nextDestination },
    ],
  };
}

export function buildSwapChange(
  itemIds: readonly SortableId[],
  source: SortableLocation,
  destination: SortableLocation,
): SortableChange | null {
  assertIndex(source.index, itemIds.length, false);
  assertIndex(destination.index, itemIds.length, false);
  if (source.areaId !== destination.areaId || source.index === destination.index) return null;
  const next = [...itemIds];
  const sourceItemId = itemIds[source.index] as SortableId;
  const targetItemId = itemIds[destination.index] as SortableId;
  next[source.index] = targetItemId;
  next[destination.index] = sourceItemId;
  return {
    operation: 'swap',
    itemId: sourceItemId,
    swapItemId: targetItemId,
    source,
    destination,
    orders: [{ areaId: source.areaId, itemIds: next }],
  };
}

function orderedSelection(
  itemIds: readonly SortableId[],
  selectedItemIds: readonly SortableId[],
): SortableId[] {
  const selected = new Set(selectedItemIds);
  const ordered = itemIds.filter((itemId) => selected.has(itemId));
  if (ordered.length === 0 || ordered.length !== selected.size) {
    throw new RangeError('sortable selection contains an unknown item');
  }
  return ordered;
}

function sameOrder(left: readonly SortableId[], right: readonly SortableId[]): boolean {
  return left.length === right.length && left.every((itemId, index) => itemId === right[index]);
}
