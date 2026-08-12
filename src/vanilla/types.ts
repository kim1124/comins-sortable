import type {
  SortableAreaOptions,
  SortableAreaPatch,
  SortableId,
  SortableScopeOptions,
} from '../core.js';

export interface VanillaSortableAreaOptions
  extends Omit<SortableAreaOptions, 'getItemId'> {
  getItemId?: (element: Element) => SortableId;
}

export interface VanillaSortableOptions
  extends VanillaSortableAreaOptions, SortableScopeOptions {}

export interface Sortable {
  registerArea(
    element: Element | string,
    options: VanillaSortableAreaOptions,
  ): () => void;
  updateArea(areaId: string, patch: SortableAreaPatch): void;
  cancel(): void;
  destroy(): void;
}
