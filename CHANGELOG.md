# Changelog

All notable behavior and public API changes to this project are recorded here.

## 0.1.0 - 2026-08-28

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
