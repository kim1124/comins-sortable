import {
  createSortableScope,
  reorder,
  SortableError,
  transfer,
} from '../../src/core.js';
import type {
  AfterDragResult,
  CopyItemContext,
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
  SortableGroup,
  SortableGroupOptions,
  SortableId,
  SortableLocation,
  SortableOrder,
  SortableScope,
  SortableScopeOptions,
  SortableTransferMode,
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
  altKey: false,
  ctrlKey: false,
  metaKey: false,
  shiftKey: false,
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
  group: {
    name: 'tasks',
    pull: (drag) => drag.pointer.altKey ? 'copy' : 'move',
    put: ['tasks'],
  },
  item: '[data-sortable-item]',
  getItemId: (element) => element.getAttribute('data-id') ?? 0,
  prepareCopy: (copyContext) => `${String(copyContext.itemId)}-copy`,
};
const nestedAnimatedArea: SortableAreaOptions = {
  areaId: 'child',
  item: '[data-sortable-id]',
  animation: { duration: 180, easing: 'ease-out' },
  parent: { areaId: 'todo', itemId: 'parent' },
};
void nestedAnimatedArea;
const transferMode: SortableTransferMode = 'copy';
const groupOptions: SortableGroupOptions = areaOptions.group as SortableGroupOptions;
const group: SortableGroup = groupOptions;
const copyContext: CopyItemContext = { ...context, destination: location };
const areaPatch: SortableAreaPatch = { disabled: true };
const scopeOptions: SortableScopeOptions = {
  onChange: (sortableChange) => void sortableChange,
};
const scope: SortableScope = createSortableScope(scopeOptions);
scope.refreshArea?.('todo');

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
  transferMode,
  group,
  copyContext,
  areaPatch,
  scope,
];
