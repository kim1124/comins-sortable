# Playground preview asset

[`assets/sortable-playground.gif`](./assets/sortable-playground.gif) is captured
from the actual Comins Sortable Playground.
It contains first-party UI and demo data from `example/` and is covered by the
repository MIT license. Its asset declaration is in
[`LICENSE_SCOPE.json`](../LICENSE_SCOPE.json).

## Current capture

- Capture date: 2026-09-16.
- Runtime source: `044d35f71178604d6daf0e1f8c6e3710a66a6513` plus the local 0.1.3
  reset/feedback fixes, card-stripe removal, and updated nested/tree guidance.
- Runtime source manifest SHA-256:
  `4a5d0397491ad6ab86648788bc234abcf76db6fc57af0dcf40c56eed5441210e`.
- Adapter and language: React, English.
- Browser: headed Chromium against the local Vite development server.
- Browser viewport: 1440 × 1100 CSS pixels; GIF: 1080 × 825 pixels.
- Encoding: 97 captured PNG frames, 95 encoded GIF frames, 27.76 seconds per loop,
  1,956,821 bytes (approximately 1.96 MB). Identical adjacent frames share a hold.
- GIF SHA-256: `e33ff9ba7c12df7e13e5bc349ada18fadb20122f29be294da6cee4107bdd66f1`.
- Tools: Playwright CLI for actual pointer/key input and PNG frames, Pillow for
  resizing, a shared palette, and looping GIF encoding.

| Scene | Actual interaction and checked result |
| --- | --- |
| `transitions` · selection reset | Command-click Build, press Reset data, then Shift-click Review. Selection is empty after reset and contains only Review after Shift-click. Move Review to the front; Build stays in place relative to the other items. |
| `nested-controlled` · Per-list state control | Press Reverse children: child becomes Release, Review while the root remains Research, Design, Build. Press again to restore the child order. |
| `tree` · Subtree movement | Move Review into Design children; Document and Observe remain under Review, and Research retains Release. |
| `auto-scroll` · boundary feedback | Drag Research to the bottom padding. At scrollTop 390, the hidden placeholder preserves scrollHeight 720. Reenter the list to restore feedback, then drop Research last. |

The tree take checks the actual destination Area before release and the
descendant content after the drop. Pointer coordinates follow the current
destination bounds as the layout changes. The selected source and resulting
DOM are inspected; demo state is not injected to manufacture the animation.
Every GIF frame is decoded for size and duration validation, and each scene's
start, action, and result is visually reviewed. Frame holds are edited for
readability; this GIF is not a real-time measurement of scrolling speed.

The scenes demonstrate the 0.1.3 working source. They do not establish native
Safari, physical touch/high-refresh device coverage, or npm publication. See
[0.1.3 local validation](./verification/0.1.3-local-validation.md) for those boundaries.

새 GIF는 0.1.3 작업 소스에서 직접 촬영했습니다. 선택 초기화, 목록별 배열 갱신,
하위 트리 이동, 스크롤 경계 미리보기 복원을 보여줍니다. 표시 시간은 가독성을 위해
조정했으므로 스크롤 속도 측정 자료가 아니며, 실제 Safari 검증이나 배포 완료를
의미하지 않습니다. 카드의 색상 띠가 제거된 최신 디자인을 사용합니다.

## Previous capture

The replaced GIF was captured on 2026-09-11 from
`a176f039fa099cdaf9acf69c7a094f732620bab3` (0.1.2 candidate): React, English,
1440 × 1000 viewport, 1080 × 750 GIF, 107 frames, 21.9 seconds. Its scenes were
transfer, multi-drag, swap grid, and subtree movement. It predates the later
reset/feedback and presentation changes. This record preserves its provenance.

## Refresh procedure

1. Run the repository Playground with `npm run dev` and open
   `http://127.0.0.1:4003/examples/transitions/react` in a dedicated browser session.
2. Switch to English and set the viewport to 1440 × 1100. Reset each example
   before recording, and inspect a fresh browser snapshot before locating cards.
3. Capture the four scenes above using the actual handles, modifier keys, and
   pointer movement. Wait for each adapter to mount; measure current target
   bounds instead of reusing coordinates from another viewport or layout.
4. Verify each final order or subtree, then resize the PNG frames and encode one
   looping GIF. Hold the initial and final states long enough to compare them.
5. Decode every GIF frame and visually inspect each scene's start, drag, and
   result. Update the source fingerprint, scene outcomes, dimensions, duration,
   and asset hash here. Run the documentation and license checks after replacing
   the asset.

Keep raw frames and diagnostic takes outside tracked source. Keep this capture
guide outside `assets/`, whose tracked files require asset declarations. The npm
package excludes `docs/`; the README intentionally references the raw GitHub
asset so the preview also works when the README is rendered on npm.
