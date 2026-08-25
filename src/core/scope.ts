import { createAutoScroller } from './auto-scroll.js';
import { createLayoutAnimator, normalizeAnimation } from './animation.js';
import type { SortableLayoutAnimator } from './animation.js';
import {
  findAreaAtPoint,
  insertionIndex,
} from './collision.js';
import { SortableError } from './errors.js';
import { createFeedback } from './feedback.js';
import {
  GeometryCache,
  resolveDirection,
} from './geometry.js';
import type {
  AreaGeometry,
  GeometryTarget,
  ItemGeometry,
  RectSnapshot,
  Point,
} from './geometry.js';
import {
  buildCopyChange,
  buildReorderChange,
  buildTransferChange,
} from './operations.js';
import {
  createBrowserPlatform,
} from './platform.js';
import type { SortablePlatform } from './platform.js';
import {
  createPointerSensor,
  DEFAULT_IGNORE_SELECTOR,
} from './pointer.js';
import type {
  PointerInput,
  PointerSensor,
} from './pointer.js';
import {
  AreaRegistry,
} from './registry.js';
import type { RegisteredArea } from './registry.js';
import {
  SessionMachine,
} from './session.js';
import type {
  ActiveSession,
  PendingSession,
} from './session.js';
import type {
  AfterDragReason,
  AfterDragResult,
  CopyItemContext,
  DragContext,
  PointerSnapshot,
  SortableAreaOptions,
  SortableAreaPatch,
  SortableAnimation,
  SortableChange,
  SortableDirection,
  SortableId,
  SortableLocation,
  SortableParentLocation,
  SortableScope,
  SortableScopeOptions,
  SortableTransferMode,
} from './model.js';
import type { SortableFeedback } from './feedback.js';

interface NormalizedAreaOptions {
  areaId: string;
  group: string;
  item: string;
  getItemId(element: Element): SortableId;
  direction: SortableDirection;
  disabled: boolean;
  handle?: string;
  ignore: string;
  activationDistance: number;
  emptyInsertThreshold: number;
  autoScroll: boolean;
  animation: SortableAnimation;
  parent?: SortableParentLocation;
  accept(context: DragContext): boolean;
  pull(context: DragContext): false | SortableTransferMode;
  put(context: DragContext, sourceGroup: string): boolean;
  prepareCopy?: (context: CopyItemContext) => SortableId;
}

interface ScopeArea {
  element: Element;
  options: NormalizedAreaOptions;
  rawOptions: SortableAreaOptions;
  registered: RegisteredArea;
  disposeRegistry(): void;
  pointerDown: EventListener;
  hadAreaAttribute: boolean;
  areaAttribute: string | null;
  animator: SortableLayoutAnimator;
  disposed: boolean;
}

interface ActiveDrag {
  sourceArea: ScopeArea;
  sourceElement: Element;
  itemId: SortableId;
  sourceIndex: number;
  context: DragContext;
  feedback: SortableFeedback | null;
  lastRejection: 'disabled' | 'not-accepted' | 'nested-cycle' | null;
  overArea: ScopeArea | null;
  transferMode: false | SortableTransferMode;
}

interface LocatedDestination {
  area: ScopeArea;
  location: SortableLocation;
  before: Element | null;
}

interface Attempt {
  area: ScopeArea;
  sourceElement: Element;
  sensor: PointerSensor;
}

let scopeSequence = 0;

export function createSortableScope(
  options: SortableScopeOptions = {},
): SortableScope {
  return createScopeWithVerificationFrames(options, 1);
}

/** Internal adapter factory; framework renderers commit after the browser's next frame. */
export function createSortableScopeForFramework(
  options: SortableScopeOptions = {},
): SortableScope {
  return createScopeWithVerificationFrames(options, 2);
}

function createScopeWithVerificationFrames(
  options: SortableScopeOptions,
  verificationFrames: number,
): SortableScope {
  let internal: SortableScope | null = null;
  let destroyed = false;

  const requireInternal = (): SortableScope => {
    if (internal === null) {
      throw new SortableError('INVALID_ELEMENT');
    }
    return internal;
  };

  return {
    registerArea(element, areaOptions) {
      if (destroyed) {
        throw new SortableError('INVALID_OPTION');
      }
      if (internal !== null) {
        return internal.registerArea(element, areaOptions);
      }
      const candidate = createSortableScopeInternal(
        options,
        createBrowserPlatform(element),
        verificationFrames,
      );
      try {
        const unregister = candidate.registerArea(element, areaOptions);
        internal = candidate;
        return unregister;
      } catch (error) {
        candidate.destroy();
        throw error;
      }
    },
    updateArea(areaId, patch) {
      requireInternal().updateArea(areaId, patch);
    },
    refreshArea(areaId) {
      requireInternal().refreshArea?.(areaId);
    },
    cancel() {
      internal?.cancel();
    },
    destroy() {
      if (destroyed) {
        return;
      }
      destroyed = true;
      internal?.destroy();
      internal = null;
    },
  };
}

export function createSortableScopeInternal(
  options: SortableScopeOptions,
  platform: SortablePlatform,
  verificationFrames = 1,
): SortableScope {
  const defaultGroup = `comins-sortable-scope-${++scopeSequence}`;
  const registry = new AreaRegistry();
  const geometry = new GeometryCache();
  const session = new SessionMachine();
  const autoScroller = createAutoScroller(platform);
  const areas = new Map<string, ScopeArea>();
  let attempt: Attempt | null = null;
  let active: ActiveDrag | null = null;
  let verificationFrame: number | null = null;
  let autoScrollFrame: number | null = null;
  const geometryKeys = new WeakMap<Element, string>();
  let geometrySequence = 0;
  let destroyed = false;

  const geometryTarget = (element: Element): GeometryTarget => {
    let key = geometryKeys.get(element);
    if (key === undefined) {
      key = `element-${++geometrySequence}`;
      geometryKeys.set(element, key);
    }
    return { key, element };
  };

  const areaTargets = (area: ScopeArea): GeometryTarget[] => [
    geometryTarget(area.element),
    ...directItems(area).map(geometryTarget),
  ];

  const allTargets = (): GeometryTarget[] => [...areas.values()]
    .filter((area) => !area.disposed)
    .flatMap(areaTargets);

  const rectFor = (element: Element): RectSnapshot => {
    const target = geometryTarget(element);
    let rect = geometry.snapshot(target.key);
    if (rect === undefined) {
      geometry.refreshAtAreaEntry(target);
      rect = geometry.snapshot(target.key);
    }
    if (rect === undefined) {
      throw new SortableError('INVALID_ELEMENT');
    }
    return rect;
  };

  const invalidateTargets = (
    targets: readonly GeometryTarget[],
    reason: 'scroll' | 'framework' | 'placeholder',
  ): void => {
    const keys = targets.map((target) => target.key);
    if (reason === 'scroll') {
      geometry.invalidateForScroll(keys);
    } else if (reason === 'framework') {
      geometry.invalidateForFrameworkUpdate(keys);
    } else {
      geometry.invalidateForPlaceholderMove(keys);
    }
  };

  const report = (error: unknown): void => {
    if (options.onError === undefined) {
      platform.report(error);
      return;
    }
    try {
      options.onError(error);
    } catch (handlerError) {
      platform.report(handlerError);
    }
  };

  const stopAutoScroll = (): void => {
    if (autoScrollFrame === null) {
      return;
    }
    platform.cancelFrame(autoScrollFrame);
    autoScrollFrame = null;
  };

  const sensorPlatform: SortablePlatform = {
    document: platform.document,
    window: platform.window,
    elementsFromPoint: (x, y) => platform.elementsFromPoint(x, y),
    requestFrame: (callback) => platform.requestFrame(callback),
    cancelFrame: (id) => platform.cancelFrame(id),
    report,
  };

  const finish = (
    reason: AfterDragReason,
    change?: SortableChange,
    error?: unknown,
  ): void => {
    const finishing = active;
    if (finishing === null) {
      if (error !== undefined) {
        report(error);
      }
      return;
    }
    stopAutoScroll();
    active = null;
    geometry.clear();
    if (verificationFrame !== null) {
      platform.cancelFrame(verificationFrame);
      verificationFrame = null;
    }
    if (finishing.overArea !== null) {
      finishing.overArea.element.removeAttribute('data-comins-sortable-over');
    }
    const animatedAreas = new Set<ScopeArea>([
      finishing.sourceArea,
      ...(finishing.overArea === null ? [] : [finishing.overArea]),
    ]);
    if (reason === 'drop') {
      finishing.feedback?.destroy();
      for (const area of animatedAreas) area.animator.play();
    } else {
      finishing.feedback?.rollback();
      for (const area of animatedAreas) area.animator.cancel(true);
    }

    if (session.state.status === 'dragging') {
      session.cancel(reason);
      session.finish();
    } else if (
      session.state.status === 'committing'
      || session.state.status === 'cancelling'
    ) {
      session.finish();
    }

    const result: AfterDragResult = {
      status: resultStatus(reason),
      reason,
      ...(reason === 'drop' && change !== undefined ? { change } : {}),
    };
    try {
      options.onAfterDrag?.(result);
    } catch (afterError) {
      report(afterError);
    }
    if (error !== undefined) {
      report(error);
    }
  };

  const verifyCommit = (change: SortableChange): void => {
    const verifyAfter = (remainingFrames: number): void => {
      verificationFrame = platform.requestFrame(() => {
        if (remainingFrames > 1) {
          verifyAfter(remainingFrames - 1);
          return;
        }
        verificationFrame = null;
        try {
          const committed = change.orders.every((order) => arraysEqual(
            registry.itemIds(order.areaId),
            order.itemIds,
          ));
          finish(committed ? 'drop' : 'state-not-committed', change);
        } catch (error) {
          finish('error', undefined, error);
        }
      });
    };
    verifyAfter(verificationFrames);
  };

  const release = (): void => {
    stopAutoScroll();
    const dragging = active;
    if (dragging === null) {
      return;
    }
    const destination = dragging.context.destination;
    if (destination === null) {
      finish(dragging.lastRejection ?? 'outside');
      return;
    }

    try {
      const sourceIds = registry.itemIds(dragging.sourceArea.options.areaId);
      let change: SortableChange | null;
      if (destination.areaId === dragging.sourceArea.options.areaId) {
        change = buildReorderChange(
          sourceIds,
          { areaId: dragging.sourceArea.options.areaId, index: dragging.sourceIndex },
          destination,
        );
      } else if (dragging.transferMode === 'copy') {
        const destinationArea = areas.get(destination.areaId);
        const prepareCopy = dragging.sourceArea.options.prepareCopy;
        if (destinationArea === undefined || prepareCopy === undefined) {
          throw new SortableError('INVALID_OPTION');
        }
        const copyContext: CopyItemContext = {
          ...dragging.context,
          destination,
        };
        const copiedItemId = prepareCopy(copyContext);
        if (typeof copiedItemId !== 'string' && typeof copiedItemId !== 'number') {
          throw new SortableError('MISSING_ITEM_ID');
        }
        if (
          registry.hasItemIdInGroup(dragging.sourceArea.options.group, copiedItemId)
          || (
            destinationArea.options.group !== dragging.sourceArea.options.group
            && registry.hasItemIdInGroup(destinationArea.options.group, copiedItemId)
          )
        ) {
          throw new SortableError('DUPLICATE_ITEM_ID');
        }
        change = buildCopyChange(
          sourceIds,
          registry.itemIds(destination.areaId),
          { areaId: dragging.sourceArea.options.areaId, index: dragging.sourceIndex },
          destination,
          copiedItemId,
        );
      } else {
        change = buildTransferChange(
          sourceIds,
          registry.itemIds(destination.areaId),
          { areaId: dragging.sourceArea.options.areaId, index: dragging.sourceIndex },
          destination,
        );
      }
      if (change === null) {
        finish('drop');
        return;
      }
      session.commit(change);
      options.onChange?.(change);
      verifyCommit(change);
    } catch (error) {
      finish('error', undefined, error);
    }
  };

  const move = (pointer: PointerSnapshot): void => {
    stopAutoScroll();
    const dragging = active;
    if (dragging === null || session.state.status !== 'dragging') {
      return;
    }
    dragging.feedback?.move(pointer);
    const hits = platform.elementsFromPoint(pointer.clientX, pointer.clientY);
    const targets = allTargets();
    geometry.refreshDirty(targets);
    const scrolled = autoScroller.step({
      enabled: dragging.sourceArea.options.autoScroll,
      point: { x: pointer.clientX, y: pointer.clientY },
      hitChain: hits,
    });
    if (scrolled !== null) {
      const affected = scrolled === platform.window
        ? targets
        : targets.filter((target) => (
          target.element === scrolled
          || (scrolled as Element).contains(target.element)
        ));
      invalidateTargets(affected, 'scroll');
      for (const area of areas.values()) {
        if (affected.some((target) => target.element === area.element)) {
          area.animator.cancel(true);
        }
      }
      geometry.refreshDirty(affected);
      autoScrollFrame = platform.requestFrame(() => {
        autoScrollFrame = null;
        const current = active;
        if (current === null || session.state.status !== 'dragging') {
          return;
        }
        try {
          move(current.context.pointer);
        } catch (error) {
          if (attempt !== null) {
            attempt.sensor.cancel('error');
            report(error);
          } else {
            finish('error', undefined, error);
          }
        }
      });
    }
    for (const candidate of uniqueAreasFromHits(hits, registry, areas)) {
      if (candidate !== dragging.overArea) {
        for (const target of areaTargets(candidate)) {
          geometry.refreshAtAreaEntry(target);
        }
      }
    }
    const previousDestination = dragging.context.destination;
    const previousArea = dragging.overArea;
    const located = locateDestination(
      dragging,
      pointer,
      hits,
      areas,
      registry,
      rectFor,
    );
    dragging.lastRejection = located.rejection;
    dragging.context = {
      ...dragging.context,
      pointer,
      destination: located.destination?.location ?? null,
    };

    options.onDrag?.(dragging.context);
    if (!locationsEqual(previousDestination, dragging.context.destination)) {
      if (dragging.overArea !== null) {
        dragging.overArea.element.removeAttribute('data-comins-sortable-over');
      }
      dragging.overArea = located.destination?.area ?? null;
      if (located.destination !== undefined) {
        located.destination.area.element.setAttribute('data-comins-sortable-over', '');
        dragging.feedback?.place(
          located.destination.area.element,
          located.destination.before,
        );
        const affectedAreas = new Set<ScopeArea>([
          dragging.sourceArea,
          located.destination.area,
          ...(previousArea === null ? [] : [previousArea]),
        ]);
        invalidateTargets([...affectedAreas].flatMap(areaTargets), 'placeholder');
        for (const area of affectedAreas) area.animator.play();
        options.onInsertDragArea?.({
          ...dragging.context,
          previousDestination,
          destination: located.destination.location,
        });
      }
    }
  };

  const activate = (
    area: ScopeArea,
    sourceElement: Element,
    pointer: PointerSnapshot,
    afterSensor: (callback: (() => void) | null) => void,
  ): boolean => {
    try {
      registry.itemIds(area.options.areaId);
      const elements = directItems(area);
      const sourceIndex = elements.indexOf(sourceElement);
      if (sourceIndex === -1) {
        throw new SortableError('INVALID_ELEMENT');
      }
      const itemId = area.options.getItemId(sourceElement);
      if (itemId === undefined || itemId === null) {
        throw new SortableError('MISSING_ITEM_ID');
      }
      const context: DragContext = {
        itemId,
        source: { areaId: area.options.areaId, index: sourceIndex },
        destination: { areaId: area.options.areaId, index: sourceIndex },
        pointer,
      };
      const pendingState = session.state;
      if (pendingState.status !== 'pending') {
        throw new SortableError('INVALID_OPTION');
      }
      const activeSession: ActiveSession = {
        pointerId: pendingState.value.pointerId,
        pointerType: pointer.type,
        itemId,
        source: context.source,
        origin: pendingState.value.origin,
        pointer,
        destination: context.destination,
      };

      if (area.options.disabled) {
        session.activate(activeSession);
        active = {
          sourceArea: area,
          sourceElement,
          itemId,
          sourceIndex,
          context,
          feedback: null,
          lastRejection: 'disabled',
          overArea: null,
          transferMode: false,
        };
        afterSensor(() => finish('disabled'));
        return false;
      }

      let beforeResult: boolean | void;
      try {
        beforeResult = options.onBeforeDragStart?.(context);
      } catch (error) {
        session.abandon();
        afterSensor(() => report(error));
        return false;
      }
      if (beforeResult === false) {
        session.abandon();
        return false;
      }

      const transferMode = area.options.pull(context);
      if (
        transferMode !== false
        && transferMode !== 'move'
        && transferMode !== 'copy'
      ) {
        throw new SortableError('INVALID_OPTION');
      }

      const parent = sourceElement.parentElement;
      if (parent === null) {
        throw new SortableError('INVALID_ELEMENT');
      }
      geometry.clear();
      for (const candidate of areas.values()) candidate.animator.cancel(true);
      geometry.refreshAtActivation(allTargets());
      const feedback = createFeedback(sourceElement, platform);
      feedback.place(parent, sourceElement);
      active = {
        sourceArea: area,
        sourceElement,
        itemId,
        sourceIndex,
        context,
        feedback,
        lastRejection: null,
        overArea: area,
        transferMode,
      };
      area.element.setAttribute('data-comins-sortable-over', '');
      session.activate(activeSession);
      try {
        options.onDragStart?.(context);
      } catch (error) {
        afterSensor(() => finish('error', undefined, error));
        return false;
      }
      return true;
    } catch (error) {
      if (session.state.status === 'pending') {
        session.abandon();
        afterSensor(() => report(error));
        return false;
      }
      throw error;
    }
  };

  const startAttempt = (area: ScopeArea, event: PointerEvent): void => {
    if (destroyed || session.state.status !== 'idle') {
      return;
    }
    const target = asElement(event.target);
    if (target === null) {
      return;
    }
    const sourceElement = directItems(area).find((item) => (
      item === target || item.contains(target)
    )) ?? null;
    if (sourceElement === null) {
      return;
    }
    const elements = directItems(area);
    const sourceIndex = elements.indexOf(sourceElement);
    if (sourceIndex === -1) {
      return;
    }
    let itemId: SortableId;
    try {
      itemId = area.options.getItemId(sourceElement);
    } catch (error) {
      report(error);
      return;
    }
    if (itemId === undefined || itemId === null) {
      report(new SortableError('MISSING_ITEM_ID'));
      return;
    }
    const origin: PointerSnapshot = pointerSnapshot(event, event.clientX, event.clientY);
    const pending: PendingSession = {
      pointerId: event.pointerId,
      pointerType: origin.type,
      itemId,
      source: { areaId: area.options.areaId, index: sourceIndex },
      origin,
    };
    session.pending(pending);

    let afterSensorCallback: (() => void) | null = null;
    let sensor!: PointerSensor;
    sensor = createPointerSensor({
      activationDistance: area.options.activationDistance,
      platform: sensorPlatform,
      handle: area.options.handle,
      ignore: area.options.ignore,
      onActivate: (pointer) => activate(
        area,
        sourceElement as Element,
        pointer,
        (callback) => {
          afterSensorCallback = callback;
        },
      ),
      onMove: move,
      onCancel: (reason) => finish(reason),
      onRelease: release,
      onEnd: () => {
        if (attempt?.sensor === sensor) {
          attempt = null;
        }
        if (session.state.status === 'pending') {
          session.abandon();
        }
        const callback = afterSensorCallback;
        afterSensorCallback = null;
        callback?.();
      },
    });
    attempt = { area, sourceElement, sensor };
    if (!sensor.pointerDown(event, sourceElement)) {
      attempt = null;
      session.abandon();
    }
  };

  const registerArea = (
    element: Element,
    areaOptions: SortableAreaOptions,
  ): (() => void) => {
    if (destroyed) {
      throw new SortableError('INVALID_OPTION');
    }
    if (element.ownerDocument !== platform.document) {
      throw new SortableError('INVALID_ELEMENT');
    }
    const normalized = normalizeAreaOptions(areaOptions, defaultGroup);
    validateSelectors(element, normalized);
    const registered = registeredArea(element, normalized);
    const disposeRegistry = registry.register(registered);
    const hadAreaAttribute = element.hasAttribute('data-comins-sortable-area');
    const areaAttribute = element.getAttribute('data-comins-sortable-area');
    element.setAttribute('data-comins-sortable-area', normalized.areaId);
    const area: ScopeArea = {
      element,
      options: normalized,
      rawOptions: areaOptions,
      registered,
      disposeRegistry,
      pointerDown: (() => {}) as EventListener,
      hadAreaAttribute,
      areaAttribute,
      animator: createLayoutAnimator(
        element,
        normalized.item,
        normalized.animation,
        platform.window,
      ),
      disposed: false,
    };
    area.pointerDown = ((event: PointerEvent) => startAttempt(area, event)) as EventListener;
    element.addEventListener('pointerdown', area.pointerDown);
    areas.set(normalized.areaId, area);

    return () => {
      if (area.disposed) {
        return;
      }
      area.disposed = true;
      const endsDrag = (
        attempt?.area === area
        || active?.sourceArea === area
        || active?.context.destination?.areaId === normalized.areaId
      );
      if (endsDrag) {
        if (attempt !== null) {
          attempt.sensor.unmount();
        } else {
          finish('unmounted');
        }
      }
      element.removeEventListener('pointerdown', area.pointerDown);
      area.animator.destroy();
      area.disposeRegistry();
      if (areas.get(normalized.areaId) === area) {
        areas.delete(normalized.areaId);
      }
      if (hadAreaAttribute) {
        element.setAttribute('data-comins-sortable-area', areaAttribute ?? '');
      } else {
        element.removeAttribute('data-comins-sortable-area');
      }
    };
  };

  return {
    registerArea,
    updateArea(areaId, patch) {
      const area = areas.get(areaId);
      if (area === undefined || area.disposed) {
        throw new SortableError('INVALID_ELEMENT');
      }
      const nextRaw: SortableAreaOptions = {
        ...area.rawOptions,
        ...patch,
        areaId,
      };
      const next = normalizeAreaOptions(nextRaw, defaultGroup);
      validateSelectors(area.element, next);
      const nextRegistered = registeredArea(area.element, next);
      area.disposeRegistry();
      try {
        area.disposeRegistry = registry.register(nextRegistered);
      } catch (error) {
        area.disposeRegistry = registry.register(area.registered);
        throw error;
      }
      area.options = next;
      area.rawOptions = nextRaw;
      area.registered = nextRegistered;
      area.animator.update(next.item, next.animation);
      invalidateTargets(areaTargets(area), 'framework');
      const disablesDrag = (
        next.disabled
        && (
          active?.sourceArea === area
          || active?.context.destination?.areaId === areaId
        )
      );
      if (disablesDrag) {
        if (attempt !== null) {
          attempt.sensor.cancel('disabled');
        } else {
          finish('disabled');
        }
      }
    },
    refreshArea(areaId) {
      const area = areas.get(areaId);
      if (area === undefined || area.disposed) {
        throw new SortableError('INVALID_ELEMENT');
      }
      area.animator.play();
      invalidateTargets(areaTargets(area), 'framework');
    },
    cancel() {
      if (attempt !== null) {
        attempt.sensor.cancel('escape');
      } else if (active !== null) {
        finish('escape');
      }
    },
    destroy() {
      if (destroyed) {
        return;
      }
      destroyed = true;
      if (attempt !== null) {
        attempt.sensor.destroy();
      } else if (active !== null) {
        finish('destroyed');
      }
      for (const area of [...areas.values()]) {
        elementDispose(area);
      }
      areas.clear();
    },
  };

  function elementDispose(area: ScopeArea): void {
    if (area.disposed) {
      return;
    }
    area.disposed = true;
    area.element.removeEventListener('pointerdown', area.pointerDown);
    area.animator.destroy();
    area.disposeRegistry();
    if (area.hadAreaAttribute) {
      area.element.setAttribute(
        'data-comins-sortable-area',
        area.areaAttribute ?? '',
      );
    } else {
      area.element.removeAttribute('data-comins-sortable-area');
    }
  }
}

function normalizeAreaOptions(
  options: SortableAreaOptions,
  defaultGroup: string,
): NormalizedAreaOptions {
  if (typeof options.areaId !== 'string' || options.areaId.length === 0) {
    throw new SortableError('INVALID_OPTION');
  }
  if (typeof options.item !== 'string' || options.item.length === 0) {
    throw new SortableError('INVALID_OPTION');
  }
  const direction = options.direction ?? 'auto';
  if (direction !== 'vertical' && direction !== 'horizontal' && direction !== 'auto') {
    throw new SortableError('INVALID_OPTION');
  }
  const activationDistance = finiteNonNegative(options.activationDistance ?? 4);
  const emptyInsertThreshold = finiteNonNegative(options.emptyInsertThreshold ?? 8);
  const animation = normalizeAnimation(options.animation) ?? false;
  const getItemId = options.getItemId ?? ((element: Element) => (
    element.getAttribute('data-sortable-id') as SortableId
  ));
  const group = normalizeGroup(options.group, defaultGroup);

  return {
    areaId: options.areaId,
    group: group.name,
    item: options.item,
    getItemId,
    direction,
    disabled: options.disabled ?? false,
    ...(options.handle === undefined ? {} : { handle: options.handle }),
    ignore: options.ignore ?? DEFAULT_IGNORE_SELECTOR,
    activationDistance,
    emptyInsertThreshold,
    autoScroll: options.autoScroll ?? true,
    animation,
    ...(options.parent === undefined ? {} : { parent: normalizeParent(options.parent) }),
    accept: options.accept ?? (() => true),
    pull: group.pull,
    put: group.put,
    ...(options.prepareCopy === undefined ? {} : { prepareCopy: options.prepareCopy }),
  };
}

function normalizeParent(parent: SortableParentLocation): SortableParentLocation {
  if (
    typeof parent !== 'object'
    || parent === null
    || typeof parent.areaId !== 'string'
    || parent.areaId.length === 0
    || (typeof parent.itemId !== 'string' && typeof parent.itemId !== 'number')
  ) {
    throw new SortableError('INVALID_OPTION');
  }
  return { areaId: parent.areaId, itemId: parent.itemId };
}

function normalizeGroup(
  group: SortableAreaOptions['group'],
  defaultGroup: string,
): Pick<NormalizedAreaOptions, 'pull' | 'put'> & { name: string } {
  if (group === undefined || typeof group === 'string') {
    const name = group ?? defaultGroup;
    if (name.length === 0) {
      throw new SortableError('INVALID_OPTION');
    }
    return {
      name,
      pull: () => 'move',
      put: (_context, sourceGroup) => sourceGroup === name,
    };
  }
  if (
    typeof group !== 'object'
    || group === null
    || typeof group.name !== 'string'
    || group.name.length === 0
  ) {
    throw new SortableError('INVALID_OPTION');
  }

  const pull = group.pull ?? 'move';
  if (
    pull !== false
    && pull !== 'move'
    && pull !== 'copy'
    && typeof pull !== 'function'
  ) {
    throw new SortableError('INVALID_OPTION');
  }
  const put = group.put ?? [group.name];
  if (
    typeof put !== 'boolean'
    && typeof put !== 'function'
    && !(
      Array.isArray(put)
      && put.every((name) => typeof name === 'string' && name.length > 0)
    )
  ) {
    throw new SortableError('INVALID_OPTION');
  }

  return {
    name: group.name,
    pull: typeof pull === 'function' ? pull : () => pull,
    put: typeof put === 'function'
      ? (context) => put(context)
      : typeof put === 'boolean'
        ? () => put
        : (_context, sourceGroup) => put.includes(sourceGroup),
  };
}

function finiteNonNegative(value: number): number {
  if (!Number.isFinite(value) || value < 0) {
    throw new SortableError('INVALID_OPTION');
  }
  return value;
}

function validateSelectors(
  element: Element,
  options: NormalizedAreaOptions,
): void {
  for (const selector of [options.item, options.handle, options.ignore]) {
    if (selector === undefined) {
      continue;
    }
    try {
      element.matches(selector);
    } catch {
      throw new SortableError('INVALID_OPTION');
    }
  }
}

function registeredArea(
  element: Element,
  options: NormalizedAreaOptions,
): RegisteredArea {
  return {
    element,
    areaId: options.areaId,
    group: options.group,
    direction: options.direction,
    disabled: options.disabled,
    itemSelector: options.item,
    getItemId: options.getItemId,
    accept: options.accept,
  };
}

function directItems(area: ScopeArea): Element[] {
  return Array.from(area.element.querySelectorAll(area.options.item)).filter(
    (element) => (
      element.parentElement === area.element
      && !element.hasAttribute('data-comins-sortable-placeholder')
    ),
  );
}

function locateDestination(
  dragging: ActiveDrag,
  pointer: PointerSnapshot,
  hits: readonly Element[],
  areas: ReadonlyMap<string, ScopeArea>,
  registry: AreaRegistry,
  rectFor: (element: Element) => RectSnapshot,
): {
  destination?: LocatedDestination;
  rejection: 'disabled' | 'not-accepted' | 'nested-cycle' | null;
} {
  const context = { ...dragging.context, pointer };
  const directAreas = uniqueAreasFromHits(hits, registry, areas);
  const acceptance = new Map<ScopeArea, boolean>();
  const destinations = new Map<ScopeArea, LocatedDestination>();
  const destinationFor = (area: ScopeArea): LocatedDestination => {
    const cached = destinations.get(area);
    if (cached !== undefined) {
      return cached;
    }
    const elements = itemElements(area, dragging.sourceElement);
    const itemGeometry = elements.map((element) => ({
      element,
      geometry: {
        id: area.options.getItemId(element),
        rect: rectFor(element),
      } satisfies ItemGeometry,
    }));
    const direction = resolveDirection(
      area.options.direction,
      itemGeometry.map((entry) => entry.geometry),
    );
    const index = insertionIndex({
      pointer: { x: pointer.clientX, y: pointer.clientY },
      direction,
      items: itemGeometry.map((entry) => entry.geometry),
    });
    const destination: LocatedDestination = {
      area,
      location: { areaId: area.options.areaId, index },
      before: itemGeometry[index]?.element ?? null,
    };
    destinations.set(area, destination);
    return destination;
  };
  const acceptsArea = (area: ScopeArea): boolean => {
    const cached = acceptance.get(area);
    if (cached !== undefined || acceptance.has(area)) {
      return cached as boolean;
    }
    const candidate = destinationFor(area);
    const candidateContext: DragContext = {
      ...context,
      destination: candidate.location,
    };
    const sameArea = area === dragging.sourceArea;
    const accepted = (
      sameArea
      || (
        dragging.transferMode !== false
        && area.options.put(candidateContext, dragging.sourceArea.options.group)
      )
    ) && area.options.accept(candidateContext);
    acceptance.set(area, accepted);
    return accepted;
  };
  let rejection: 'disabled' | 'not-accepted' | 'nested-cycle' | null = null;
  for (const area of directAreas) {
    if (createsNestedCycle(dragging, area, areas)) {
      return { rejection: 'nested-cycle' };
    }
    if (area.options.disabled) {
      rejection = 'disabled';
      break;
    }
    if (!acceptsArea(area)) {
      rejection = 'not-accepted';
      break;
    }
  }

  const directGeometries = directAreas.map((area) => areaGeometry(
    area,
    rectFor,
    () => acceptsArea(area),
  ));
  const groupAreas = [...areas.values()].filter((area) => !area.disposed);
  const emptyGeometries = groupAreas
    .filter((area) => itemElements(area, dragging.sourceElement).length === 0)
    .map((area) => areaGeometry(area, rectFor, () => acceptsArea(area)));
  const area = findAreaAtPoint({
    point: { x: pointer.clientX, y: pointer.clientY },
    directHits: directGeometries,
    emptyAreas: emptyGeometries,
    emptyInsertThreshold: 0,
    sourceGroup: dragging.sourceArea.options.group,
    context,
    acceptsGroup: () => true,
  });
  if (area === undefined) {
    return { rejection };
  }
  const scopeArea = areas.get(area.areaId);
  if (scopeArea === undefined) {
    return { rejection };
  }
  return {
    rejection: null,
    destination: destinationFor(scopeArea),
  };
}

function createsNestedCycle(
  dragging: ActiveDrag,
  destination: ScopeArea,
  areas: ReadonlyMap<string, ScopeArea>,
): boolean {
  let parent = destination.options.parent;
  const visited = new Set<string>();
  while (parent !== undefined) {
    if (
      parent.areaId === dragging.sourceArea.options.areaId
      && parent.itemId === dragging.itemId
    ) {
      return true;
    }
    if (visited.has(parent.areaId)) return true;
    visited.add(parent.areaId);
    parent = areas.get(parent.areaId)?.options.parent;
  }
  return false;
}

function uniqueAreasFromHits(
  hits: readonly Element[],
  registry: AreaRegistry,
  areas: ReadonlyMap<string, ScopeArea>,
): ScopeArea[] {
  const result: ScopeArea[] = [];
  const seen = new Set<string>();
  for (const hit of hits) {
    let current: Element | null = hit;
    while (current !== null) {
      const registered = registry.getByElement(current);
      if (registered !== undefined && !seen.has(registered.areaId)) {
        seen.add(registered.areaId);
        const area = areas.get(registered.areaId);
        if (area !== undefined) {
          result.push(area);
        }
        break;
      }
      current = current.parentElement;
    }
  }
  return result;
}

function areaGeometry(
  area: ScopeArea,
  rectFor: (element: Element) => RectSnapshot,
  accept: (context: DragContext) => boolean = area.options.accept,
): AreaGeometry {
  return {
    areaId: area.options.areaId,
    group: area.options.group,
    direction: resolveDirection(area.options.direction, []),
    disabled: area.options.disabled,
    accept,
    depth: elementDepth(area.element),
    rect: rectFor(area.element),
    emptyInsertThreshold: area.options.emptyInsertThreshold,
  };
}

function elementDepth(element: Element): number {
  let depth = 0;
  let current = element.parentElement;
  while (current !== null) {
    depth += 1;
    current = current.parentElement;
  }
  return depth;
}

function itemElements(area: ScopeArea, source: Element): Element[] {
  return directItems(area).filter((element) => element !== source);
}

function pointerSnapshot(
  input: PointerInput,
  originX: number,
  originY: number,
): PointerSnapshot {
  const type = input.pointerType === 'touch' || input.pointerType === 'pen'
    ? input.pointerType
    : 'mouse';
  return {
    type,
    clientX: input.clientX,
    clientY: input.clientY,
    deltaX: input.clientX - originX,
    deltaY: input.clientY - originY,
    altKey: input.altKey === true,
    ctrlKey: input.ctrlKey === true,
    metaKey: input.metaKey === true,
    shiftKey: input.shiftKey === true,
  };
}

function asElement(value: EventTarget | null): Element | null {
  return typeof value === 'object'
    && value !== null
    && 'closest' in value
    && typeof value.closest === 'function'
    ? value as Element
    : null;
}

function locationsEqual(
  left: SortableLocation | null,
  right: SortableLocation | null,
): boolean {
  return left?.areaId === right?.areaId && left?.index === right?.index;
}

function arraysEqual(
  left: readonly SortableId[],
  right: readonly SortableId[],
): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function resultStatus(reason: AfterDragReason): AfterDragResult['status'] {
  if (reason === 'drop') {
    return 'dropped';
  }
  return reason === 'disabled'
    || reason === 'not-accepted'
    || reason === 'nested-cycle'
    || reason === 'state-not-committed'
    ? 'rejected'
    : 'cancelled';
}
