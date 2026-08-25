export type SortableErrorCode =
  | 'INVALID_ELEMENT'
  | 'DUPLICATE_AREA_ID'
  | 'DUPLICATE_ITEM_ID'
  | 'MISSING_ITEM_ID'
  | 'INVALID_OPTION';

export class SortableError extends Error {
  readonly code: SortableErrorCode;

  constructor(code: SortableErrorCode) {
    super(code);
    this.name = 'SortableError';
    this.code = code;
  }
}
