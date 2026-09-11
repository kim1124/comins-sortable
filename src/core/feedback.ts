import { SortableError } from './errors.js';
import type { PointerSnapshot, SortablePlaceholderOptions } from './model.js';
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
  move(pointer: PointerSnapshot): void;
  place(parent: Element, before: Element | null): void;
  clear(): void;
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
): SortableFeedback {
  void platform;
  const styledSource = asStyledElement(source);
  const detachedPreview = mode === 'copy' || isTableLayoutItem(source);
  const dragElement = detachedPreview ? createDragPreview(source) : source;
  const previewParent = detachedPreview ? source.ownerDocument.body : null;
  if (detachedPreview && previewParent === null) {
    throw new SortableError('INVALID_ELEMENT');
  }
  const styledDragElement = asStyledElement(dragElement);
  const placeholder = source.ownerDocument.createElement(source.tagName);
  const styledPlaceholder = asStyledElement(placeholder);
  const rect = source.getBoundingClientRect();
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
  styledPlaceholder.style.boxSizing = 'border-box';
  styledPlaceholder.style.width = `${rect.width}px`;
  styledPlaceholder.style.height = `${rect.height}px`;

  if (detachedPreview && mode === 'move') {
    styledSource.style.display = 'none';
  }

  dragElement.setAttribute('data-comins-sortable-dragging', '');
  styledDragElement.style.boxSizing = 'border-box';
  styledDragElement.style.width = `${rect.width}px`;
  styledDragElement.style.height = `${rect.height}px`;
  styledDragElement.style.left = `${rect.left}px`;
  styledDragElement.style.top = `${rect.top}px`;
  styledDragElement.style.margin = '0';
  styledDragElement.style.pointerEvents = 'none';
  styledDragElement.style.position = 'fixed';
  styledDragElement.style.transform = 'translate(0px, 0px)';
  styledDragElement.style.transition = 'none';
  styledDragElement.style.zIndex = '2147483647';
  if (detachedPreview) {
    previewParent?.appendChild(dragElement);
  }

  const destroy = (): void => {
    if (disposed) {
      return;
    }
    disposed = true;
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
  };

  return {
    placeholder,
    move(pointer) {
      styledDragElement.style.transform = `translate(${pointer.deltaX}px, ${pointer.deltaY}px)`;
    },
    place(parent, before) {
      parent.insertBefore(placeholder, before);
    },
    clear() {
      placeholder.remove();
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
