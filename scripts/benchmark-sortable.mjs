import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { cpus, platform, release } from 'node:os';
import { parseArgs } from 'node:util';
import { chromium } from '@playwright/test';
import { build } from 'esbuild';

const root = fileURLToPath(new URL('..', import.meta.url));
const { values } = parseArgs({ options: {
  trace: { type: 'string' }, suite: { type: 'string', default: 'all' }, output: { type: 'string', default: 'test-results/benchmark-sortable.json' },
  samples: { type: 'string', default: '30' }, batches: { type: 'string', default: '3' },
} });
assert.ok(['all', 'latency', 'memory'].includes(values.suite), 'invalid suite');
const samples = Number(values.samples), batches = Number(values.batches);
assert.ok(Number.isInteger(samples) && samples > 0 && Number.isInteger(batches) && batches > 0);
const output = resolve(root, values.output);
await mkdir(dirname(output), { recursive: true });
const built = await build({ absWorkingDir: root, entryPoints: ['test/performance/fixture.ts'], bundle: true, format: 'iife', globalName: 'SortableBenchmark', write: false });
const browser = await chromium.launch();
const report = {
  schemaVersion: 1, bundleSha256: createHash('sha256').update(built.outputFiles[0].contents).digest('hex'), source: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim(),
  dirty: Boolean(execFileSync('git', ['status', '--porcelain'], { cwd: root, encoding: 'utf8' }).trim()),
  node: process.version, browser: browser.version(), os: `${platform()} ${release()}`, cpu: cpus()[0]?.model,
  viewport: { width: 1100, height: 760 }, warmup: 5, samples, batches, latency: [], memory: [], pageErrors: [], passed: false,
};
const quantile = (values, p) => [...values].sort((a, b) => a - b)[Math.max(0, Math.ceil(values.length * p) - 1)] ?? 0;
try {
  const page = await browser.newPage({ viewport: report.viewport });
  page.on('pageerror', (error) => report.pageErrors.push(error.message));
  await page.setContent('<style>body{margin:12px;font:14px Arial}#root{display:flex;gap:10px;flex-wrap:wrap}.area{width:460px;height:560px;overflow:auto;border:1px solid #888}.item{box-sizing:border-box;height:36px;padding:6px;border-bottom:1px solid #ddd;background:white}.handle{touch-action:none;user-select:none;margin-right:16px}header,footer{height:24px}</style><div id="root"></div>');
  await page.addStyleTag({ content: await readFile(resolve(root, 'dist/styles.css'), 'utf8') });
  await page.addScriptTag({ content: built.outputFiles[0].text });
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Performance.enable');
  const settle = () => page.evaluate(() => SortableBenchmark.settle());
  const mount = (config) => page.evaluate((config) => SortableBenchmark.mount(config), config);
  async function drag(cancel = false, steps = 8) {
    const before = await page.evaluate(() => SortableBenchmark.readState().ids);
    const handle = await page.locator('.area').first().locator('.item .handle').first().boundingBox();
    assert.ok(handle);
    const x = handle.x + handle.width / 2, y = handle.y + handle.height / 2;
    await page.evaluate(() => SortableBenchmark.start());
    await page.mouse.move(x, y); await page.mouse.down(); await page.mouse.move(x, y + 10);
    await page.waitForFunction(() => SortableBenchmark.readState().source !== null, undefined, { polling: 10 });
    const active = await page.evaluate(() => SortableBenchmark.readState());
    assert.deepEqual(active.source, { areaId: '0', itemId: before[0][0] });
    await page.evaluate(() => SortableBenchmark.setPhase('move'));
    for (let i = 1; i <= steps; i++) { await page.mouse.move(x, y + 36 * i + 12); await settle(); }
    await page.evaluate(() => SortableBenchmark.setPhase('release'));
    if (cancel) await page.keyboard.press('Escape');
    await page.mouse.up(); await page.waitForFunction(() => SortableBenchmark.readState().last !== null, undefined, { polling: 10 });
    const after = await page.evaluate(() => SortableBenchmark.readState());
    await page.evaluate(() => SortableBenchmark.setPhase('idle'));
    assert.deepEqual(after.errors, []);
    if (!cancel) assert.ok(after.pointerEvents.some((event) => event.type === 'pointerup' && event.phase === 'release'), 'synchronous release must be measured');
    assert.equal(after.last.status, cancel ? 'cancelled' : 'dropped');
    if (cancel) assert.deepEqual(after.ids, before);
    else {
      const expected = [...before[0]]; const source = expected.shift(); expected.splice(steps, 0, source);
      assert.deepEqual(after.ids, [expected, ...before.slice(1)], 'complete DOM order');
    }
    assert.equal(await page.locator('[data-comins-sortable-placeholder],[data-comins-sortable-dragging]').count(), 0);
    assert.equal(await page.locator('.area > :first-child:not(header),.area > :last-child:not(footer)').count(), 0);
    return { frames: after.frames, pointerEvents: after.pointerEvents, frameIntervals: after.intervals, longTasks: after.longTasks,
      activationIdCalls: active.idCalls, activationRectCalls: active.rectCalls, idCalls: after.idCalls, rectCalls: after.rectCalls };
  }
  async function resource(label) {
    await settle(); await cdp.send('HeapProfiler.collectGarbage');
    const { metrics } = await cdp.send('Performance.getMetrics');
    return { label, heapMb: metrics.find((m) => m.name === 'JSHeapUsedSize').value / 1048576,
      ...await cdp.send('Memory.getDOMCounters'), liveNodes: await page.locator('*').count(),
      markers: await page.locator('[data-comins-sortable-placeholder],[data-comins-sortable-dragging]').count() };
  }
  function stable(warm, next) {
    assert.equal(next.documents, warm.documents); assert.equal(next.liveNodes, warm.liveNodes);
    assert.equal(next.markers, 0); assert.ok(next.jsEventListeners - warm.jsEventListeners <= 5, 'listeners');
    assert.ok(next.nodes - warm.nodes <= 10, 'retained DOM'); assert.ok(next.heapMb - warm.heapMb <= 1, 'heap growth');
  }
  // Preflight transfer uses real input and independently checks empty-area slots.
  await mount({ itemCount: 100, areaCount: 2, animation: false, autoScroll: false });
  await drag(true, 2); // Establish the populated area's existing footer boundary.
  await page.locator('.area').nth(1).locator('.item').evaluateAll((items) => items.forEach((item) => item.remove()));
  await page.locator('.area').nth(1).locator('footer').evaluate((footer) => { footer.style.marginTop = '80px'; });
  const sourceIds = await page.evaluate(() => SortableBenchmark.readState().ids[0]);
  const handle = await page.locator('.handle').first().boundingBox();
  const destination = await page.locator('.area').nth(1).boundingBox();
  assert.ok(handle && destination);
  await page.evaluate(() => SortableBenchmark.start());
  await page.mouse.move(handle.x + 8, handle.y + 8); await page.mouse.down();
  await page.mouse.move(handle.x + 8, handle.y + 20); await settle();
  assert.deepEqual(await page.evaluate(() => SortableBenchmark.readState().source), { areaId: '0', itemId: sourceIds[0] });
  await page.mouse.move(destination.x + 30, destination.y + 40); await settle();
  assert.equal(await page.locator('.area').nth(1).locator(':scope > [data-comins-sortable-placeholder] + footer').count(), 1);
  await page.mouse.up(); await settle();
  assert.deepEqual(await page.evaluate(() => SortableBenchmark.readState().ids), [sourceIds.slice(1), [sourceIds[0]]]);
  assert.equal(await page.locator('.area').nth(1).locator(':scope > header + .item + footer').count(), 1);
  assert.equal(await page.locator('[data-comins-sortable-dragging],[data-comins-sortable-placeholder]').count(), 0);
  report.emptyTransferPassed = true;
  if (values.suite !== 'memory') {
    for (let batch = 0; batch < batches; batch++) for (const cpuRate of [1, 4]) {
      await cdp.send('Emulation.setCPUThrottlingRate', { rate: cpuRate });
      for (const [itemCount, areaCount, animation] of [[100, 1, false], [1000, 1, false], [5000, 1, false], [5000, 10, false], [1000, 1, true], [5000, 1, true]]) {
        const config = { itemCount, areaCount, animation, autoScroll: false };
        await mount(config);
        for (let i = 0; i < report.warmup; i++) await drag();
        const rows = []; for (let i = 0; i < samples; i++) rows.push(await drag());
        const activation = rows.map((row) => Math.max(0, ...row.frames.filter((f) => f.phase === 'activation').map((f) => f.ms)));
        const move = rows.flatMap((row) => row.frames.filter((f) => f.phase === 'move').map((f) => f.ms));
        const result = { batch, cpuRate, config, activationMedianMs: quantile(activation, .5), activationP95Ms: quantile(activation, .95), moveP95Ms: quantile(move, .95), rows };
        report.latency.push(result);
        console.log(JSON.stringify({ batch, cpuRate, ...config, activationMedianMs: result.activationMedianMs, activationP95Ms: result.activationP95Ms, moveP95Ms: result.moveP95Ms }));
        await writeFile(output, JSON.stringify(report, null, 2));
      }
    }
  }
  if (values.trace) {
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
    await mount({ itemCount: 5000, areaCount: 1, animation: false, autoScroll: false });
    await drag();
    await cdp.send('Tracing.start', { categories: 'devtools.timeline', transferMode: 'ReturnAsStream' });
    await drag();
    const completed = new Promise((resolve) => cdp.once('Tracing.tracingComplete', resolve));
    await cdp.send('Tracing.end');
    const { stream } = await completed;
    let trace = '';
    for (;;) {
      const chunk = await cdp.send('IO.read', { handle: stream });
      trace += chunk.base64Encoded ? Buffer.from(chunk.data, 'base64').toString('utf8') : chunk.data;
      if (chunk.eof) break;
    }
    await cdp.send('IO.close', { handle: stream });
    const tracePath = resolve(root, values.trace);
    await mkdir(dirname(tracePath), { recursive: true });
    await writeFile(tracePath, trace);
  }
  if (values.suite !== 'latency') {
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
    const config = { itemCount: 1000, areaCount: 1, animation: false, autoScroll: false };
    await mount(config);
    for (let i = 0; i < 10; i++) await drag(i % 2 === 0, 2);
    const warm = await resource('warm'); report.memory.push(warm);
    for (let cycle = 1; cycle <= 500; cycle++) {
      await drag(cycle % 2 === 0, 2);
      if (cycle % 5 === 0) await mount(config);
      if (cycle % 50 === 0) { const next = await resource(`cycle-${cycle}`); report.memory.push(next); stable(warm, next); console.log(JSON.stringify(next)); }
    }
    let emptyWarm;
    for (let round = 0; round < 11; round++) {
      await mount(config); await drag(false, 2); await page.evaluate(() => SortableBenchmark.destroy()); await page.mouse.move(1099, 759);
      const next = await resource(`destroy-${round}`); report.memory.push(next);
      if (round === 0) emptyWarm = next; else stable(emptyWarm, next);
    }
  }
  assert.deepEqual(report.pageErrors, []); report.passed = true;
} finally {
  await writeFile(output, JSON.stringify(report, null, 2));
  await browser.close();
}
