# Playground preview asset

[`assets/sortable-playground.gif`](./assets/sortable-playground.gif) is captured
from the actual Comins Sortable Playground.
It contains first-party UI and demo data from `example/` and is covered by the
repository MIT license. Its asset declaration is in
[`LICENSE_SCOPE.json`](../LICENSE_SCOPE.json).

## Current capture

- Capture date: 2026-09-11.
- Runtime source: `a176f039fa099cdaf9acf69c7a094f732620bab3` (0.1.2 candidate).
- Adapter and language: React, English.
- Browser viewport: 1440 × 1000 CSS pixels; GIF: 1080 × 750 pixels.
- Encoding: 107 frames, 21.9 seconds per loop, approximately 1.0 MB.
- Tools: Playwright CLI for actual pointer/key input and PNG frames, Pillow for
  resizing, a shared palette, and looping GIF encoding.

| Scene | Actual interaction and checked result |
| --- | --- |
| `two-lists` | Move Design by its handle from To do to Done, after Review. |
| `transitions` | Command-click Research and Build handles, then move both after Review in their original order. |
| `swap-grid` | Swap Item 1 with Item 6; the other 18 positions stay unchanged. |
| `tree` | Move Review into Design children; Document and Observe remain under Review. |

The tree take checks the actual destination Area before release and the
descendant content after the drop. Pointer coordinates follow the current
destination bounds as the layout changes. The selected source and resulting
DOM are inspected; demo state is not injected to manufacture the animation.

## Refresh procedure

1. Run the repository Playground with `npm run dev` and open
   `http://127.0.0.1:4003/examples/two-lists/react` in a dedicated browser session.
2. Switch to English and set the viewport to 1440 × 1000. Reset each example
   before recording, and inspect a fresh browser snapshot before locating cards.
3. Capture the four scenes above using the actual handles, modifier keys, and
   pointer movement. Wait for each adapter to mount; measure current target
   bounds instead of reusing coordinates from another viewport or layout.
4. Verify each final order or subtree, then resize the PNG frames and encode one
   looping GIF. Hold the initial and final states long enough to compare them.
5. Decode every GIF frame and visually inspect each scene's start, drag, and
   result. Run the documentation and license checks after replacing the asset.

Keep raw frames and diagnostic takes outside tracked source. Keep this capture
guide outside `assets/`, whose tracked files require asset declarations. The npm
package excludes `docs/`; the README intentionally references the raw GitHub
asset so the preview also works when the README is rendered on npm.
