# Playground preview asset

[`assets/sortable-playground.gif`](./assets/sortable-playground.gif) is captured
from the actual Comins Sortable Playground. It contains first-party UI and demo
data from `example/`, under the repository MIT license. Its asset declaration
is in [`LICENSE_SCOPE.json`](../LICENSE_SCOPE.json).

## Current capture

- Capture date: 2026-09-22.
- Runtime source: `423a01c98fb613233042fe7d7104e2cb29d6c175` plus current local
  0.1.3 human-review fixes, slot boundaries, drag start modes, and feedback CSS.
- Runtime source manifest SHA-256:
  `c2c4c75bfd5b74bef7ec2f61927e54b8295ecfda4c01a047e9dc4c0bca83dd94`.
- Manifest includes `src/`, `example/src/`, `example/public/`, HTML, Vite config,
  package manifest and lockfile. It fingerprints source, not a published release.
- Adapter and language: React, English.
- Browser: headed Chromium against the current production Playground preview.
- Viewport: 1440 × 1100 CSS pixels; GIF: 1080 × 825 pixels.
- Encoding: 153 captured PNG frames, 147 encoded GIF frames,
  46.30 seconds per loop, 2,386,636 bytes (approximately 2.39 MB).
  Identical adjacent frames share a hold.
- GIF SHA-256: `13bfd7f330fad4235e9fe0aabeded1a0dc2fd06cd1c9bb22250ae69e144e4dda`.
- Tools: Playwright CLI for actual pointer/control input and screenshots, Pillow
  for resizing, a shared palette and looping GIF encoding.
- Local capture manifest, raw frames and verified scene results:
  `output/playwright/2026-09-22-docs-gif/`.

| Scene | Actual interaction and checked result |
| --- | --- |
| `two-list-slots` · empty and refill | Move Research, Design and Build right. Move Build back into the empty left list. Preview is header → Placeholder → footer; the committed card stays between the slots. |
| `handle` · Drag start areas | Choose Whole card and move Build from its body text to the front. Choose Title only and move Design from its title to the front. Return to Dedicated handle without resetting the order. |
| `custom-placeholder` · Drop feedback styles | Compare custom dotted and default dashed insertion markers. Turn off Accept destination: the marker hides, the target and dragged card receive rejection outlines, and the destination remains unchanged. |
| `nested-controlled` · Per-list state control | Reverse children to Release, Review while the parent remains Research, Design, Build, then restore the child order. |
| `tree` · Subtree movement | Move Review into Design children. Document and Observe remain under Review; Research retains Release. |

The capture checks activated source identity, destination, final order and tree
children. Pointer coordinates follow current bounds. Application state is not
injected to manufacture the animation. All GIF frames are decoded to validate
size and duration; scene starts, interactions and results are visually reviewed.
Frame holds are edited for readability, so the GIF is not a timing benchmark.

**Known limitation:** native Safari 26.6.2 can leave body text selected after a
title-only drag in the React Playground. The Chromium title scene does not
establish a Safari fix. See [Handle and Acceptance](./user/09-handle-acceptance.md)
and [current verification](./verification/0.1.3-local-validation.md).

현재 GIF는 슬롯 목록 복귀, 드래그 시작 영역, 허용·거부 CSS, 목록별 상태 갱신,
하위 트리 이동을 실제 React·Chromium에서 촬영했습니다. 모든 어댑터·브라우저·터치
기기를 대표하지 않으며 배포 완료를 의미하지 않습니다. Safari 제목 드래그 후
본문 선택 잔류는 미해결 상태입니다. 선택 초기화와 스크롤 경계 장면은 이전 GIF에
포함되었으며 현재 GIF에는 없습니다. 해당 동작은 `transitions`, `auto-scroll`에서
직접 확인합니다.

## Previous captures

- 2026-09-16: reset, per-list state updates, subtree movement and scroll-boundary
  feedback. Source `044d35f71178604d6daf0e1f8c6e3710a66a6513` plus then-local
  changes; runtime hash `4a5d0397491ad6ab86648788bc234abcf76db6fc57af0dcf40c56eed5441210e`.
  95 encoded frames, 27.76 seconds, 1,956,821 bytes; GIF SHA-256
  `e33ff9ba7c12df7e13e5bc349ada18fadb20122f29be294da6cee4107bdd66f1`.
  Predates the current drag-origin/style comparison controls and brand symbol.
- 2026-09-11: transfer, multi-drag, Swap Grid and subtree movement from
  `a176f039fa099cdaf9acf69c7a094f732620bab3`, then a 0.1.2 candidate.
  1440 × 1000 viewport, 1080 × 750 GIF, 107 frames, 21.9 seconds.

Historical reports retain their original capture dates and results. Previous
bytes and raw frames are preserved in local output; they are not current proof.

## Refresh procedure

1. Run `npm run playground:build`, then `npm run playground:preview`. Avoid
   rebuilding while a preview capture or browser test is using the output.
2. Open a dedicated headed Chromium session at port 4003. Set English and a
   1440 × 1100 viewport. Navigate each scene afresh and wait for its adapter.
3. Inspect the current UI, then use actual controls and pointer movements for
   the five scenes above. Verify source identity and destination before release.
4. Check final models and subtree children. Encode the PNGs as a looping GIF,
   holding controls, accepted/rejected feedback and results long enough to read.
5. Decode every frame, visually inspect key frames, and update this capture
   record, README caption/cache key, referring guides and CHANGELOG.
6. Run documentation and license checks. If README or CHANGELOG changes, an
   older npm tarball no longer contains the current documents; refresh the exact
   artifact before publication.

Keep raw frames outside tracked source. The npm package excludes `docs/` and
`example/`, so README image URLs use the repository's raw asset URLs. Local
image updates become visible at those URLs only after the files reach `main`.
