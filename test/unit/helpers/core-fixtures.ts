import type { RegisteredArea } from '../../../src/core/registry.js';
import type {
  DragContext,
  SortableDirection,
  SortableId,
} from '../../../src/core/model.js';
import type { AreaGeometry, ItemGeometry, RectSnapshot } from '../../../src/core/geometry.js';

interface FakeElementOptions {
  ownerDocument?: object;
  parentElement?: Element | null;
  rect?: RectSnapshot;
}

export interface FakeElement extends Element {
  readonly fixtureChildren: Element[];
  readonly rect: RectSnapshot;
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
  const element = {
    tagName,
    ownerDocument: options.ownerDocument ?? defaultDocument,
    parentElement: options.parentElement ?? null,
    fixtureChildren: [] as Element[],
    rect: options.rect ?? rect(0, 0, 0, 0),
    getBoundingClientRect() {
      return this.rect;
    },
    querySelectorAll() {
      return this.fixtureChildren;
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
  } = {},
): AreaGeometry {
  return {
    areaId,
    group: options.group ?? 'tasks',
    direction: options.direction ?? 'vertical',
    disabled: options.disabled ?? false,
    accept: () => options.accepted ?? true,
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
