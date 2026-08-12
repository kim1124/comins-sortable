import {
  createSortableScope,
  reorder,
  SortableError,
  transfer,
} from '../../src/core.js';
import type {
  AfterDragResult,
  DragContext,
  FrameworkSortableChange,
  InsertDragAreaEvent,
  ItemKey,
  PointerSnapshot,
  SortableAreaUpdate,
  SortableAreaOptions,
  SortableAreaPatch,
  SortableChange,
  SortableDirection,
  SortableId,
  SortableLocation,
  SortableOrder,
  SortableScope,
  SortableScopeOptions,
} from '../../src/core.js';

interface Item {
  id: number;
  label: string;
}

const id: SortableId = 1;
const key: ItemKey<Item> = 'id';
const direction: SortableDirection = 'vertical';
const location: SortableLocation = { areaId: 'source', index: 0 };
const order: SortableOrder = { areaId: 'source', itemIds: [id] };
const pointer: PointerSnapshot = {
  type: 'mouse',
  clientX: 10,
  clientY: 20,
  deltaX: 1,
  deltaY: 2,
};
const context: DragContext = {
  itemId: id,
  source: location,
  destination: location,
  pointer,
};
const insert: InsertDragAreaEvent = {
  ...context,
  previousDestination: null,
  destination: location,
};
const change: SortableChange = {
  operation: 'reorder',
  itemId: id,
  source: location,
  destination: location,
  orders: [order],
};
const update: SortableAreaUpdate<Item> = {
  areaId: 'source',
  items: [{ id: 1, label: 'one' }],
};
const frameworkChange: FrameworkSortableChange<Item> = {
  ...change,
  updates: [update],
};
const result: AfterDragResult = {
  status: 'dropped',
  reason: 'drop',
  change,
};
const error = new SortableError('INVALID_OPTION');
const items: readonly Item[] = [{ id: 1, label: 'one' }];
const reorderedItems: readonly Item[] = reorder(items, 0, 0);
const transferredItems: {
  sourceItems: readonly Item[];
  destinationItems: readonly Item[];
} = transfer(items, [], 0, 0);
const areaOptions: SortableAreaOptions = {
  areaId: 'todo',
  item: '[data-sortable-item]',
  getItemId: (element) => element.getAttribute('data-id') ?? 0,
};
const areaPatch: SortableAreaPatch = { disabled: true };
const scopeOptions: SortableScopeOptions = {
  onChange: (sortableChange) => void sortableChange,
};
const scope: SortableScope = createSortableScope(scopeOptions);

void [
  key,
  direction,
  insert,
  frameworkChange,
  result,
  error,
  reorderedItems,
  transferredItems,
  areaOptions,
  areaPatch,
  scope,
];
