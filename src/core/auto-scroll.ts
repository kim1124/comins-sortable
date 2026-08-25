import type { Point } from './geometry.js';
import type { SortablePlatform } from './platform.js';

const EDGE_DISTANCE = 32;
const MAX_VELOCITY = 20;
const SCROLLABLE_OVERFLOW = new Set(['auto', 'scroll', 'overlay']);

export interface AutoScrollInput {
  enabled: boolean;
  point: Point;
  hitChain: readonly Element[];
}

export interface AutoScroller {
  step(input: AutoScrollInput): Element | Window | null;
}

export function createAutoScroller(platform: SortablePlatform): AutoScroller {
  return {
    step(input) {
      if (!input.enabled) {
        return null;
      }

      for (const element of scrollCandidates(input.hitChain)) {
        const scrollable = asScrollableElement(element);
        if (scrollable === null) {
          continue;
        }
        const style = platform.window.getComputedStyle(element);
        const rect = element.getBoundingClientRect();
        const velocityX = SCROLLABLE_OVERFLOW.has(style.overflowX)
          ? edgeVelocity(input.point.x, rect.left, rect.right)
          : 0;
        const velocityY = SCROLLABLE_OVERFLOW.has(style.overflowY)
          ? edgeVelocity(input.point.y, rect.top, rect.bottom)
          : 0;
        const left = availableVelocity(
          velocityX,
          scrollable.scrollLeft,
          scrollable.scrollWidth - scrollable.clientWidth,
        );
        const top = availableVelocity(
          velocityY,
          scrollable.scrollTop,
          scrollable.scrollHeight - scrollable.clientHeight,
        );
        if (left !== 0 || top !== 0) {
          scrollable.scrollBy({ left, top, behavior: 'auto' });
          return element;
        }
      }

      const root = platform.document.documentElement;
      const windowLeft = availableVelocity(
        edgeVelocity(input.point.x, 0, platform.window.innerWidth),
        platform.window.scrollX,
        root.scrollWidth - platform.window.innerWidth,
      );
      const windowTop = availableVelocity(
        edgeVelocity(input.point.y, 0, platform.window.innerHeight),
        platform.window.scrollY,
        root.scrollHeight - platform.window.innerHeight,
      );
      if (windowLeft === 0 && windowTop === 0) {
        return null;
      }
      platform.window.scrollBy({ left: windowLeft, top: windowTop, behavior: 'auto' });
      return platform.window;
    },
  };
}

function scrollCandidates(hitChain: readonly Element[]): Element[] {
  const candidates: Element[] = [];
  const seen = new Set<Element>();
  for (const hit of hitChain) {
    let current: Element | null = hit;
    while (current !== null) {
      if (!seen.has(current)) {
        seen.add(current);
        candidates.push(current);
      }
      current = current.parentElement;
    }
  }
  return candidates;
}

function edgeVelocity(coordinate: number, start: number, end: number): number {
  if (coordinate < start || coordinate > end || end <= start) {
    return 0;
  }
  const startDistance = coordinate - start;
  if (startDistance < EDGE_DISTANCE) {
    return -scaledVelocity(startDistance);
  }
  const endDistance = end - coordinate;
  if (endDistance < EDGE_DISTANCE) {
    return scaledVelocity(endDistance);
  }
  return 0;
}

function scaledVelocity(distance: number): number {
  return Math.max(1, Math.round(MAX_VELOCITY * (1 - distance / EDGE_DISTANCE)));
}

function availableVelocity(
  velocity: number,
  position: number,
  maximum: number,
): number {
  if ((velocity < 0 && position <= 0) || (velocity > 0 && position >= maximum)) {
    return 0;
  }
  if (velocity < 0) {
    return -Math.min(-velocity, position);
  }
  return Math.min(velocity, Math.max(0, maximum - position));
}

function asScrollableElement(element: Element): Element | null {
  return 'scrollBy' in element && typeof element.scrollBy === 'function'
    ? element
    : null;
}
