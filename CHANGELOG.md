# Changelog

All notable behavior and public API changes to this project are recorded here.

## 0.1.1 - Unreleased

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
