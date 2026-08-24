import { SortableError } from './errors.js';
import type { PointerSnapshot } from './model.js';
import type { SortablePlatform } from './platform.js';

const FEEDBACK_PROPERTIES = [
  'boxSizing',
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
  rollback(): void;
  destroy(): void;
}

interface StyledElement extends Element {
  style: CSSStyleDeclaration;
}

export function createFeedback(
  source: Element,
  platform: SortablePlatform,
): SortableFeedback {
  void platform;
  const styledSource = asStyledElement(source);
  const placeholder = source.ownerDocument.createElement(source.tagName);
  const styledPlaceholder = asStyledElement(placeholder);
  const rect = source.getBoundingClientRect();
  const originalStyles = Object.fromEntries(
    FEEDBACK_PROPERTIES.map((property) => [property, styledSource.style[property]]),
  ) as Record<FeedbackProperty, string>;
  const hadDraggingAttribute = source.hasAttribute('data-comins-sortable-dragging');
  const draggingAttribute = source.getAttribute('data-comins-sortable-dragging');
  const originalParent = source.parentElement;
  const originalNext = source.nextSibling;
  const activeElement = source.ownerDocument.activeElement;
  const focusTarget = activeElement !== null && source.contains(activeElement)
    ? activeElement
    : null;
  let disposed = false;

  placeholder.classList.add('comins-sortable__placeholder');
  placeholder.setAttribute('data-comins-sortable-placeholder', '');
  placeholder.setAttribute('aria-hidden', 'true');
  styledPlaceholder.style.boxSizing = 'border-box';
  styledPlaceholder.style.width = `${rect.width}px`;
  styledPlaceholder.style.height = `${rect.height}px`;

  source.setAttribute('data-comins-sortable-dragging', '');
  styledSource.style.boxSizing = 'border-box';
  styledSource.style.width = `${rect.width}px`;
  styledSource.style.height = `${rect.height}px`;
  styledSource.style.left = `${rect.left}px`;
  styledSource.style.top = `${rect.top}px`;
  styledSource.style.margin = '0';
  styledSource.style.pointerEvents = 'none';
  styledSource.style.position = 'fixed';
  styledSource.style.transform = 'translate(0px, 0px)';
  styledSource.style.transition = 'none';
  styledSource.style.zIndex = '2147483647';

  const destroy = (): void => {
    if (disposed) {
      return;
    }
    disposed = true;
    placeholder.remove();
    for (const property of FEEDBACK_PROPERTIES) {
      styledSource.style[property] = originalStyles[property];
    }
    if (hadDraggingAttribute) {
      source.setAttribute('data-comins-sortable-dragging', draggingAttribute ?? '');
    } else {
      source.removeAttribute('data-comins-sortable-dragging');
    }
    if (isFocusable(focusTarget)) {
      focusTarget.focus();
    }
  };

  return {
    placeholder,
    move(pointer) {
      styledSource.style.transform = `translate(${pointer.deltaX}px, ${pointer.deltaY}px)`;
    },
    place(parent, before) {
      parent.insertBefore(placeholder, before);
    },
    rollback() {
      if (originalParent !== null) {
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

function asStyledElement(element: Element): StyledElement {
  if (!('style' in element)) {
    throw new SortableError('INVALID_ELEMENT');
  }
  return element as StyledElement;
}

function isFocusable(element: Element | null): element is Element & { focus(): void } {
  return element !== null && 'focus' in element && typeof element.focus === 'function';
}
