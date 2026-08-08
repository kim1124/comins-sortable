import type { DragContext, SortableDirection, SortableId } from './model.js';
import type { AreaGeometry, ItemGeometry, Point } from './geometry.js';

export function insertionIndex(input: {
  pointer: Point;
  direction: Exclude<SortableDirection, 'auto'>;
  items: readonly ItemGeometry[];
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

    if (coordinate < midpoint) {
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

export function findAreaAtPoint(input: {
  point: Point;
  directHits: readonly AreaGeometry[];
  emptyAreas: readonly AreaGeometry[];
  emptyInsertThreshold: number;
  sourceGroup: string;
  context: DragContext;
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
    && containsEmptyArea(area, input.point, input.emptyInsertThreshold)
  ));
}

function accepts(
  area: AreaGeometry,
  input: Pick<Parameters<typeof findAreaAtPoint>[0], 'sourceGroup' | 'context'>,
): boolean {
  return !area.disabled && area.group === input.sourceGroup && area.accept(input.context);
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

  const left = rect.width === 0 ? rect.left - threshold : rect.left;
  const right = rect.width === 0 ? rect.right + threshold : rect.right;
  return point.x >= left && point.x <= right && point.y >= rect.top && point.y <= rect.bottom;
}
