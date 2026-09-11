import { SortableError } from './errors.js';
import type {
  FrameworkSortableChange,
  SortableId,
  SortableParentLocation,
} from './model.js';

export interface SortableTreeOptions<T> {
  rootAreaId: string;
  getNodeId(node: T): SortableId;
  getChildren(node: T): readonly T[];
  withChildren(node: T, children: readonly T[]): T;
  getChildrenAreaId(node: T): string;
}

export interface SortableTreeArea<T> {
  areaId: string;
  items: readonly T[];
  parent?: SortableParentLocation;
}

export interface SortableTree<T> {
  getAreas(nodes: readonly T[]): readonly SortableTreeArea<T>[];
  updateArea(
    nodes: readonly T[],
    areaId: string,
    items: readonly T[],
  ): readonly T[];
  applyChange(
    nodes: readonly T[],
    change: FrameworkSortableChange<T>,
  ): readonly T[];
}

/**
 * Creates a framework-neutral immutable model that maps nested data to sortable
 * areas and folds controlled adapter updates back into one tree value.
 */
export function createSortableTree<T>(
  options: SortableTreeOptions<T>,
): SortableTree<T> {
  if (typeof options.rootAreaId !== 'string' || options.rootAreaId.length === 0) {
    throw new SortableError('INVALID_OPTION');
  }

  const inspect = (nodes: readonly T[]): readonly SortableTreeArea<T>[] => {
    requireItems(nodes);
    const areas: SortableTreeArea<T>[] = [];
    const areaIds = new Set<string>();
    const nodeIds = new Set<SortableId>();

    const visit = (
      items: readonly T[],
      areaId: string,
      parent?: SortableParentLocation,
    ): void => {
      requireAreaId(areaId);
      if (areaIds.has(areaId)) {
        throw new SortableError('DUPLICATE_AREA_ID');
      }
      areaIds.add(areaId);
      areas.push({ areaId, items, ...(parent === undefined ? {} : { parent }) });

      for (const item of items) {
        const itemId = options.getNodeId(item);
        requireNodeId(itemId);
        if (nodeIds.has(itemId)) {
          throw new SortableError('DUPLICATE_ITEM_ID');
        }
        nodeIds.add(itemId);

        const children = options.getChildren(item);
        requireItems(children);
        const childrenAreaId = options.getChildrenAreaId(item);
        visit(children, childrenAreaId, { areaId, itemId });
      }
    };

    visit(nodes, options.rootAreaId);
    return areas;
  };

  const applyUpdates = (
    nodes: readonly T[],
    updates: readonly { areaId: string; items: readonly T[] }[],
  ): readonly T[] => {
    const currentAreas = inspect(nodes);
    const knownAreaIds = new Set(currentAreas.map((area) => area.areaId));
    const currentChildrenByNodeId = new Map<SortableId, readonly T[]>();
    for (const area of currentAreas) {
      for (const item of area.items) {
        currentChildrenByNodeId.set(
          options.getNodeId(item),
          options.getChildren(item),
        );
      }
    }
    const updatesByAreaId = new Map<string, readonly T[]>();
    for (const update of updates) {
      requireAreaId(update.areaId);
      requireItems(update.items);
      if (!knownAreaIds.has(update.areaId) || updatesByAreaId.has(update.areaId)) {
        throw new SortableError('INVALID_OPTION');
      }
      updatesByAreaId.set(update.areaId, update.items);
    }

    const rebuild = (items: readonly T[], areaId: string): readonly T[] => {
      const candidate = updatesByAreaId.get(areaId) ?? items;
      let childrenChanged = false;
      const next = candidate.map((item) => {
        const itemChildren = options.getChildren(item);
        requireItems(itemChildren);
        const children = currentChildrenByNodeId.get(options.getNodeId(item))
          ?? itemChildren;
        requireItems(children);
        const childrenAreaId = options.getChildrenAreaId(item);
        requireAreaId(childrenAreaId);
        const nextChildren = rebuild(children, childrenAreaId);
        if (nextChildren === itemChildren) {
          return item;
        }
        childrenChanged = true;
        return options.withChildren(item, nextChildren);
      });
      return childrenChanged ? next : candidate;
    };

    const result = rebuild(nodes, options.rootAreaId);
    inspect(result);
    return result;
  };

  return {
    getAreas: inspect,
    updateArea(nodes, areaId, items) {
      return applyUpdates(nodes, [{ areaId, items }]);
    },
    applyChange(nodes, change) {
      return applyUpdates(nodes, change.updates);
    },
  };
}

function requireAreaId(areaId: unknown): asserts areaId is string {
  if (typeof areaId !== 'string' || areaId.length === 0) {
    throw new SortableError('INVALID_OPTION');
  }
}

function requireNodeId(itemId: unknown): asserts itemId is SortableId {
  if (typeof itemId !== 'string' && typeof itemId !== 'number') {
    throw new SortableError('MISSING_ITEM_ID');
  }
}

function requireItems<T>(items: readonly T[]): void {
  if (!Array.isArray(items)) {
    throw new SortableError('INVALID_OPTION');
  }
}
