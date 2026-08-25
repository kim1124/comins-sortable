import { SortableError } from './errors.js';

export interface SortablePlatform {
  readonly document: Document;
  readonly window: Window;
  elementsFromPoint(x: number, y: number): readonly Element[];
  requestFrame(callback: FrameRequestCallback): number;
  cancelFrame(id: number): void;
  report(error: unknown): void;
}

export function createBrowserPlatform(element: Element): SortablePlatform {
  const document = element.ownerDocument;
  const window = document.defaultView;
  if (window === null) {
    throw new SortableError('INVALID_ELEMENT');
  }

  return {
    document,
    window,
    elementsFromPoint: (x, y) => document.elementsFromPoint(x, y),
    requestFrame: (callback) => window.requestAnimationFrame(callback),
    cancelFrame: (id) => window.cancelAnimationFrame(id),
    report: (error) => {
      const reportingGlobal = globalThis as typeof globalThis & {
        reportError?: (reportedError: unknown) => void;
      };
      if (typeof reportingGlobal.reportError === 'function') {
        reportingGlobal.reportError(error);
        return;
      }
      queueMicrotask(() => {
        throw error;
      });
    },
  };
}
