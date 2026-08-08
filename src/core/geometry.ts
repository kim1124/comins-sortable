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

export interface GeometryTarget {
  key: string;
  element: Element;
}

export interface AreaGeometry {
  areaId: string;
  group: string;
  direction: Exclude<SortableDirection, 'auto'>;
  disabled: boolean;
  accept(context: DragContext): boolean;
  depth: number;
  rect: RectSnapshot;
}

interface GeometryCacheEntry {
  rect: RectSnapshot;
  dirty: boolean;
}

export class GeometryCache {
  private readonly entries = new Map<string, GeometryCacheEntry>();

  refreshAtActivation(targets: readonly GeometryTarget[]): void {
    this.refresh(targets);
  }

  refreshAtAreaEntry(target: GeometryTarget): void {
    this.refresh([target]);
  }

  refreshDirty(targets: readonly GeometryTarget[]): void {
    for (const target of targets) {
      if (this.entries.get(target.key)?.dirty === true) {
        this.refresh([target]);
      }
    }
  }

  snapshot(key: string): RectSnapshot | undefined {
    return this.entries.get(key)?.rect;
  }

  isDirty(key: string): boolean {
    return this.entries.get(key)?.dirty ?? false;
  }

  invalidateForScroll(keys: readonly string[]): void {
    this.markDirty(keys);
  }

  invalidateForResize(keys: readonly string[]): void {
    this.markDirty(keys);
  }

  invalidateForFrameworkUpdate(keys: readonly string[]): void {
    this.markDirty(keys);
  }

  invalidateForPlaceholderMove(keys: readonly string[]): void {
    this.markDirty(keys);
  }

  clear(): void {
    this.entries.clear();
  }

  private refresh(targets: readonly GeometryTarget[]): void {
    for (const target of targets) {
      this.entries.set(target.key, {
        rect: snapshotRect(target.element),
        dirty: false,
      });
    }
  }

  private markDirty(keys: readonly string[]): void {
    for (const key of keys) {
      const entry = this.entries.get(key);
      if (entry !== undefined) {
        entry.dirty = true;
      }
    }
  }
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
