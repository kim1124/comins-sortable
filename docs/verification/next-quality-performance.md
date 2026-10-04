# Large-list performance and resource verification

These checks exercise the built Vanilla package with real Chromium pointer
input. They are development measurements, not a supported-item-count promise
or a physical-device certification.

## Run

```sh
npm ci --ignore-scripts
npm run benchmark:sortable -- --suite all
```

The default run uses 5 warm-up drags and 30 measured drags per condition,
3 batches, 1×/4× CPU rates, and a 1100×760 viewport. It covers 100, 1,000 and
5,000 items in one area; 5,000 items across ten areas; and 1,000/5,000-item
animation variants. Auto-scroll is disabled to keep latency runs comparable.
Its separate browser tests cover auto-scroll behavior.

Use `--suite latency` or `--suite memory` to run one part. `--batches 1` is the
CI measurement profile; use the default three batches for change comparisons.
`--samples 1 --batches 1` checks the harness only and is not a performance result.
`--output test-results/custom.json` selects a result file.

Use `--trace .local/next-quality/trace.json` to capture a separate 5,000-item,
4× CPU drag in Chrome trace format after timing samples. The trace can be
opened in Chromium DevTools to inspect scripting, layout and paint separately.

## Read the result

- `pointerEvents` measure synchronous pointer event dispatch (window capture to
  bubble), including the release/commit work on pointerup. They include browser
  listener overhead and are separate from subsequent frame work.
- `frames` are library-scheduled rAF callback CPU durations, grouped by activation,
  move and release. Harness settling uses the original RAF and polling uses
  timers, so those callbacks are excluded. They are not
  end-to-end input latency or total rendering time; release RAF samples alone
  do not measure synchronous drop processing.
- Frame intervals and long tasks provide additional responsiveness observations.
  Raw samples, median and p95 are retained; compare equivalent configurations.
- ID and rectangle call counts identify redundant work. Every drag checks source
  identity, full final DOM order, slot boundaries, status and marker cleanup.
- Heap, document, DOM and listener counts are collected after warm-up and GC.
  The soak runs 500 drag/cancel cycles, remounting every five cycles and sampling
  every fifty; eleven destroy samples include one warmed empty baseline.
- Resource bounds use the existing Playground tolerances: no document/live-node
  growth; at most five listeners, ten retained DOM nodes and 1 MiB heap growth.
  Exceeding a bound requires investigation, not automatic relaxation.

Measurements must run without other builds or browser tests on the same host.
Keep the same browser, machine and fixture for before/after comparisons. Shared
CI timing is reported rather than enforced as a universal millisecond limit;
functional and resource assertions do fail the job.

A passing bounded soak does not prove the absence of every long-lived leak.
CPU throttling and browser touch emulation do not stand in for Galaxy testing.

## Implementation results

Results and limitations for the current implementation are recorded in
[the work report](../../reports/2026-10-04-next-quality.md). Baseline and final
JSON files remain under ignored `.local/next-quality/` during local work;
CI uploads its benchmark JSON as an artifact.

## Measured comparison — 2026-10-04

Original source `21713d9` and the final local implementation were built separately and run in three alternating baseline/final pairs. Each condition has 90 measured drags per source (30 per batch, after five warm-ups). These are pooled nearest-rank statistics, not averages of batch percentiles.

Environment: Apple M5 Pro, Darwin 27.0.0, Node 24.19.0, Chromium 151.0.7922.34; viewport 1100×760. CPU rates are Chromium throttling settings. Animation-on uses 150 ms; auto-scroll is disabled.

All times below are milliseconds; arrows mean baseline → final. Activation is the largest instrumented activation RAF callback per drag; move is the p95 of instrumented move callbacks. Drop is synchronous pointerup dispatch, measured separately.

| CPU | Items / areas | Animation | Activation median | Activation p95 | Move p95 | Drop p95 |
| --- | --- | --- | --- | --- | --- | --- |
| 1× | 100 / 1 | off | 0.6 → 0.6 | 0.8 → 0.7 | 1.2 → 0.9 | 1.4 → 1.4 |
| 1× | 1,000 / 1 | off | 2.4 → 1.9 | 2.6 → 2.0 | 3.3 → 2.9 | 4.7 → 4.9 |
| 1× | 5,000 / 1 | off | 10.2 → 6.9 | 12.4 → 8.7 | 9.8 → 7.1 | 12.1 → 12.1 |
| 1× | 5,000 / 10 | off | 7.1 → 5.2 | 9.2 → 7.5 | 3.2 → 2.9 | 2.8 → 2.7 |
| 1× | 1,000 / 1 | on | 2.4 → 2.2 | 2.5 → 2.4 | 3.5 → 3.5 | 4.2 → 3.8 |
| 1× | 5,000 / 1 | on | 9.3 → 8.3 | 11.3 → 10.5 | 10.3 → 10.3 | 11.2 → 10.6 |
| 4× | 100 / 1 | off | 0.8 → 0.7 | 1.3 → 1.4 | 1.0 → 1.1 | 1.6 → 1.6 |
| 4× | 1,000 / 1 | off | 6.6 → 4.9 | 7.1 → 5.6 | 6.1 → 4.3 | 7.5 → 7.1 |
| 4× | 5,000 / 1 | off | 37.0 → 27.7 | 44.4 → 36.3 | 32.5 → 25.8 | 38.7 → 43.1 |
| 4× | 5,000 / 10 | off | 26.2 → 19.2 | 40.4 → 29.7 | 11.6 → 8.3 | 9.7 → 7.7 |
| 4× | 1,000 / 1 | on | 6.9 → 6.1 | 8.4 → 6.6 | 8.2 → 6.8 | 8.4 → 7.0 |
| 4× | 5,000 / 1 | on | 37.2 → 34.5 | 43.8 → 42.2 | 36.3 → 35.6 | 38.5 → 35.5 |

The main 5,000-item / one-area / 4× / animation-off condition reduced activation median by 25.1% and activation p95 by 18.2%. Batch activation medians were 36.9–37.0 ms before and 27.3–28.1 ms after; batch p95 ranges were 44.1–44.6 and 35.1–38.3 ms. The separation exceeds the observed batch variation for this targeted work.

Activation ID reads decreased from 20,002 to 15,002 and rectangle reads from 10,002 to 5,002 in that condition. Animation-on retains its necessary rectangle reads. The 100-item results are too small/noisy to support a broad speed claim.

Drop latency is not uniformly improved: the target condition has pooled drop p95 38.7 → 43.1 ms despite median 36.7 → 34.1 ms. Per-batch drop p95 was 44.3/38.7/38.7 ms before and 34.2/44.2/35.7 ms after. These overlapping ranges do not establish a consistent regression or improvement; drop-tail reduction is not claimed. The 1,000-item unthrottled drop p95 also rose 4.7 → 4.9 ms. These results do not establish total input latency or a universal frame budget.

## Extended resource result

The final source passed all functional, marker, page-error and resource assertions. The original-source preflight records the known footer regression; it is permitted to continue timing and is not counted as passing that new behavior assertion.

| Resource | Warm, 1,000 items | After 500 drag/cancel cycles | Destroy baseline | After 10 further destroy rounds |
| --- | --- | --- | --- | --- |
| Heap (MiB) | 2.481 | 2.927 | 2.635 | 2.640 |
| Documents | 1 | 1 | 1 | 1 |
| Retained DOM nodes | 5021 | 5018 | 13 | 13 |
| Live DOM nodes | 3010 | 3010 | 7 | 7 |
| Listeners | 39 | 39 | 37 | 37 |
| Drag markers | 0 | 0 | 0 | 0 |

Every intermediate 50-cycle sample met the same bounds. Heap grew by 0.445 MiB over the 500-cycle run; retained DOM nodes decreased by three and listeners stayed constant. Destroy-round heap growth was 0.005 MiB with unchanged DOM/listener counts. This is bounded resource stability evidence, not proof against all long-duration leaks.

A separate final-source 5,000-item / 4× trace contains scripting, style/layout and paint work: `FunctionCall` 271.06 ms, `Layout` 78.30 ms, and `Paint` 44.87 ms summed within their respective event categories over the recorded drag. Trace events can nest/overlap and must not be added into an end-to-end latency value. Trace instrumentation is excluded from the comparison table.

Raw evidence: `.local/next-quality/baseline-{1,2,3}.json`, `final-{1,2,3}.json`, `comparison.json`, `memory.json`, and `trace.json`. Timing runs completed without concurrent builds or browser suites. The baseline/final bundle SHA-256 values are respectively `1aa60a0bedbdd62fada26e39040a90ca5108da64c2e05284f7f23787363b040b` and `b0bbf42f0cd98b695e5fa7e3acf79c8253e70c1f11245a5ec42cec6961f88c3e`.
