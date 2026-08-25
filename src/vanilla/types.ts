import type {
  CopyItemContext,
  SortableAreaOptions,
  SortableAreaPatch,
  SortableId,
  SortableScopeOptions,
} from '../core.js';

export interface VanillaSortableAreaOptions
  extends Omit<SortableAreaOptions, 'getItemId' | 'prepareCopy'> {
  getItemId?: (element: Element) => SortableId;
  copyElement?: (source: Element, context: CopyItemContext) => Element;
}

export type VanillaSortableAreaPatch = Partial<
  Omit<VanillaSortableAreaOptions, 'areaId'>
>;

export interface VanillaSortableOptions
  extends VanillaSortableAreaOptions, SortableScopeOptions {}

export interface Sortable {
  registerArea(
    element: Element | string,
    options: VanillaSortableAreaOptions,
  ): () => void;
  updateArea(areaId: string, patch: VanillaSortableAreaPatch): void;
  refreshArea(areaId: string): void;
  cancel(): void;
  destroy(): void;
}
