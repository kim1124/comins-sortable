import type { DragContext, SortableDirection, SortableId } from './model.js';
import type { AreaGeometry, ItemGeometry, Point } from './geometry.js';

const MIDPOINT_TIE_TOLERANCE = 1;

export function insertionIndex(input: {
  pointer: Point;
  direction: Exclude<SortableDirection, 'auto'>;
  items: readonly ItemGeometry[];
  midpointTie?: 'before' | 'after';
}): number {
  const coordinate = input.direction === 'vertical'
    ? input.pointer.y
    : input.pointer.x;
  let low = 0;
  let high = input.items.length;

  while (low < high) {
    const middle = Math.floor((low + high) / 2);
    const item = input.items[middle] as ItemGeometry;
    const midpoint = input.direction === 'vertical'
      ? item.rect.top + item.rect.height / 2
      : item.rect.left + item.rect.width / 2;
    const roundedMidpoint = input.midpointTie !== undefined
      && Math.abs(coordinate - midpoint) <= MIDPOINT_TIE_TOLERANCE;
    const before = roundedMidpoint
      ? input.midpointTie === 'before'
      : coordinate < midpoint;

    if (before) {
      high = middle;
    } else {
      low = middle + 1;
    }
  }

  return low;
}

export function insertionIndexExcludingSource(input: {
  pointer: Point;
  direction: Exclude<SortableDirection, 'auto'>;
  sourceId: SortableId;
  items: readonly ItemGeometry[];
}): number {
  return insertionIndex({
    pointer: input.pointer,
    direction: input.direction,
    items: input.items.filter((item) => item.id !== input.sourceId),
  });
}

export function gridInsertionIndex(input: {
  pointer: Point;
  items: readonly ItemGeometry[];
}): number {
  if (input.items.length === 0) return 0;
  let closestIndex = 0;
  let closestDistance = Number.POSITIVE_INFINITY;
  for (const [index, item] of input.items.entries()) {
    const centerX = item.rect.left + item.rect.width / 2;
    const centerY = item.rect.top + item.rect.height / 2;
    const distance = Math.hypot(input.pointer.x - centerX, input.pointer.y - centerY);
    if (distance < closestDistance) {
      closestDistance = distance;
      closestIndex = index;
    }
  }
  const closest = input.items[closestIndex] as ItemGeometry;
  const centerX = closest.rect.left + closest.rect.width / 2;
  const centerY = closest.rect.top + closest.rect.height / 2;
  const withinRow = input.pointer.y >= closest.rect.top && input.pointer.y <= closest.rect.bottom;
  const after = withinRow ? input.pointer.x >= centerX : input.pointer.y >= centerY;
  return closestIndex + (after ? 1 : 0);
}

export function thresholdInsertionIndex(input: {
  pointer: Point;
  direction: 'vertical' | 'horizontal';
  items: readonly ItemGeometry[];
  movement: number;
  swapThreshold: number;
  invertSwap?: boolean;
  previousIndex: number;
}): number {
  if (input.items.length === 0) return 0;
  const coordinate = input.direction === 'vertical' ? input.pointer.y : input.pointer.x;
  const targetIndex = input.items.findIndex((item) => {
    const start = input.direction === 'vertical' ? item.rect.top : item.rect.left;
    const end = input.direction === 'vertical' ? item.rect.bottom : item.rect.right;
    return coordinate >= start && coordinate <= end;
  });
  if (targetIndex < 0) {
    return insertionIndex({
      pointer: input.pointer,
      direction: input.direction,
      items: input.items,
      midpointTie: input.movement < 0 ? 'before' : 'after',
    });
  }
  const target = input.items[targetIndex] as ItemGeometry;
  const start = input.direction === 'vertical' ? target.rect.top : target.rect.left;
  const size = input.direction === 'vertical' ? target.rect.height : target.rect.width;
  const threshold = Math.min(1, Math.max(0, input.swapThreshold));
  const innerStart = start + size * (1 - threshold) / 2;
  const innerEnd = start + size - size * (1 - threshold) / 2;
  const forward = input.movement >= 0;
  const active = input.invertSwap === true
    ? (forward ? coordinate >= innerEnd : coordinate <= innerStart)
    : (forward ? coordinate >= innerStart : coordinate <= innerEnd);
  if (!active) return input.previousIndex;
  return targetIndex + (forward ? 1 : 0);
}

export function findAreaAtPoint(input: {
  point: Point;
  directHits: readonly AreaGeometry[];
  emptyAreas: readonly AreaGeometry[];
  emptyInsertThreshold: number;
  sourceGroup: string;
  context: DragContext;
  acceptsGroup?: (group: string) => boolean;
}): AreaGeometry | undefined {
  let direct: AreaGeometry | undefined;
  for (const area of input.directHits) {
    if (accepts(area, input) && (direct === undefined || area.depth > direct.depth)) {
      direct = area;
    }
  }
  if (direct !== undefined) {
    return direct;
  }

  return input.emptyAreas.find((area) => (
    accepts(area, input)
    && containsEmptyArea(
      area,
      input.point,
      area.emptyInsertThreshold ?? input.emptyInsertThreshold,
    )
  ));
}

function accepts(
  area: AreaGeometry,
  input: Pick<
    Parameters<typeof findAreaAtPoint>[0],
    'sourceGroup' | 'context' | 'acceptsGroup'
  >,
): boolean {
  const acceptsGroup = input.acceptsGroup?.(area.group)
    ?? area.group === input.sourceGroup;
  return !area.disabled && acceptsGroup && area.accept(input.context);
}

function containsEmptyArea(
  area: AreaGeometry,
  point: Point,
  threshold: number,
): boolean {
  const { rect } = area;
  if (rect.width === 0 && rect.height === 0) {
    return false;
  }

  if (area.direction === 'vertical') {
    const top = rect.height === 0 ? rect.top - threshold : rect.top;
    const bottom = rect.height === 0 ? rect.bottom + threshold : rect.bottom;
    return point.x >= rect.left && point.x <= rect.right && point.y >= top && point.y <= bottom;
  }

  if (area.direction === 'grid') {
    return point.x >= rect.left && point.x <= rect.right
      && point.y >= rect.top && point.y <= rect.bottom;
  }

  const left = rect.width === 0 ? rect.left - threshold : rect.left;
  const right = rect.width === 0 ? rect.right + threshold : rect.right;
  return point.x >= left && point.x <= right && point.y >= rect.top && point.y <= rect.bottom;
}
