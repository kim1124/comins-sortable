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

export interface SortableAreaOptions {
  areaId: string;
  group?: string;
  item: string;
  getItemId?: (element: Element) => SortableId;
  direction?: SortableDirection;
  disabled?: boolean;
  handle?: string;
  ignore?: string;
  activationDistance?: number;
  emptyInsertThreshold?: number;
  autoScroll?: boolean;
  accept?: (context: DragContext) => boolean;
}

export type SortableAreaPatch = Partial<Omit<SortableAreaOptions, 'areaId'>>;

export interface SortableScopeOptions {
  onBeforeDragStart?: (context: DragContext) => boolean | void;
  onDragStart?: (context: DragContext) => void;
  onDrag?: (context: DragContext) => void;
  onInsertDragArea?: (event: InsertDragAreaEvent) => void;
  onChange?: (change: SortableChange) => void;
  onAfterDrag?: (result: AfterDragResult) => void;
  onError?: (error: unknown) => void;
}

export interface SortableScope {
  registerArea(element: Element, options: SortableAreaOptions): () => void;
  updateArea(areaId: string, patch: SortableAreaPatch): void;
  cancel(): void;
  destroy(): void;
}
