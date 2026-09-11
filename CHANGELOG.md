# Changelog

All notable behavior and public API changes to this project are recorded here.

## 0.1.2 - Unreleased

### Added

- Add a bilingual public API reference derived from every supported package
  entry point and link it from the repository documentation index.
- Add a Chromium performance gate that executes all 25 React Playground
  features twice and samples JS Heap, DOM Nodes, and Event Listeners after
  forced garbage collection.
- Add complete Playground route-mount coverage for all 25 routes across the
  Vanilla, React, Vue, and Svelte adapters.
- Add modifier multi-selection with ordered group moves, configurable threshold
  activation, two-dimensional grid collision, and target-swap behavior to Core,
  every framework adapter, and the Playground.

### Fixed

- Prevent native text dragging from interrupting an accepted sortable mouse
  gesture, while retaining normal text selection, focus, and native dragging
  outside the gesture.
- Resolve the final drop position when a single pointer-move frame activated
  the drag but no further movement occurred before release.
- Apply handle/ignore input boundaries before multi-selection and honor explicit
  button handles when suppressing Ctrl context menus.
- Preserve selection on secondary mouse buttons and suppress Ctrl context menus
  only on enabled multi-select items, keeping ordinary context menus available.
- Register React and Vue hosts after subtree DOM replacement and parent props
  updates, so moving a nested subtree cannot reuse an old area registration.
- Evaluate relative item selectors in their registered area for slot rejection,
  swap targets, and trailing insertion boundaries.
- Validate Vanilla copies against the destination selector and item ID after
  insertion, rolling back invalid copies before notifying consumer changes.
- Refresh collision geometry after external page or ancestor scrolling, including
  stationary pointers and immediate drops, and release scroll listeners with the
  drag session without duplicating auto-scroll frames.
- Keep copy sources rendered in place while a separate inert drag preview and
  destination placeholder communicate the pending copy.
- Scroll an opened Playground source panel into the viewport so View Code has
  an immediate visible result.
- Resolve browser-rounded target-midpoint drops from primary-axis movement
  intent.
- Commit the final coalesced pointer position before a quick release so fast
  drags do not resolve against a stale destination.
- Reject non-sortable host siblings as drop positions and expose temporary
  red warning feedback for rejected targets and drag previews.
- Reset the Accept/Reject control state when Playground data resets or a demo
  runtime remounts so the visible toggle and adapter behavior cannot diverge.
- Preserve each node's current descendants while Tree API areas apply
  sequential cross-area updates, preventing stale parent snapshots from
  duplicating a child when it moves back to an ancestor area.
- Expose the internally mounted Playground route to prevent tests and tooling
  from acting on a stale runtime during asynchronous adapter transitions.
- Keep a grid destination stable while the pointer remains over its placeholder
  and use a non-displacing target highlight for swap feedback.

### Changed

- Use handles throughout the Playground so card text remains selectable before
  and after sorting. Limit text-selection suppression to active drags and clear
  it on completion, cancellation, or runtime replacement.
- Order the Playground menus as Swap, Grid, and the new Swap Grid example.
- Explain sorting thresholds with a live shaded target region and replace the
  Tree demo's flat projection with a three-level tree that preserves subtrees.
- Remove the table-row and table-column Playground routes and their demo-only
  adapter rendering after repeated interactive reliability failures.
- Replace the former multi-transition demo with modifier-based multi-drag and
  add Thresholds, Grid, and Swap routes, raising current parity to 18 examples.

### Documentation

- Refresh the Playground GIF with current handle-based transfer, multi-drag,
  Swap Grid, and subtree movement captured from the running React example.
- Align English and Korean guides with the candidate version, selectable card
  text, current host/slot examples, and the distinct grid/swap behaviors.
- Record merged-runtime CI and the actual Safari mouse/keyboard verification
  scope, while keeping historical investigations and npm publication separate.
- Clarify the consumer component Host, nested parent/child, empty destination,
  and non-sortable slot differences directly in the Playground descriptions.
- Synchronize README release-candidate, route-count, optional-peer, local demo,
  and public API claims with the package and source manifests.
- Record the Chrome DevTools and clean-Chromium performance procedure, results,
  thresholds, and measurement-tool caveats for the 0.1.2 candidate.

## 0.1.1 - 2026-08-30

### Added

- Official framework-neutral `createSortableTree` API for area discovery,
  immutable area replacement, and enhanced-change folding.
- Consumer-customizable placeholder classes and CSS variables, plus an optional
  reduced-motion-aware `skeleton` drag-feedback preset.
- Tree, Custom Placeholder, and Skeleton Placeholder Playground routes for all
  four adapters.

### Changed

- The Playground now exposes 23 routes while keeping the 17-route desktop
  parity count unchanged.

### Security

- Require an exact provider-managed npm service name and email for the
  authenticated bootstrap profile and current registry maintainer.
- Verify exact maintainer and direct-publisher metadata for an interactive
  bootstrap without weakening trusted-publisher checks for later releases.
- Verify trusted publisher and person metadata for an exact published version.
- Block release automation when any reachable Git commit contains a non-public
  author or committer identity.

### Documentation

- Add a first-party Playground GIF captured from the live React two-list
  example and list the implementation stack without remote badge services.

## 0.1.0 - Withdrawn 2026-08-28

Version `0.1.0` was withdrawn after an npm public identity metadata incident and
cannot be reused.

### Added

- Initial public package boundary with exact ESM exports for the Core and the
  Vanilla, React, Vue, and Svelte adapters.
- Framework-neutral FLIP layout animation with reduced-motion handling and
  resize or scroll invalidation.
- Custom area hosts and explicit rendered-item discovery for table rows,
  table columns, component hosts, and header or footer siblings.
- Nested sortable metadata, descendant-cycle rejection, and controlled nested
  updates across Vanilla, React, Vue, and Svelte.
- All 17 planned Vue.Draggable parity examples in the four-adapter Playground.

### Changed

- Simplified the Playground navigation and workspace, and introduced the
  shared square `co` brand mark.
- `SortableScope` optionally exposes, and the Vanilla facade guarantees,
  `refreshArea(areaId)` for programmatic layout changes.
- Area options accept `animation` and `parent` metadata, and rejected nested
  cycles report the `nested-cycle` reason.
