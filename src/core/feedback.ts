import { SortableError } from './errors.js';
import { fixedFeedbackLayout, fixedFeedbackMover } from './feedback-position.js';
import type {
  PointerSnapshot,
  SortablePlaceholderOptions,
  SortableDragOverlayOptions,
  SortableFeedbackContext,
  SortableFeedbackHandle,
  SortableFeedbackRenderer,
} from './model.js';
import type { SortablePlatform } from './platform.js';

const FEEDBACK_PROPERTIES = [
  'boxSizing',
  'display',
  'height',
  'left',
  'margin',
  'pointerEvents',
  'position',
  'top',
  'transform',
  'transition',
  'width',
  'zIndex',
] as const;

type FeedbackProperty = (typeof FEEDBACK_PROPERTIES)[number];

export interface SortableFeedback {
  readonly placeholder: Element;
  render(): void;
  update?(context: Omit<SortableFeedbackContext, 'container'>): void;
  move(pointer: PointerSnapshot): void;
  place(parent: Element, before: Element | null): void;
  clear(): void;
  setVisible(visible: boolean): void;
  setRejection(reason: 'disabled' | 'not-accepted' | 'nested-cycle' | null): void;
  rollback(): void;
  destroy(): void;
}

interface StyledElement extends Element {
  style: CSSStyleDeclaration;
}

export function createFeedback(
  source: Element,
  platform: SortablePlatform,
  options: SortablePlaceholderOptions = {},
  mode: 'move' | 'copy' = 'move',
  rendering?: { overlay?: SortableDragOverlayOptions; context: Omit<SortableFeedbackContext, 'container'> },
): SortableFeedback {
  const styledSource = asStyledElement(source);
  const overlayRenderer = rendering?.overlay?.render;
  if (isTableLayoutItem(source) && (options.render !== undefined || overlayRenderer !== undefined)) {
    throw new SortableError('INVALID_OPTION');
  }
  const detachedPreview = overlayRenderer !== undefined || mode === 'copy' || isTableLayoutItem(source);
  const dragElement = overlayRenderer !== undefined
    ? source.ownerDocument.createElement('div')
    : detachedPreview ? createDragPreview(source) : source;
  const previewParent = detachedPreview ? source.ownerDocument.body : null;
  if (detachedPreview && previewParent === null) {
    throw new SortableError('INVALID_ELEMENT');
  }
  const styledDragElement = asStyledElement(dragElement);
  const placeholder = source.ownerDocument.createElement(source.tagName);
  const styledPlaceholder = asStyledElement(placeholder);
  const rect = source.getBoundingClientRect();
  const fixedLayout = fixedFeedbackLayout(source, previewParent ?? source.parentElement, platform.window);
  const width = fixedLayout?.width || rect.width;
  const height = fixedLayout?.height || rect.height;
  const originalStyles = Object.fromEntries(
    FEEDBACK_PROPERTIES.map((property) => [property, styledSource.style[property]]),
  ) as Record<FeedbackProperty, string>;
  const hadDraggingAttribute = source.hasAttribute('data-comins-sortable-dragging');
  const draggingAttribute = source.getAttribute('data-comins-sortable-dragging');
  const hadRejectionAttribute = source.hasAttribute('data-comins-sortable-rejection');
  const rejectionAttribute = source.getAttribute('data-comins-sortable-rejection');
  const originalParent = source.parentElement;
  const originalNext = source.nextSibling;
  const activeElement = source.ownerDocument.activeElement;
  const focusTarget = activeElement !== null && source.contains(activeElement)
    ? activeElement
    : null;
  let disposed = false;

  placeholder.classList.add('comins-sortable__placeholder');
  for (const className of placeholderClassNames(options.className)) {
    placeholder.classList.add(className);
  }
  placeholder.setAttribute('data-comins-sortable-placeholder', '');
  placeholder.setAttribute(
    'data-comins-sortable-placeholder-preset',
    options.preset ?? 'default',
  );
  placeholder.setAttribute('aria-hidden', 'true');
  placeholder.setAttribute('inert', '');
  styledPlaceholder.style.pointerEvents = 'none';
  styledPlaceholder.style.boxSizing = 'border-box';
  styledPlaceholder.style.width = `${width}px`;
  styledPlaceholder.style.height = `${height}px`;

  if (detachedPreview && mode === 'move') {
    styledSource.style.display = 'none';
  }

  if (overlayRenderer !== undefined) {
    dragElement.setAttribute('data-comins-sortable-overlay', '');
    dragElement.setAttribute('aria-hidden', 'true');
    dragElement.setAttribute('inert', '');
  }
  dragElement.setAttribute('data-comins-sortable-dragging', '');
  styledDragElement.style.boxSizing = 'border-box';
  styledDragElement.style.width = `${detachedPreview ? rect.width : width}px`;
  styledDragElement.style.height = `${detachedPreview ? rect.height : height}px`;
  styledDragElement.style.left = `${rect.left}px`;
  styledDragElement.style.top = `${rect.top}px`;
  styledDragElement.style.margin = '0';
  styledDragElement.style.pointerEvents = 'none';
  styledDragElement.style.position = 'fixed';
  styledDragElement.style.transform = 'translate(0px, 0px)';
  styledDragElement.style.transition = 'none';
  styledDragElement.style.zIndex = '2147483647';
  if (detachedPreview) {
    // The snapshot is already in viewport units; inherited min/max sizes must
    // not resize a preview detached from a scaled source container.
    styledDragElement.style.minWidth = '0';
    styledDragElement.style.minHeight = '0';
    styledDragElement.style.maxWidth = 'none';
    styledDragElement.style.maxHeight = 'none';
    previewParent?.appendChild(dragElement);
  }

  const moveFixed = fixedLayout === null ? null : fixedFeedbackMover(styledDragElement, rect, detachedPreview);

  const renderers: Array<{ render: SortableFeedbackRenderer; container: HTMLElement; handle?: SortableFeedbackHandle }> = [];
  const addRenderer = (host: Element, render: SortableFeedbackRenderer | undefined): void => {
    if (render === undefined) return;
    const container = source.ownerDocument.createElement('div');
    host.appendChild(container);
    renderers.push({ render, container });
  };
  addRenderer(placeholder, options.render);
  addRenderer(dragElement, overlayRenderer);
  let currentContext = rendering?.context;
  let rendered = false;
  const contextFor = (container: HTMLElement): SortableFeedbackContext => {
    if (currentContext === undefined) throw new SortableError('INVALID_OPTION');
    return Object.freeze({
      ...currentContext,
      container,
      itemIds: Object.freeze([...currentContext.itemIds]),
      source: Object.freeze({ ...currentContext.source }),
      destination: currentContext.destination === null ? null : Object.freeze({ ...currentContext.destination }),
    });
  };

  const destroy = (): void => {
    if (disposed) {
      return;
    }
    disposed = true;
    const errors: unknown[] = [];
    // Mark disposed before consumer callbacks so cancel/destroy can safely reenter.
    for (const renderer of renderers) {
      try { renderer.handle?.destroy(); } catch (error) { errors.push(error); }
      renderer.handle = undefined;
    }
    placeholder.remove();
    if (detachedPreview) {
      dragElement.remove();
    }
    if (mode === 'move') {
      for (const property of FEEDBACK_PROPERTIES) {
        styledSource.style[property] = originalStyles[property];
      }
      if (hadDraggingAttribute) {
        source.setAttribute('data-comins-sortable-dragging', draggingAttribute ?? '');
      } else {
        source.removeAttribute('data-comins-sortable-dragging');
      }
      if (hadRejectionAttribute) {
        source.setAttribute('data-comins-sortable-rejection', rejectionAttribute ?? '');
      } else {
        source.removeAttribute('data-comins-sortable-rejection');
      }
    }
    if (isFocusable(focusTarget)) {
      focusTarget.focus();
    }
    if (errors.length > 0) throw errors[0];
  };

  return {
    placeholder,
    render() {
      if (disposed || rendered) return;
      rendered = true;
      for (const renderer of renderers) {
        if (disposed) break;
        const handle = renderer.render(contextFor(renderer.container));
        if (handle !== undefined && (
          typeof handle !== 'object' || handle === null || 'then' in handle
          || typeof handle.destroy !== 'function'
          || (handle.update !== undefined && typeof handle.update !== 'function')
        )) throw new SortableError('INVALID_OPTION');
        // A renderer may cancel synchronously before its handle is returned.
        if (disposed) handle?.destroy();
        else renderer.handle = handle || undefined;
      }
    },
    update: renderers.length === 0 ? undefined : (context) => {
      if (disposed) return;
      const previous = currentContext;
      currentContext = context;
      if (previous?.destination?.areaId === context.destination?.areaId
        && previous?.destination?.index === context.destination?.index
        && previous?.rejection === context.rejection) return;
      for (const renderer of renderers) {
        if (disposed) break;
        renderer.handle?.update?.(contextFor(renderer.container));
      }
    },
    move(pointer) {
      if (moveFixed !== null) moveFixed(pointer.deltaX, pointer.deltaY);
      else styledDragElement.style.transform = `translate(${pointer.deltaX}px, ${pointer.deltaY}px)`;
    },
    place(parent, before) {
      parent.insertBefore(placeholder, before);
    },
    clear() {
      placeholder.remove();
    },
    setVisible(visible) {
      // Keep the spacer in flow so leaving a scroll edge cannot shrink its range.
      styledPlaceholder.style.visibility = visible ? '' : 'hidden';
    },
    setRejection(reason) {
      if (reason !== null) {
        dragElement.setAttribute('data-comins-sortable-rejection', reason);
      } else if (hadRejectionAttribute) {
        dragElement.setAttribute('data-comins-sortable-rejection', rejectionAttribute ?? '');
      } else {
        dragElement.removeAttribute('data-comins-sortable-rejection');
      }
    },
    rollback() {
      if (mode === 'move' && originalParent !== null) {
        const before = originalNext !== null && originalNext.parentNode === originalParent
          ? originalNext
          : null;
        originalParent.insertBefore(source, before);
      }
      destroy();
    },
    destroy,
  };
}

function createDragPreview(source: Element): Element {
  const preview = source.cloneNode(true) as Element;
  sanitizeDragPreview(preview);
  preview.setAttribute('aria-hidden', 'true');
  preview.setAttribute('inert', '');
  return preview;
}

function isTableLayoutItem(source: Element): boolean {
  return source.tagName === 'TR' || source.tagName === 'TH' || source.tagName === 'TD';
}

function sanitizeDragPreview(element: Element): void {
  element.removeAttribute('id');
  element.removeAttribute('data-comins-sortable-item');
  element.removeAttribute('data-sortable-id');
  element.removeAttribute('data-comins-sortable-rejection');
  for (const child of Array.from(element.children)) {
    sanitizeDragPreview(child);
  }
}

function placeholderClassNames(className: string | undefined): readonly string[] {
  return className === undefined ? [] : className.trim().split(/\s+/).filter(Boolean);
}

function asStyledElement(element: Element): StyledElement {
  if (!('style' in element)) {
    throw new SortableError('INVALID_ELEMENT');
  }
  return element as StyledElement;
}

function isFocusable(element: Element | null): element is Element & { focus(): void } {
  return element !== null && 'focus' in element && typeof element.focus === 'function';
}
