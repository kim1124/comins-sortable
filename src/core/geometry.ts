import type { DragContext, SortableDirection, SortableId } from './model.js';

export interface Point {
  x: number;
  y: number;
}

export interface RectSnapshot {
  left: number;
  top: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
}

export interface ItemGeometry {
  id: SortableId;
  rect: RectSnapshot;
}

export interface AreaGeometry {
  areaId: string;
  group: string;
  direction: Exclude<SortableDirection, 'auto'>;
  disabled: boolean;
  accept(context: DragContext): boolean;
  rect: RectSnapshot;
}

export function snapshotRect(element: Element): RectSnapshot {
  const rect = element.getBoundingClientRect();

  return {
    left: rect.left,
    top: rect.top,
    right: rect.right,
    bottom: rect.bottom,
    width: rect.width,
    height: rect.height,
  };
}

export function resolveDirection(
  direction: SortableDirection,
  items: readonly ItemGeometry[],
): Exclude<SortableDirection, 'auto'> {
  if (direction !== 'auto') {
    return direction;
  }

  const first = items[0];
  const second = items[1];

  if (first === undefined || second === undefined) {
    return 'vertical';
  }

  const firstCenterX = first.rect.left + first.rect.width / 2;
  const firstCenterY = first.rect.top + first.rect.height / 2;
  const secondCenterX = second.rect.left + second.rect.width / 2;
  const secondCenterY = second.rect.top + second.rect.height / 2;

  return Math.abs(secondCenterX - firstCenterX) > Math.abs(secondCenterY - firstCenterY)
    ? 'horizontal'
    : 'vertical';
}
