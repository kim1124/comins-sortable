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

export interface FakeElementOptions {
  ownerDocument?: object;
  parentElement?: Element | null;
  rect?: RectSnapshot;
  selectors?: readonly string[];
  attributes?: Readonly<Record<string, string>>;
  children?: readonly FakeElement[];
  id?: string;
  textContent?: string;
  value?: string;
  style?: Readonly<Record<string, string>>;
  computedStyle?: Readonly<Record<string, string>>;
  scrollTop?: number;
  scrollLeft?: number;
  scrollHeight?: number;
  scrollWidth?: number;
  clientHeight?: number;
  clientWidth?: number;
}

export interface FakeElement extends Element {
  readonly fixtureChildren: FakeElement[];
  readonly rect: RectSnapshot;
  readonly capturedPointers: number[];
  readonly releasedPointers: number[];
  readonly classNames: Set<string>;
  readonly computedStyle: Record<string, string>;
  readonly scrolledBy: Array<{ left: number; top: number }>;
  readonly style: CSSStyleDeclaration;
  dispatch(type: string, event: object): void;
  focus(): void;
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
  const attributes = new Map(Object.entries(options.attributes ?? {}));
  const classNames = new Set<string>();
  const capturedPointers: number[] = [];
  const releasedPointers: number[] = [];
  const listeners = new Map<string, Set<EventListenerOrEventListenerObject>>();
  const styleValues: Record<string, string> = { ...options.style };
  const style = new Proxy(styleValues, {
    get(target, property) {
      if (typeof property === 'string') {
        return target[property] ?? '';
      }
      return Reflect.get(target, property);
    },
    set(target, property, value) {
      if (typeof property === 'string') {
        target[property] = String(value);
        return true;
      }
      return Reflect.set(target, property, value);
    },
  });
  const element = {
    tagName,
    ownerDocument: options.ownerDocument ?? defaultDocument,
    parentElement: options.parentElement ?? null,
    fixtureChildren: [] as FakeElement[],
    rect: options.rect ?? rect(0, 0, 0, 0),
    id: options.id ?? '',
    textContent: options.textContent ?? '',
    value: options.value ?? '',
    style,
    classNames,
    computedStyle: {
      overflowX: 'visible',
      overflowY: 'visible',
      ...options.computedStyle,
    },
    scrollTop: options.scrollTop ?? 0,
    scrollLeft: options.scrollLeft ?? 0,
    scrollHeight: options.scrollHeight ?? options.clientHeight ?? 0,
    scrollWidth: options.scrollWidth ?? options.clientWidth ?? 0,
    clientHeight: options.clientHeight ?? 0,
    clientWidth: options.clientWidth ?? 0,
    scrolledBy: [] as Array<{ left: number; top: number }>,
    capturedPointers,
    releasedPointers,
    get children() {
      return this.fixtureChildren;
    },
    get parentNode() {
      return this.parentElement;
    },
    get nextSibling() {
      const parent = this.parentElement as FakeElement | null;
      if (parent === null) {
        return null;
      }
      const index = parent.fixtureChildren.indexOf(this as unknown as FakeElement);
      return parent.fixtureChildren[index + 1] ?? null;
    },
    getBoundingClientRect() {
      return this.rect;
    },
    cloneNode(deep = false) {
      const clone = fakeElement(tagName, {
        ownerDocument: this.ownerDocument,
        rect: this.rect,
        attributes: Object.fromEntries(attributes),
        id: this.id,
        textContent: this.textContent,
        value: this.value,
        style: { ...styleValues },
        computedStyle: { ...this.computedStyle },
      });
      for (const className of classNames) {
        clone.classList.add(className);
      }
      if (deep) {
        for (const child of this.fixtureChildren) {
          clone.appendChild(child.cloneNode(true) as FakeElement);
        }
      }
      return clone;
    },
    querySelectorAll(selector: string) {
      const found: FakeElement[] = [];
      const visit = (parent: typeof element) => {
        for (const child of parent.fixtureChildren) {
          if (child.matches(selector)) {
            found.push(child);
          }
          visit(child as unknown as typeof element);
        }
      };
      visit(this);
      return found;
    },
    querySelector(selector: string) {
      return this.querySelectorAll(selector)[0] ?? null;
    },
    matches(selector: string) {
      if (selector.trim() === '[') {
        throw new SyntaxError('invalid selector');
      }
      return selector.split(',').some((part) => {
        const token = part.trim();
        const attribute = /^\[([^=\]]+)(?:="([^"]*)")?\]$/.exec(token);
        if (attribute !== null) {
          const name = attribute[1] as string;
          const expected = attribute[2];
          return expected === undefined
            ? attributes.has(name)
            : attributes.get(name) === expected;
        }
        return token === tagName.toLowerCase()
          || token === tagName.toUpperCase()
          || (token.startsWith('.') && classNames.has(token.slice(1)))
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
    getAttribute(name: string) {
      if (name === 'id') {
        return this.id || null;
      }
      return attributes.get(name) ?? null;
    },
    hasAttribute(name: string) {
      return name === 'id' ? this.id !== '' : attributes.has(name);
    },
    setAttribute(name: string, value: string) {
      if (name === 'id') {
        this.id = String(value);
        return;
      }
      attributes.set(name, String(value));
    },
    removeAttribute(name: string) {
      if (name === 'id') {
        this.id = '';
        return;
      }
      attributes.delete(name);
    },
    classList: {
      add: (...tokens: string[]) => tokens.forEach((token) => classNames.add(token)),
      remove: (...tokens: string[]) => tokens.forEach((token) => classNames.delete(token)),
      contains: (token: string) => classNames.has(token),
    },
    appendChild(child: FakeElement) {
      return this.insertBefore(child, null);
    },
    insertBefore(child: FakeElement, reference: FakeElement | null) {
      const oldParent = child.parentElement as FakeElement | null;
      if (oldParent !== null) {
        const oldIndex = oldParent.fixtureChildren.indexOf(child);
        if (oldIndex !== -1) {
          oldParent.fixtureChildren.splice(oldIndex, 1);
        }
      }
      (child as unknown as { parentElement: Element | null }).parentElement = (
        this as unknown as Element
      );
      const index = reference === null
        ? -1
        : this.fixtureChildren.indexOf(reference);
      if (index === -1) {
        this.fixtureChildren.push(child);
      } else {
        this.fixtureChildren.splice(index, 0, child);
      }
      return child;
    },
    removeChild(child: FakeElement) {
      const index = this.fixtureChildren.indexOf(child);
      if (index !== -1) {
        this.fixtureChildren.splice(index, 1);
        (child as unknown as { parentElement: Element | null }).parentElement = null;
      }
      return child;
    },
    remove() {
      const parent = this.parentElement as FakeElement | null;
      parent?.removeChild(this as unknown as FakeElement);
    },
    addEventListener(
      type: string,
      callback: EventListenerOrEventListenerObject | null,
      listenerOptions?: AddEventListenerOptions | boolean,
    ) {
      if (callback === null) {
        return;
      }
      let records = listeners.get(type);
      if (records === undefined) {
        records = new Set();
        listeners.set(type, records);
      }
      records.add(callback);
      const signal = typeof listenerOptions === 'object'
        ? listenerOptions.signal
        : undefined;
      signal?.addEventListener('abort', () => records?.delete(callback), { once: true });
    },
    removeEventListener(type: string, callback: EventListenerOrEventListenerObject | null) {
      if (callback !== null) {
        listeners.get(type)?.delete(callback);
      }
    },
    dispatch(type: string, event: object) {
      for (const callback of [...(listeners.get(type) ?? [])]) {
        if (typeof callback === 'function') {
          callback(event as Event);
        } else {
          callback.handleEvent(event as Event);
        }
      }
    },
    focus() {
      const document = this.ownerDocument as unknown as { activeElement: Element | null };
      try {
        document.activeElement = this as unknown as Element;
      } catch {
        // Structural test documents expose a writable activeElement.
      }
    },
    scrollBy(input: ScrollToOptions) {
      const left = input.left ?? 0;
      const top = input.top ?? 0;
      this.scrollLeft += left;
      this.scrollTop += top;
      this.scrolledBy.push({ left, top });
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

  for (const child of options.children ?? []) {
    element.appendChild(child);
  }

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
    const child = fakeElement('LI', {
      parentElement: element,
      attributes: { 'data-sortable-item': '' },
    });
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

export interface DomFixture {
  readonly registry: Map<string, Element>;
  readonly areas: Readonly<Record<string, FakeElement>>;
  ids(areaId: string): readonly string[];
}

export function domFixture(
  itemIdsByArea: Readonly<Record<string, readonly string[]>>,
): DomFixture {
  const platform = fakePlatform();
  const registry = new Map<string, Element>();
  const areas: Record<string, FakeElement> = {};

  for (const [areaId, itemIds] of Object.entries(itemIdsByArea)) {
    const areaElement = fakeElement('UL', { ownerDocument: platform.document });
    for (const itemId of itemIds) {
      areaElement.appendChild(fakeElement('LI', {
        ownerDocument: platform.document,
        attributes: { 'data-sortable-id': itemId },
      }));
    }
    registry.set(areaId, areaElement);
    areas[areaId] = areaElement;
  }

  return {
    registry,
    areas,
    ids: (areaId) => (areas[areaId]?.fixtureChildren ?? []).map(
      (element) => element.getAttribute('data-sortable-id') as string,
    ),
  };
}

export function selectorDocument(
  entries: Readonly<Record<string, Element>>,
): Document {
  return {
    querySelector(selector: string): Element | null {
      if (selector === '[') {
        throw new SyntaxError('invalid selector');
      }
      return entries[selector] ?? null;
    },
  } as Document;
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
      altKey: false,
      ctrlKey: false,
      metaKey: false,
      shiftKey: false,
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
  readonly windowScrolls: Array<{ left: number; top: number }>;
  flushFrame(): void;
  frameCount(): number;
  listenerCount(): number;
  dispatchDocument(type: string, event: object): void;
  dispatchWindow(type: string, event: object): void;
  setVisibility(value: DocumentVisibilityState): void;
  setHits(elements: readonly Element[]): void;
}

export function fakePlatform(): FakePlatform {
  const documentTarget = new FakeEventTarget();
  const windowTarget = new FakeEventTarget();
  const frames = new Map<number, FrameRequestCallback>();
  const reports: unknown[] = [];
  const windowScrolls: Array<{ left: number; top: number }> = [];
  let frameId = 0;
  let visibilityState: DocumentVisibilityState = 'visible';
  let hits: readonly Element[] = [];
  const documentRecord: Record<string, unknown> = {
    addEventListener: documentTarget.addEventListener.bind(documentTarget),
    removeEventListener: documentTarget.removeEventListener.bind(documentTarget),
    elementsFromPoint: () => hits,
    activeElement: null,
    get visibilityState() {
      return visibilityState;
    },
  };
  const document = documentRecord as unknown as Document;
  const windowRecord: Record<string, unknown> = {
    addEventListener: windowTarget.addEventListener.bind(windowTarget),
    removeEventListener: windowTarget.removeEventListener.bind(windowTarget),
    innerWidth: 1024,
    innerHeight: 768,
    scrollX: 0,
    scrollY: 0,
    getComputedStyle: (element: FakeElement) => element.computedStyle,
    scrollBy: (input: ScrollToOptions) => {
      const left = input.left ?? 0;
      const top = input.top ?? 0;
      windowScrolls.push({ left, top });
      windowRecord.scrollX = Number(windowRecord.scrollX) + left;
      windowRecord.scrollY = Number(windowRecord.scrollY) + top;
    },
    requestAnimationFrame: (callback: FrameRequestCallback) => {
      frameId += 1;
      frames.set(frameId, callback);
      return frameId;
    },
    cancelAnimationFrame: (id: number) => {
      frames.delete(id);
    },
  };
  const window = windowRecord as unknown as Window;
  documentRecord.defaultView = window;
  documentRecord.createElement = (tagName: string) => fakeElement(tagName.toUpperCase(), {
    ownerDocument: document,
  });
  documentRecord.documentElement = fakeElement('HTML', {
    ownerDocument: document,
    clientWidth: 1024,
    clientHeight: 768,
    scrollWidth: 1024,
    scrollHeight: 768,
  });
  documentRecord.body = fakeElement('BODY', { ownerDocument: document });

  return {
    document,
    window,
    reports,
    windowScrolls,
    elementsFromPoint: () => hits,
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
    setHits(elements) {
      hits = elements;
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
      altKey: false,
      ctrlKey: false,
      metaKey: false,
      shiftKey: false,
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
      altKey: false,
      ctrlKey: false,
      metaKey: false,
      shiftKey: false,
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
