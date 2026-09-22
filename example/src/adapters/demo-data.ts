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
  tree?: readonly DemoTreeNode[];
}

export interface DemoTreeNode extends DemoItem {
  acceptsChildren: boolean;
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
  if (exampleId === 'custom-placeholder') {
    return { todo: items('research', 'design', 'build', 'review'), done: items('release'), child: [] };
  }
  if (
    exampleId === 'simple'
    || exampleId === 'handle'
    || exampleId === 'skeleton-placeholder'
  ) {
    return { todo: items('research', 'design', 'build', 'review'), done: [], child: [] };
  }
  if (exampleId === 'tree') {
    const node = (id: string, children: readonly DemoTreeNode[] = [], acceptsChildren = false): DemoTreeNode => ({
      ...catalog[id]!, children, acceptsChildren,
    });
    return { todo: [], done: [], child: [], tree: [
      node('research', [node('review', [node('document'), node('observe')], true), node('release')], true),
      node('design', [], true),
      node('build'),
    ] };
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
  if (exampleId === 'grid' || exampleId === 'swap-grid') {
    const tones: DemoItem['tone'][] = ['mint', 'blue', 'amber', 'violet'];
    return {
      todo: Array.from({ length: 20 }, (_, index) => ({
        id: `grid-${index + 1}`,
        title: `Item ${index + 1}`,
        detail: `Grid position ${index + 1}`,
        tone: tones[index % tones.length] as DemoItem['tone'],
      })),
      done: [],
      child: [],
    };
  }
  if (exampleId === 'transitions') {
    return {
      todo: items('research', 'design', 'build', 'review', 'release', 'document', 'observe', 'measure'),
      done: [],
      child: [],
    };
  }
  if (exampleId === 'thresholds' || exampleId === 'swap') {
    return {
      todo: items('research', 'design', 'build', 'review', 'release', 'document'),
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
  if (state.tree !== undefined) {
    const byId = new Map(demoTree.getAreas(state.tree).flatMap((area) => area.items.map((item) => [item.id, item] as const)));
    const updates = change.orders.map((order) => ({
      areaId: order.areaId,
      items: order.itemIds.map((id) => {
        const item = byId.get(String(id));
        if (item === undefined) throw new Error('Unknown demo tree node');
        return item;
      }),
    }));
    return { ...state, tree: demoTree.applyChange(state.tree, { ...change, updates }) };
  }
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
  if (state.tree !== undefined) {
    return Object.fromEntries(demoTreeAreas(state).map((area) => [area.areaId, area.items.map((item) => item.id)]));
  }
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
    || exampleId === 'custom-placeholder'
    || exampleId === 'clone'
    || exampleId === 'custom-clone'
    || exampleId === 'modifier-copy'
    || exampleId === 'two-list-slots'
    || exampleId === 'empty'
    || exampleId === 'accept';
}

export type DemoDragMode = 'handle' | 'title' | 'card';

export function dragHandle(mode: DemoDragMode): string | undefined {
  return mode === 'card' ? undefined : mode === 'title' ? '.cs-demo-card__copy > strong' : '.cs-demo-handle';
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

export function demoTreeAreas(state: DemoState): readonly SortableTreeArea<DemoTreeNode>[] {
  if (state.tree === undefined) throw new Error('Missing demo tree');
  const all = demoTree.getAreas(state.tree);
  const folders = new Set(all.flatMap((area) => area.items.filter((item) => item.acceptsChildren).map((item) => item.id)));
  return all.filter((area) => area.parent === undefined || folders.has(String(area.parent.itemId)));
}

export function demoTreeArea(state: DemoState, areaId: string): SortableTreeArea<DemoTreeNode> {
  const area = demoTreeAreas(state).find((candidate) => candidate.areaId === areaId);
  if (area === undefined) throw new Error('Unknown demo tree area');
  return area;
}

export function treeChildAreaId(item: DemoTreeNode): string {
  return item.id === 'research' ? 'child' : `tree-children-${item.id}`;
}

export function updateDemoTreeArea(state: DemoState, areaId: string, items: readonly DemoItem[]): DemoState {
  if (state.tree === undefined) throw new Error('Missing demo tree');
  return { ...state, tree: demoTree.updateArea(state.tree, areaId, items as readonly DemoTreeNode[]) };
}

export function reverseDemoChildren(state: DemoState): DemoState {
  return state.tree === undefined
    ? { ...state, child: [...state.child].reverse() }
    : updateDemoTreeArea(state, 'child', [...demoTreeArea(state, 'child').items].reverse());
}

export function isCopyExample(exampleId: PlaygroundExampleId): boolean {
  return exampleId === 'clone'
    || exampleId === 'custom-clone'
    || exampleId === 'modifier-copy';
}
