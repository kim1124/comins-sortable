# Public API Reference

This reference inventories the package entry points and their public values and
types. The feature guides explain behavior and provide complete examples. If an
export is not listed here, treat it as internal implementation.

## `comins-sortable`

The root entry is the Vanilla JavaScript adapter.

- `createSortable`: creates one Vanilla sortable instance and its DOM transaction
  boundary.
- `Sortable`: the returned instance, including area registration, refresh,
  cancellation, and idempotent destruction.
- `VanillaSortableOptions`: root creation options.
- `VanillaSortableAreaOptions`: initial area options.
- `VanillaSortableAreaPatch`: supported area updates.

See [Vanilla JavaScript Adapter](./03-vanilla.md).

## `comins-sortable/core`

Core contains framework-neutral operations, lifecycle ownership, errors, and the
headless Tree model.

### Values

- `SortableError`: stable public error with a `SortableErrorCode` code.
- `reorder`: returns an immutable same-area order.
- `transfer`: returns immutable source and destination orders.
- `buildCopyChange`: prepares a typed copy change without removing the source.
- `createSortableScope`: creates an instance-local sortable lifecycle scope.
- `createSortableTree`: maps an immutable tree to sortable areas and folds area
  changes back into the tree.

### Types

- Lifecycle and error types: `SortableErrorCode`, `AfterDragReason`,
  `AfterDragResult`, `DragContext`, `PointerSnapshot`, `InsertDragAreaEvent`.
- Identity and location types: `ItemKey`, `SortableId`, `SortableLocation`,
  `SortableParentLocation`, `SortableOrder`.
- Scope and area types: `SortableScope`, `SortableScopeOptions`,
  `SortableAreaOptions`, `SortableAreaPatch`, `SortableAreaUpdate`.
- Group and transfer types: `SortableGroup`, `SortableGroupOptions`,
  `SortableTransferMode`, `CopyItem`, `CopyItemContext`.
- Change types: `SortableChange`, `SortableMoveChange`, `SortableReorderChange`,
  `SortableTransferChange`, `SortableCopyChange`, `FrameworkSortableChange`.
  Multi-drag changes also expose `itemIds`; swap changes use
  `SortableSwapChange` and `swapItemId`.
- Presentation types: `SortableDirection`, `SortableAnimation`,
  `SortableAnimationOptions`, `SortablePlaceholderOptions`,
  `SortablePlaceholderPreset`.
- Tree types: `SortableTree`, `SortableTreeArea`, `SortableTreeOptions`.

See [Core Concepts](./02-core-concepts.md), [Reorder and Transfer](./07-reorder-transfer.md),
[Copy and Clone](./08-copy-clone.md), [Nested Lists and Tree](./12-nested-tree.md),
and [Lifecycle and Errors](./14-lifecycle-errors.md).
Advanced selection, thresholds, grid collision, and swap behavior are covered
in [Advanced Sorting](./16-advanced-sorting.md).

## `comins-sortable/react`

- `SortableRoot`: owns a shared controlled React scope.
- `SortableArea`: registers one controlled React area.
- `SortableRootProps`: root lifecycle and change props.
- `SortableAreaProps`: area data, identity, rendering, and behavior props.

See [React Adapter](./04-react.md).

## `comins-sortable/vue`

- `SortableRoot`: owns a shared controlled Vue scope.
- `SortableArea`: registers one controlled Vue area.
- `VueSortableRootComponent`, `VueSortableRootProps`, `VueSortableRootSlots`, and
  `VueSortableRootOptions`: typed root component contracts.
- `VueSortableAreaComponent`, `VueSortableAreaProps`, and `VueSortableAreaSlots`:
  typed area component contracts.

See [Vue Adapter](./05-vue.md).

## `comins-sortable/svelte`

- `createSortableScope`: creates a shared scope for multiple Svelte actions.
- `sortable`: the Svelte action.
- `SvelteActionReturn`: the action update and destroy contract.
- `SvelteSortableOptions`: one action's area and lifecycle options.
- `SvelteSortableScope`, `SvelteSortableScopeOptions`: shared scope contracts.

See [Svelte Adapter](./06-svelte.md).

## `comins-sortable/styles.css`

Import this entry to enable the public base styles and optional placeholder
presets. It is the only declared side-effect entry. See
[Placeholder Styling](./13-placeholder.md).

## Support boundary

All entry points are ESM and target ES2020. React, React DOM, Vue, and Svelte are
optional peer dependencies; the package has zero runtime dependencies. The
browser evidence and certification boundary are maintained in the repository
[README](../../README.md#browser-support).
