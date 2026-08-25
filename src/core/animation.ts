import { SortableError } from './errors.js';
import type { SortableAnimation, SortableAnimationOptions } from './model.js';

interface AnimatableElement {
  animate?(keyframes: Keyframe[], options: KeyframeAnimationOptions): Animation;
}

interface ManagedAnimation {
  addEventListener?(type: 'finish', listener: () => void, options?: AddEventListenerOptions): void;
}

export interface SortableLayoutAnimator {
  play(): void;
  cancel(refresh?: boolean): void;
  update(itemSelector: string, animation: SortableAnimation | undefined): void;
  destroy(): void;
}

export function normalizeAnimation(
  animation: SortableAnimation | undefined,
): SortableAnimationOptions | null {
  if (animation === undefined || animation === false) return null;
  if (typeof animation === 'number') {
    return { duration: finiteDuration(animation) };
  }
  if (typeof animation !== 'object' || animation === null) {
    throw new SortableError('INVALID_OPTION');
  }
  const duration = finiteDuration(animation.duration);
  if (
    animation.easing !== undefined
    && (typeof animation.easing !== 'string' || animation.easing.trim().length === 0)
  ) {
    throw new SortableError('INVALID_OPTION');
  }
  return {
    duration,
    ...(animation.easing === undefined ? {} : { easing: animation.easing }),
  };
}

export function createLayoutAnimator(
  area: Element,
  initialItemSelector: string,
  initialAnimation: SortableAnimation | undefined,
  window: Window,
): SortableLayoutAnimator {
  let itemSelector = initialItemSelector;
  let options = normalizeAnimation(initialAnimation);
  let previous = positions(area, itemSelector);
  let animations = new Set<Animation>();
  let listening = false;
  let destroyed = false;

  const stopInvalidationListeners = (): void => {
    if (!listening) return;
    listening = false;
    window.removeEventListener('resize', invalidate);
    window.removeEventListener('scroll', invalidate, true);
  };

  const invalidate = (): void => {
    cancelAnimations();
    previous = positions(area, itemSelector);
  };

  const startInvalidationListeners = (): void => {
    if (listening) return;
    listening = true;
    window.addEventListener('resize', invalidate, { passive: true });
    window.addEventListener('scroll', invalidate, { capture: true, passive: true });
  };

  const cancelAnimations = (): void => {
    for (const animation of animations) animation.cancel();
    animations.clear();
    stopInvalidationListeners();
  };

  const retainAnimation = (animation: Animation): void => {
    animations.add(animation);
    startInvalidationListeners();
    (animation as ManagedAnimation).addEventListener?.('finish', () => {
      animations.delete(animation);
      if (animations.size === 0) stopInvalidationListeners();
    }, { once: true });
  };

  return {
    play() {
      if (destroyed) return;
      cancelAnimations();
      const current = positions(area, itemSelector);
      const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;
      if (options !== null && options.duration > 0 && !reducedMotion) {
        for (const [element, rect] of current) {
          const before = previous.get(element);
          const deltaX = before === undefined ? 0 : before.left - rect.left;
          const deltaY = before === undefined ? 0 : before.top - rect.top;
          if (before === undefined || (deltaX === 0 && deltaY === 0)) continue;
          const animation = (element as unknown as AnimatableElement).animate?.([
            { transform: `translate(${deltaX}px, ${deltaY}px)` },
            { transform: 'translate(0px, 0px)' },
          ], {
            duration: options.duration,
            easing: options.easing ?? 'ease',
          });
          if (animation !== undefined) retainAnimation(animation);
        }
      }
      previous = current;
    },
    cancel(refresh = false) {
      if (destroyed) return;
      cancelAnimations();
      if (refresh) previous = positions(area, itemSelector);
    },
    update(nextItemSelector, nextAnimation) {
      if (destroyed) return;
      cancelAnimations();
      itemSelector = nextItemSelector;
      options = normalizeAnimation(nextAnimation);
      this.play();
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      cancelAnimations();
      previous.clear();
    },
  };
}

function finiteDuration(duration: number): number {
  if (!Number.isFinite(duration) || duration < 0) {
    throw new SortableError('INVALID_OPTION');
  }
  return duration;
}

function positions(area: Element, selector: string): Map<Element, DOMRect> {
  const result = new Map<Element, DOMRect>();
  for (const element of area.querySelectorAll(selector)) {
    if (
      element.parentElement === area
      && !element.hasAttribute('data-comins-sortable-placeholder')
      && !element.hasAttribute('data-comins-sortable-dragging')
    ) {
      result.set(element, element.getBoundingClientRect());
    }
  }
  return result;
}
