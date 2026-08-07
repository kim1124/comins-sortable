export type SortableId = string | number;
export type ItemKey<T> = keyof T | ((item: T) => SortableId);
export type SortableDirection = 'vertical' | 'horizontal' | 'auto';

export interface SortableLocation {
  areaId: string;
  index: number;
}

export interface SortableOrder {
  areaId: string;
  itemIds: readonly SortableId[];
}

export interface SortableChange {
  operation: 'reorder' | 'transfer';
  itemId: SortableId;
  source: SortableLocation;
  destination: SortableLocation;
  orders: readonly SortableOrder[];
}

export interface SortableAreaUpdate<T> {
  areaId: string;
  items: readonly T[];
}

export interface FrameworkSortableChange<T> extends SortableChange {
  updates: readonly SortableAreaUpdate<T>[];
}

export interface PointerSnapshot {
  type: 'mouse' | 'touch' | 'pen';
  clientX: number;
  clientY: number;
  deltaX: number;
  deltaY: number;
}

export interface DragContext {
  itemId: SortableId;
  source: SortableLocation;
  destination: SortableLocation | null;
  pointer: PointerSnapshot;
}

export interface InsertDragAreaEvent extends DragContext {
  previousDestination: SortableLocation | null;
  destination: SortableLocation;
}

export type AfterDragReason =
  | 'drop'
  | 'outside'
  | 'pointer-cancel'
  | 'escape'
  | 'blur'
  | 'disabled'
  | 'not-accepted'
  | 'unmounted'
  | 'state-not-committed'
  | 'destroyed'
  | 'error';

export interface AfterDragResult {
  status: 'dropped' | 'cancelled' | 'rejected';
  reason: AfterDragReason;
  change?: SortableChange;
}
