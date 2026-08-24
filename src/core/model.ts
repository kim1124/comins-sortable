export type SortableId = string | number;
export type ItemKey<T> = keyof T | ((item: T) => SortableId);
export type SortableDirection = 'vertical' | 'horizontal' | 'auto';
export type SortableTransferMode = 'move' | 'copy';

export interface SortableLocation {
  areaId: string;
  index: number;
}

export interface SortableOrder {
  areaId: string;
  itemIds: readonly SortableId[];
}

interface SortableChangeBase {
  itemId: SortableId;
  source: SortableLocation;
  destination: SortableLocation;
  orders: readonly SortableOrder[];
}

export interface SortableReorderChange extends SortableChangeBase {
  operation: 'reorder';
}

export interface SortableTransferChange extends SortableChangeBase {
  operation: 'transfer';
}

export type SortableMoveChange = SortableReorderChange | SortableTransferChange;

export interface SortableCopyChange extends SortableChangeBase {
  operation: 'copy';
  sourceItemId: SortableId;
}

export type SortableChange = SortableMoveChange | SortableCopyChange;

export interface SortableAreaUpdate<T> {
  areaId: string;
  items: readonly T[];
}

export type FrameworkSortableChange<T> = SortableChange & {
  updates: readonly SortableAreaUpdate<T>[];
};

export interface PointerSnapshot {
  type: 'mouse' | 'touch' | 'pen';
  clientX: number;
  clientY: number;
  deltaX: number;
  deltaY: number;
  altKey: boolean;
  ctrlKey: boolean;
  metaKey: boolean;
  shiftKey: boolean;
}

export interface DragContext {
  itemId: SortableId;
  source: SortableLocation;
  destination: SortableLocation | null;
  pointer: PointerSnapshot;
}

export interface CopyItemContext extends DragContext {
  destination: SortableLocation;
}

export type CopyItem<T> = (item: T, context: CopyItemContext) => T;

export interface SortableGroupOptions {
  name: string;
  pull?: false | SortableTransferMode | (
    (context: DragContext) => false | SortableTransferMode
  );
  put?: boolean | readonly string[] | ((context: DragContext) => boolean);
}

export type SortableGroup = string | SortableGroupOptions;

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
  group?: SortableGroup;
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
  prepareCopy?: (context: CopyItemContext) => SortableId;
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
