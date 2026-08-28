import { createSortableTree } from '../../../src/core.js';
import type {
  SortableChange,
  SortablePlaceholderOptions,
  SortableTreeArea,
} from '../../../src/core.js';
import type { PlaygroundExampleId } from '../app/navigation.js';
import type {
  PlaygroundModel,
  PlaygroundOperation,
} from '../playground/types.js';

export interface DemoItem {
  id: string;
  title: string;
  detail: string;
  tone: 'mint' | 'blue' | 'amber' | 'violet';
}

export interface DemoState {
  todo: DemoItem[];
  done: DemoItem[];
  child: DemoItem[];
}

export interface DemoTreeNode extends DemoItem {
  children: readonly DemoTreeNode[];
}

const demoTree = createSortableTree<DemoTreeNode>({
  rootAreaId: 'todo',
  getNodeId: (item) => item.id,
  getChildren: (item) => item.children,
  withChildren: (item, children) => ({ ...item, children }),
  getChildrenAreaId: (item) => item.id === 'research' ? 'child' : `tree-children-${item.id}`,
});

const catalog: Readonly<Record<string, DemoItem>> = {
  research: { id: 'research', title: 'Research', detail: 'Product discovery', tone: 'mint' },
  design: { id: 'design', title: 'Design', detail: 'Interaction system', tone: 'violet' },
  build: { id: 'build', title: 'Build', detail: 'Adapter integration', tone: 'blue' },
  review: { id: 'review', title: 'Review', detail: 'Quality gate', tone: 'amber' },
  release: { id: 'release', title: 'Release', detail: 'Package preview', tone: 'mint' },
  document: { id: 'document', title: 'Document', detail: 'Usage guide', tone: 'violet' },
  observe: { id: 'observe', title: 'Observe', detail: 'Runtime events', tone: 'blue' },
  measure: { id: 'measure', title: 'Measure', detail: 'Interaction metrics', tone: 'amber' },
  improve: { id: 'improve', title: 'Improve', detail: 'Feedback loop', tone: 'mint' },
};

const items = (...ids: string[]): DemoItem[] => ids.map((id) => ({ ...catalog[id]! }));

export function createDemoState(exampleId: PlaygroundExampleId): DemoState {
  if (
    exampleId === 'simple'
    || exampleId === 'handle'
    || exampleId === 'custom-placeholder'
    || exampleId === 'skeleton-placeholder'
  ) {
    return { todo: items('research', 'design', 'build', 'review'), done: [], child: [] };
  }
  if (isNestedExample(exampleId)) {
    return { todo: items('research', 'design', 'build'), done: [], child: items('review', 'release') };
  }
  if (exampleId === 'auto-scroll') {
    return {
      todo: items(
        'research', 'design', 'build', 'review', 'release',
        'document', 'observe', 'measure', 'improve',
      ),
      done: [],
      child: [],
    };
  }
  if (exampleId === 'empty') {
    return { todo: items('research', 'design'), done: [], child: [] };
  }
  if (exampleId === 'accept') {
    return { todo: items('research', 'design', 'build'), done: items('review'), child: [] };
  }
  return {
    todo: items('research', 'design', 'build'),
    done: items('review'),
    child: [],
  };
}

export function copyDemoItem(
  source: DemoItem,
  exampleId: PlaygroundExampleId,
  sequence: number,
): DemoItem {
  const copy = {
    ...source,
    id: `${source.id}-copy-${sequence}`,
  };
  return exampleId === 'custom-clone'
    ? { ...copy, title: `${source.title} Copy`, detail: 'Customized clone' }
    : copy;
}

export function applyDemoChange(state: DemoState, change: SortableChange): DemoState {
  const itemById = new Map(
    [...state.todo, ...state.done, ...state.child].map((item) => [item.id, item] as const),
  );
  const next: DemoState = {
    todo: [...state.todo],
    done: [...state.done],
    child: [...state.child],
  };
  if (change.operation === 'copy') {
    const source = itemById.get(String(change.sourceItemId));
    if (source === undefined) throw new Error('Unknown demo source item');
    itemById.set(String(change.itemId), {
      ...source,
      id: String(change.itemId),
    });
  }

  for (const order of change.orders) {
    if (order.areaId !== 'todo' && order.areaId !== 'done' && order.areaId !== 'child') continue;
    next[order.areaId] = order.itemIds.map((itemId) => {
      const item = itemById.get(String(itemId));
      if (item === undefined) throw new Error('Unknown demo item');
      return item;
    });
  }
  return next;
}

export function demoModel(state: DemoState, includeDone = true): PlaygroundModel {
  const model: Record<string, readonly string[]> = {
    todo: state.todo.map((item) => item.id),
  };
  if (includeDone) model.done = state.done.map((item) => item.id);
  if (state.child.length > 0) model.child = state.child.map((item) => item.id);
  return model;
}

export function playgroundOperation(change: SortableChange): PlaygroundOperation {
  return {
    operation: change.operation,
    itemId: String(change.itemId),
    source: { ...change.source },
    destination: { ...change.destination },
  };
}

export function hasSecondArea(exampleId: PlaygroundExampleId): boolean {
  return exampleId === 'two-lists'
    || exampleId === 'clone'
    || exampleId === 'custom-clone'
    || exampleId === 'modifier-copy'
    || exampleId === 'two-list-slots'
    || exampleId === 'empty'
    || exampleId === 'accept';
}

export function isNestedExample(exampleId: PlaygroundExampleId): boolean {
  return exampleId === 'nested'
    || exampleId === 'nested-controlled'
    || exampleId === 'functional-third-party'
    || exampleId === 'tree';
}

export function placeholderForExample(
  exampleId: PlaygroundExampleId,
): SortablePlaceholderOptions | undefined {
  if (exampleId === 'custom-placeholder') {
    return { className: 'cs-demo-placeholder--custom' };
  }
  if (exampleId === 'skeleton-placeholder') {
    return { className: 'cs-demo-placeholder--skeleton', preset: 'skeleton' };
  }
  return undefined;
}

export function demoTreeArea(
  state: DemoState,
  areaId: 'todo' | 'child',
): SortableTreeArea<DemoTreeNode> {
  const area = demoTree.getAreas(toTree(state)).find((candidate) => candidate.areaId === areaId);
  if (area === undefined) throw new Error(`Unknown demo tree area: ${areaId}`);
  return area;
}

export function updateDemoTreeArea(
  state: DemoState,
  areaId: 'todo' | 'child',
  items: readonly DemoItem[],
): DemoState {
  const nextTree = demoTree.updateArea(
    toTree(state),
    areaId,
    items as readonly DemoTreeNode[],
  );
  const research = findTreeNode(nextTree, 'research');
  return {
    ...state,
    todo: nextTree.map(toDemoItem),
    child: (research?.children ?? []).map(toDemoItem),
  };
}

function toTree(state: DemoState): readonly DemoTreeNode[] {
  return state.todo.map((item) => ({
    ...item,
    children: item.id === 'research'
      ? state.child.map((child) => ({ ...child, children: [] }))
      : [],
  }));
}

function toDemoItem({ children: _children, ...item }: DemoTreeNode): DemoItem {
  return item;
}

function findTreeNode(
  nodes: readonly DemoTreeNode[],
  itemId: string,
): DemoTreeNode | undefined {
  for (const node of nodes) {
    if (node.id === itemId) return node;
    const child = findTreeNode(node.children, itemId);
    if (child !== undefined) return child;
  }
  return undefined;
}

export function isAnimationExample(exampleId: PlaygroundExampleId): boolean {
  return exampleId === 'transition' || exampleId === 'transitions';
}

export function isCopyExample(exampleId: PlaygroundExampleId): boolean {
  return exampleId === 'clone'
    || exampleId === 'custom-clone'
    || exampleId === 'modifier-copy';
}
