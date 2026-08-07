import { SortableError } from '../../src/core.js';
import type {
  AfterDragResult,
  DragContext,
  FrameworkSortableChange,
  InsertDragAreaEvent,
  ItemKey,
  PointerSnapshot,
  SortableAreaUpdate,
  SortableChange,
  SortableDirection,
  SortableId,
  SortableLocation,
  SortableOrder,
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

void [key, direction, insert, frameworkChange, result, error];
