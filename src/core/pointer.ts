import type { AfterDragReason, PointerSnapshot } from './model.js';
import type { SortablePlatform } from './platform.js';

export const DEFAULT_IGNORE_SELECTOR = [
  'input',
  'textarea',
  'select',
  'button',
  'a[href]',
  '[contenteditable="true"]',
  '[data-comins-sortable-ignore]',
].join(',');

export interface PointerInput {
  readonly pointerId: number;
  readonly pointerType: string;
  readonly clientX: number;
  readonly clientY: number;
  readonly isPrimary: boolean;
  readonly button: number;
  readonly target: EventTarget | null;
  readonly altKey?: boolean;
  readonly ctrlKey?: boolean;
  readonly metaKey?: boolean;
  readonly shiftKey?: boolean;
  preventDefault?(): void;
}

export interface PointerSensorOptions {
  activationDistance: number;
  platform: SortablePlatform;
  handle?: string;
  ignore?: string;
  onActivate(snapshot: PointerSnapshot): boolean | void;
  onMove(snapshot: PointerSnapshot): void;
  onCancel(reason: AfterDragReason): void;
  onRelease(snapshot: PointerSnapshot): void;
  onEnd?(): void;
}

export interface PointerSensor {
  pointerDown(input: PointerInput, sourceElement?: Element): boolean;
  pointerMove(input: PointerInput): void;
  pointerUp(input: PointerInput): void;
  pointerCancel(input: PointerInput): void;
  cancel(reason: AfterDragReason): void;
  unmount(): void;
  destroy(): void;
}

interface Coordinates {
  clientX: number;
  clientY: number;
}

interface Modifiers {
  altKey: boolean;
  ctrlKey: boolean;
  metaKey: boolean;
  shiftKey: boolean;
}

interface PendingPointer {
  pointerId: number;
  pointerType: PointerSnapshot['type'];
  origin: Coordinates;
  latest: Coordinates & Modifiers;
  frameId: number | null;
  active: boolean;
  captureTarget: Element;
  abortController: AbortController;
}

export function createPointerSensor(options: PointerSensorOptions): PointerSensor {
  let current: PendingPointer | null = null;
  let destroyed = false;

  const snapshot = (
    pointer: Pick<PendingPointer, 'pointerType' | 'origin' | 'latest'>,
  ): PointerSnapshot => ({
    type: pointer.pointerType,
    clientX: pointer.latest.clientX,
    clientY: pointer.latest.clientY,
    deltaX: pointer.latest.clientX - pointer.origin.clientX,
    deltaY: pointer.latest.clientY - pointer.origin.clientY,
    altKey: pointer.latest.altKey,
    ctrlKey: pointer.latest.ctrlKey,
    metaKey: pointer.latest.metaKey,
    shiftKey: pointer.latest.shiftKey,
  });

  const latestInput = (input: PointerInput): Coordinates & Modifiers => ({
    clientX: input.clientX,
    clientY: input.clientY,
    altKey: input.altKey === true,
    ctrlKey: input.ctrlKey === true,
    metaKey: input.metaKey === true,
    shiftKey: input.shiftKey === true,
  });

  const cleanup = (): void => {
    const pointer = current;
    if (pointer === null) {
      return;
    }
    current = null;
    if (pointer.frameId !== null) {
      options.platform.cancelFrame(pointer.frameId);
    }
    pointer.abortController.abort();
    if (
      pointer.active
      && typeof pointer.captureTarget.releasePointerCapture === 'function'
      && (
        typeof pointer.captureTarget.hasPointerCapture !== 'function'
        || pointer.captureTarget.hasPointerCapture(pointer.pointerId)
      )
    ) {
      try {
        pointer.captureTarget.releasePointerCapture(pointer.pointerId);
      } catch (error) {
        options.platform.report(error);
      }
    }
    try {
      options.onEnd?.();
    } catch (error) {
      options.platform.report(error);
    }
  };

  const reportAfterCleanup = (error: unknown): void => {
    cleanup();
    options.platform.report(error);
  };

  const cancel = (reason: AfterDragReason): void => {
    const active = current?.active === true;
    cleanup();
    if (!active) {
      return;
    }
    try {
      options.onCancel(reason);
    } catch (error) {
      options.platform.report(error);
    }
  };

  const processFrame = (): void => {
    const pointer = current;
    if (pointer === null) {
      return;
    }
    pointer.frameId = null;
    const nextSnapshot = snapshot(pointer);

    if (!pointer.active) {
      const distance = Math.hypot(nextSnapshot.deltaX, nextSnapshot.deltaY);
      if (distance < options.activationDistance) {
        return;
      }
      pointer.active = true;
      try {
        if (typeof pointer.captureTarget.setPointerCapture === 'function') {
          pointer.captureTarget.setPointerCapture(pointer.pointerId);
        }
        if (options.onActivate(nextSnapshot) === false) {
          cleanup();
        }
      } catch (error) {
        reportAfterCleanup(error);
      }
      return;
    }

    try {
      options.onMove(nextSnapshot);
    } catch (error) {
      cleanup();
      try {
        options.onCancel('error');
      } catch (cancelError) {
        options.platform.report(cancelError);
      }
      options.platform.report(error);
    }
  };

  const pointerMove = (input: PointerInput): void => {
    const pointer = current;
    if (pointer === null || input.pointerId !== pointer.pointerId) {
      return;
    }
    pointer.latest = latestInput(input);
    if (pointer.active) {
      input.preventDefault?.();
    }
    if (pointer.frameId === null) {
      pointer.frameId = options.platform.requestFrame(processFrame);
    }
  };

  const pointerUp = (input: PointerInput): void => {
    const pointer = current;
    if (pointer === null || input.pointerId !== pointer.pointerId) {
      return;
    }
    pointer.latest = latestInput(input);
    const active = pointer.active;
    const finalSnapshot = snapshot(pointer);
    cleanup();
    if (!active) {
      return;
    }
    try {
      options.onRelease(finalSnapshot);
    } catch (error) {
      options.platform.report(error);
    }
  };

  const pointerCancel = (input: PointerInput): void => {
    if (current === null || input.pointerId !== current.pointerId) {
      return;
    }
    cancel('pointer-cancel');
  };

  const pointerDown = (
    input: PointerInput,
    sourceElement?: Element,
  ): boolean => {
    if (destroyed || current !== null || !canStartPointer(input)) {
      return false;
    }
    const target = asElement(input.target);
    const source = sourceElement ?? target;
    if (target === null || source === null || !source.contains(target)) {
      return false;
    }
    const handle = options.handle === undefined
      ? null
      : closestWithin(target, source, options.handle);
    if (options.handle !== undefined && handle === null) {
      return false;
    }
    const ignoreSelector = options.ignore ?? DEFAULT_IGNORE_SELECTOR;
    if (handle === null && closestWithin(target, source, ignoreSelector) !== null) {
      return false;
    }

    const pointerType = normalizePointerType(input.pointerType);
    if (pointerType === null) {
      return false;
    }
    const abortController = new AbortController();
    current = {
      pointerId: input.pointerId,
      pointerType,
      origin: { clientX: input.clientX, clientY: input.clientY },
      latest: latestInput(input),
      frameId: null,
      active: false,
      captureTarget: source,
      abortController,
    };

    const listenerOptions = { signal: abortController.signal };
    options.platform.document.addEventListener(
      'pointermove',
      ((event: PointerEvent) => pointerMove(event)) as EventListener,
      listenerOptions,
    );
    options.platform.document.addEventListener(
      'pointerup',
      ((event: PointerEvent) => pointerUp(event)) as EventListener,
      listenerOptions,
    );
    options.platform.document.addEventListener(
      'pointercancel',
      ((event: PointerEvent) => pointerCancel(event)) as EventListener,
      listenerOptions,
    );
    options.platform.document.addEventListener(
      'keydown',
      ((event: KeyboardEvent) => {
        if (event.key === 'Escape') {
          cancel('escape');
        }
      }) as EventListener,
      listenerOptions,
    );
    options.platform.document.addEventListener(
      'visibilitychange',
      (() => {
        if (options.platform.document.visibilityState === 'hidden') {
          cancel('blur');
        }
      }) as EventListener,
      listenerOptions,
    );
    options.platform.window.addEventListener(
      'blur',
      () => cancel('blur'),
      listenerOptions,
    );
    return true;
  };

  return {
    pointerDown,
    pointerMove,
    pointerUp,
    pointerCancel,
    cancel,
    unmount: () => cancel('unmounted'),
    destroy: () => {
      if (destroyed) {
        return;
      }
      destroyed = true;
      cancel('destroyed');
    },
  };
}

function canStartPointer(input: PointerInput): boolean {
  return input.isPrimary && (input.pointerType !== 'mouse' || input.button === 0);
}

function normalizePointerType(
  pointerType: string,
): PointerSnapshot['type'] | null {
  return pointerType === 'mouse' || pointerType === 'touch' || pointerType === 'pen'
    ? pointerType
    : null;
}

function asElement(value: EventTarget | null): Element | null {
  if (
    typeof value === 'object'
    && value !== null
    && 'matches' in value
    && typeof value.matches === 'function'
    && 'closest' in value
    && typeof value.closest === 'function'
  ) {
    return value as Element;
  }
  return null;
}

function closestWithin(
  target: Element,
  source: Element,
  selector: string,
): Element | null {
  const match = target.closest(selector);
  return match !== null && source.contains(match) ? match : null;
}
