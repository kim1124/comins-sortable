import type { SortableChange } from '../../../src/core.js';
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
}

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
  if (exampleId === 'simple' || exampleId === 'handle') {
    return { todo: items('research', 'design', 'build', 'review'), done: [] };
  }
  if (exampleId === 'auto-scroll') {
    return {
      todo: items(
        'research', 'design', 'build', 'review', 'release',
        'document', 'observe', 'measure', 'improve',
      ),
      done: [],
    };
  }
  if (exampleId === 'empty') {
    return { todo: items('research', 'design', 'build'), done: [] };
  }
  if (exampleId === 'accept') {
    return { todo: items('research', 'design', 'build'), done: items('review') };
  }
  return {
    todo: items('research', 'design', 'build'),
    done: items('review'),
  };
}

export function applyDemoChange(state: DemoState, change: SortableChange): DemoState {
  const itemById = new Map(
    [...state.todo, ...state.done].map((item) => [item.id, item] as const),
  );
  const next: DemoState = {
    todo: [...state.todo],
    done: [...state.done],
  };

  for (const order of change.orders) {
    if (order.areaId !== 'todo' && order.areaId !== 'done') continue;
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
  return exampleId === 'two-lists' || exampleId === 'empty' || exampleId === 'accept';
}
