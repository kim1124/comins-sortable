import type { RectSnapshot } from './geometry.js';

interface PositionedElement extends Element {
  style: CSSStyleDeclaration;
}

export interface FixedFeedbackLayout {
  width: number;
  height: number;
}

// A transformed/contained ancestor makes fixed coordinates local instead of viewport-based.
export function fixedFeedbackLayout(
  source: Element,
  parent: Element | null,
  window: Window,
): FixedFeedbackLayout | null {
  let contained = false;
  for (let ancestor = parent; ancestor !== null; ancestor = ancestor.parentElement) {
    const style = window.getComputedStyle(ancestor);
    if ([style.transform, style.perspective, style.filter, style.backdropFilter].some(nonNone)
      || /(?:layout|paint|strict|content)/.test(style.contain ?? '')
      || /(?:transform|perspective|filter)/.test(style.willChange ?? '')
      || style.contentVisibility === 'auto') {
      contained = true;
      break;
    }
  }
  if (!contained) return null;
  const style = window.getComputedStyle(source);
  const extraWidth = style.boxSizing === 'border-box' ? 0
    : pixels(style.paddingLeft) + pixels(style.paddingRight)
      + pixels(style.borderLeftWidth) + pixels(style.borderRightWidth);
  const extraHeight = style.boxSizing === 'border-box' ? 0
    : pixels(style.paddingTop) + pixels(style.paddingBottom)
      + pixels(style.borderTopWidth) + pixels(style.borderBottomWidth);
  return { width: pixels(style.width) + extraWidth, height: pixels(style.height) + extraHeight };
}

export function fixedFeedbackMover(
  element: PositionedElement,
  viewport: RectSnapshot,
  fitViewportSize = false,
): (deltaX: number, deltaY: number) => void {
  const left = pixels(element.style.left);
  const top = pixels(element.style.top);
  const origin = element.getBoundingClientRect();
  // Probe the actual CSS coordinate basis, including transform origins, nested
  // transforms and borders. This avoids rebuilding the browser's transform tree.
  element.style.left = `${left + 100}px`;
  const x = element.getBoundingClientRect();
  element.style.left = `${left}px`;
  element.style.top = `${top + 100}px`;
  const y = element.getBoundingClientRect();
  element.style.top = `${top}px`;
  const a = (x.left - origin.left) / 100;
  const b = (x.top - origin.top) / 100;
  const c = (y.left - origin.left) / 100;
  const d = (y.top - origin.top) / 100;
  if (fitViewportSize) {
    // A detached preview belongs to its own parent coordinate system, not the
    // source's nested scale. Fit its axis-aligned viewport bounds in that basis.
    const sizeDeterminant = Math.abs(a) * Math.abs(d) - Math.abs(b) * Math.abs(c);
    if (Math.abs(sizeDeterminant) > 1e-8) {
      const width = (Math.abs(d) * viewport.width - Math.abs(c) * viewport.height) / sizeDeterminant;
      const height = (Math.abs(a) * viewport.height - Math.abs(b) * viewport.width) / sizeDeterminant;
      if (Number.isFinite(width) && Number.isFinite(height) && width > 0 && height > 0) {
        element.style.width = `${width}px`;
        element.style.height = `${height}px`;
      }
    }
  }
  const determinant = a * d - b * c;
  const local = (dx: number, dy: number): [number, number] => (
    Math.abs(determinant) < 1e-8 ? [dx, dy]
      : [(d * dx - c * dy) / determinant, (a * dy - b * dx) / determinant]
  );
  const move = (deltaX: number, deltaY: number): void => {
    const [dx, dy] = local(deltaX, deltaY);
    element.style.transform = `translate(${dx}px, ${dy}px)`;
    const actual = element.getBoundingClientRect();
    const [offsetX, offsetY] = local(
      viewport.left + deltaX - actual.left,
      viewport.top + deltaY - actual.top,
    );
    // Re-anchor after ancestor scrolling even when the pointer is stationary.
    element.style.left = `${pixels(element.style.left) + offsetX}px`;
    element.style.top = `${pixels(element.style.top) + offsetY}px`;
  };
  move(0, 0);
  return move;
}

function nonNone(value: string | undefined): boolean {
  return value !== undefined && value !== '' && value !== 'none';
}

function pixels(value: string): number {
  return Number.parseFloat(value) || 0;
}
