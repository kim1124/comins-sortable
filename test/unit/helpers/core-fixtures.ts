import type { RegisteredArea } from '../../../src/core/registry.js';
import type { SortablePlatform } from '../../../src/core/platform.js';
import type {
  ActiveSession,
  PendingSession,
} from '../../../src/core/session.js';
import type { PointerInput } from '../../../src/core/pointer.js';
import type {
  DragContext,
  SortableChange,
  SortableDirection,
  SortableId,
} from '../../../src/core/model.js';
import type { AreaGeometry, ItemGeometry, RectSnapshot } from '../../../src/core/geometry.js';

interface FakeElementOptions {
  ownerDocument?: object;
  parentElement?: Element | null;
  rect?: RectSnapshot;
  selectors?: readonly string[];
}

export interface FakeElement extends Element {
  readonly fixtureChildren: Element[];
  readonly rect: RectSnapshot;
  readonly capturedPointers: number[];
  readonly releasedPointers: number[];
}

const defaultDocument = {};

function rect(left: number, top: number, width: number, height: number): RectSnapshot {
  return {
    left,
    top,
    right: left + width,
    bottom: top + height,
    width,
    height,
  };
}

export function fakeElement(
  tagName = 'DIV',
  options: FakeElementOptions = {},
): FakeElement {
  const selectors = new Set(options.selectors ?? []);
  const capturedPointers: number[] = [];
  const releasedPointers: number[] = [];
  const element = {
    tagName,
    ownerDocument: options.ownerDocument ?? defaultDocument,
    parentElement: options.parentElement ?? null,
    fixtureChildren: [] as Element[],
    rect: options.rect ?? rect(0, 0, 0, 0),
    capturedPointers,
    releasedPointers,
    getBoundingClientRect() {
      return this.rect;
    },
    querySelectorAll() {
      return this.fixtureChildren;
    },
    matches(selector: string) {
      return selector.split(',').some((part) => {
        const token = part.trim();
        return token === tagName.toLowerCase()
          || token === tagName.toUpperCase()
          || selectors.has(token);
      });
    },
    closest(selector: string) {
      let current: typeof element | null = this;
      while (current !== null) {
        if (current.matches(selector)) {
          return current;
        }
        current = current.parentElement as typeof element | null;
      }
      return null;
    },
    contains(candidate: object) {
      let current: object | null = candidate;
      while (current !== null) {
        if (current === this) {
          return true;
        }
        current = 'parentElement' in current
          ? (current.parentElement as object | null)
          : null;
      }
      return false;
    },
    setPointerCapture(pointerId: number) {
      capturedPointers.push(pointerId);
    },
    hasPointerCapture(pointerId: number) {
      return capturedPointers.includes(pointerId)
        && !releasedPointers.includes(pointerId);
    },
    releasePointerCapture(pointerId: number) {
      releasedPointers.push(pointerId);
    },
  };

  return element as unknown as FakeElement;
}

export function area(
  areaId: string,
  group: string,
  itemIds: readonly (SortableId | undefined)[],
  options: {
    direction?: SortableDirection;
    disabled?: boolean;
    ownerDocument?: object;
  } = {},
): RegisteredArea {
  const element = fakeElement('UL', { ownerDocument: options.ownerDocument });
  const ids = new Map<Element, SortableId | undefined>();

  for (const itemId of itemIds) {
    const child = fakeElement('LI', { parentElement: element });
    element.fixtureChildren.push(child);
    ids.set(child, itemId);
  }

  return {
    element,
    areaId,
    group,
    direction: options.direction ?? 'vertical',
    disabled: options.disabled ?? false,
    itemSelector: '[data-sortable-item]',
    getItemId: (child) => ids.get(child) as SortableId,
    accept: () => true,
  };
}

export function rectItem(
  id: SortableId,
  left: number,
  top: number,
  width: number,
  height: number,
): ItemGeometry {
  return { id, rect: rect(left, top, width, height) };
}

export function rectArea(
  areaId: string,
  left: number,
  top: number,
  width: number,
  height: number,
  options: {
    direction?: Exclude<SortableDirection, 'auto'>;
    group?: string;
    disabled?: boolean;
    accepted?: boolean;
    depth?: number;
  } = {},
): AreaGeometry {
  return {
    areaId,
    group: options.group ?? 'tasks',
    direction: options.direction ?? 'vertical',
    disabled: options.disabled ?? false,
    accept: () => options.accepted ?? true,
    depth: options.depth ?? 0,
    rect: rect(left, top, width, height),
  };
}

export function hasCode(code: string): (error: unknown) => boolean {
  return (error) => (
    typeof error === 'object'
    && error !== null
    && 'code' in error
    && error.code === code
  );
}

export function dragContext(): DragContext {
  return {
    itemId: 'source',
    source: { areaId: 'todo', index: 0 },
    destination: null,
    pointer: {
      type: 'mouse',
      clientX: 0,
      clientY: 0,
      deltaX: 0,
      deltaY: 0,
    },
  };
}

interface ListenerRecord {
  callback: EventListenerOrEventListenerObject;
  abort?: () => void;
}

class FakeEventTarget {
  private readonly listeners = new Map<string, Set<ListenerRecord>>();

  addEventListener(
    type: string,
    callback: EventListenerOrEventListenerObject | null,
    options?: AddEventListenerOptions | boolean,
  ): void {
    if (callback === null) {
      return;
    }
    let records = this.listeners.get(type);
    if (records === undefined) {
      records = new Set();
      this.listeners.set(type, records);
    }
    const record: ListenerRecord = { callback };
    records.add(record);
    const signal = typeof options === 'object' ? options.signal : undefined;
    if (signal !== undefined) {
      const abort = () => records?.delete(record);
      record.abort = abort;
      signal.addEventListener('abort', abort, { once: true });
    }
  }

  removeEventListener(
    type: string,
    callback: EventListenerOrEventListenerObject | null,
  ): void {
    const records = this.listeners.get(type);
    for (const record of records ?? []) {
      if (record.callback === callback) {
        records?.delete(record);
        if (record.abort !== undefined) {
          record.abort = undefined;
        }
      }
    }
  }

  dispatch(type: string, event: object): void {
    for (const record of [...(this.listeners.get(type) ?? [])]) {
      if (typeof record.callback === 'function') {
        record.callback(event as Event);
      } else {
        record.callback.handleEvent(event as Event);
      }
    }
  }

  count(): number {
    let total = 0;
    for (const records of this.listeners.values()) {
      total += records.size;
    }
    return total;
  }
}

export interface FakePlatform extends SortablePlatform {
  readonly reports: unknown[];
  flushFrame(): void;
  frameCount(): number;
  listenerCount(): number;
  dispatchDocument(type: string, event: object): void;
  dispatchWindow(type: string, event: object): void;
  setVisibility(value: DocumentVisibilityState): void;
}

export function fakePlatform(): FakePlatform {
  const documentTarget = new FakeEventTarget();
  const windowTarget = new FakeEventTarget();
  const frames = new Map<number, FrameRequestCallback>();
  const reports: unknown[] = [];
  let frameId = 0;
  let visibilityState: DocumentVisibilityState = 'visible';
  const document = {
    addEventListener: documentTarget.addEventListener.bind(documentTarget),
    removeEventListener: documentTarget.removeEventListener.bind(documentTarget),
    elementsFromPoint: () => [],
    get visibilityState() {
      return visibilityState;
    },
  } as unknown as Document;
  const window = {
    addEventListener: windowTarget.addEventListener.bind(windowTarget),
    removeEventListener: windowTarget.removeEventListener.bind(windowTarget),
  } as unknown as Window;

  return {
    document,
    window,
    reports,
    elementsFromPoint: () => [],
    requestFrame(callback) {
      frameId += 1;
      frames.set(frameId, callback);
      return frameId;
    },
    cancelFrame(id) {
      frames.delete(id);
    },
    report(error) {
      reports.push(error);
    },
    flushFrame() {
      const pending = [...frames.entries()];
      frames.clear();
      for (const [, callback] of pending) {
        callback(0);
      }
    },
    frameCount: () => frames.size,
    listenerCount: () => documentTarget.count() + windowTarget.count(),
    dispatchDocument: (type, event) => documentTarget.dispatch(type, event),
    dispatchWindow: (type, event) => windowTarget.dispatch(type, event),
    setVisibility(value) {
      visibilityState = value;
    },
  };
}

export function pointer(input: Partial<PointerInput> = {}): PointerInput {
  return {
    pointerId: 1,
    pointerType: 'mouse',
    clientX: 0,
    clientY: 0,
    isPrimary: true,
    button: 0,
    target: null,
    ...input,
  };
}

export function pendingInput(): PendingSession {
  return {
    pointerId: 1,
    pointerType: 'mouse',
    itemId: 'a',
    source: { areaId: 'todo', index: 0 },
    origin: {
      type: 'mouse',
      clientX: 0,
      clientY: 0,
      deltaX: 0,
      deltaY: 0,
    },
  };
}

export function activeInput(): ActiveSession {
  return {
    ...pendingInput(),
    pointer: {
      type: 'mouse',
      clientX: 4,
      clientY: 0,
      deltaX: 4,
      deltaY: 0,
    },
    destination: { areaId: 'todo', index: 1 },
  };
}

export function change(): SortableChange {
  return {
    operation: 'reorder',
    itemId: 'a',
    source: { areaId: 'todo', index: 0 },
    destination: { areaId: 'todo', index: 1 },
    orders: [{ areaId: 'todo', itemIds: ['b', 'a'] }],
  };
}
