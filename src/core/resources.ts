export type ResourceCategory =
  | 'listeners'
  | 'frames'
  | 'observers'
  | 'cleanups';

export interface ResourceSnapshot {
  listeners: number;
  frames: number;
  observers: number;
  cleanups: number;
}

interface ResourceEntry {
  category: ResourceCategory;
  cleanup: (() => void) | null;
}

export class ResourceBag {
  private readonly entries: ResourceEntry[] = [];
  private readonly counts: ResourceSnapshot = {
    listeners: 0,
    frames: 0,
    observers: 0,
    cleanups: 0,
  };
  private disposed = false;

  add(
    cleanup: () => void,
    category: ResourceCategory = 'cleanups',
  ): () => void {
    if (this.disposed) {
      cleanup();
      return () => {};
    }

    const entry: ResourceEntry = { category, cleanup };
    this.entries.push(entry);
    this.counts[category] += 1;

    return () => this.release(entry);
  }

  dispose(): void {
    if (this.disposed) {
      return;
    }
    this.disposed = true;

    const entries = this.entries.splice(0).reverse();
    let firstError: unknown;
    for (const entry of entries) {
      try {
        this.release(entry);
      } catch (error) {
        firstError ??= error;
      }
    }

    if (firstError !== undefined) {
      throw firstError;
    }
  }

  snapshot(): ResourceSnapshot {
    return { ...this.counts };
  }

  private release(entry: ResourceEntry): void {
    const cleanup = entry.cleanup;
    if (cleanup === null) {
      return;
    }

    entry.cleanup = null;
    this.counts[entry.category] -= 1;
    const index = this.entries.indexOf(entry);
    if (index !== -1) {
      this.entries.splice(index, 1);
    }
    cleanup();
  }
}
