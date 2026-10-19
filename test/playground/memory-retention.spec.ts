import { createHash, randomUUID } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { globSync } from 'node:fs';
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { expect, test, type CDPSession, type TestInfo } from '@playwright/test';
import { collectHeap, snapshotMachines } from './helpers/heap-snapshot.js';
import { exerciseNativeInput, mountRetentionFixture, openRetentionPage, pendingAttempts, retainCompletedDisposers } from './helpers/retention-fixture.js';

async function evidence(info: TestInfo): Promise<string> {
  const directory = join('playwright-report', 'memory-retention', `${Date.now()}-${randomUUID()}`);
  await mkdir(directory, { recursive: true });
  const paths = [...globSync('src/**/*'), ...globSync('dist/**/*'), ...globSync('test/playground/helpers/*retention*'),
    'test/playground/helpers/heap-snapshot.ts', 'test/playground/memory-retention.spec.ts',
    'package.json', 'package-lock.json', 'playwright.performance.config.ts'];
  const hashes: Record<string, string> = {};
  for (const path of paths) if ((await stat(path)).isFile()) hashes[path] = createHash('sha256').update(await readFile(path)).digest('hex');
  await writeFile(join(directory, 'manifest.json'), JSON.stringify({
    head: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
    target: 'working-tree file hashes', test: info.title, node: process.version, hashes,
  }, null, 2));
  return directory;
}

async function record(directory: string, info: TestInfo, value: unknown): Promise<void> {
  const json = JSON.stringify(value, null, 2);
  await writeFile(join(directory, 'result.json'), json);
  await info.attach('memory-retention', { body: json, contentType: 'application/json' });
  console.log(JSON.stringify({ memoryRetention: info.title, evidence: directory, result: value }));
}

for (const kind of ['core', 'vanilla'] as const) {
  test(`${kind} same scope retains bounded memory without remount`, async ({ page, context, browser }, info) => {
    test.setTimeout(180_000);
    const directory = await evidence(info); let pageErrors = 0;
    page.on('pageerror', () => { pageErrors++; });
    await openRetentionPage(page);
    const cdp = await context.newCDPSession(page); await cdp.send('Performance.enable');
    await mountRetentionFixture(page, kind);
    await exerciseNativeInput(page);
    await pendingAttempts(page, 10_000);
    const samples = [await collectHeap(page, cdp)];
    for (let batch = 0; batch < 3; batch++) {
      await pendingAttempts(page, 100_000);
      samples.push(await collectHeap(page, cdp));
    }
    const live = await snapshotMachines(cdp, directory, 'live');
    const counts = await page.evaluate(() => window.__retention.counts);
    const heapRange = Math.max(...samples.map((s) => s.heapBytes)) - Math.min(...samples.map((s) => s.heapBytes));
    await record(directory, info, { browser: browser.version(), syntheticPendingAttempts: 310_000,
      nativeClicks: 20, nativeCommits: 20, nativeCancels: 20, captureStub: false, samples, live, counts, heapRange, pageErrors });
    expect.soft(live.instances).toBe(1);
    expect.soft(live.histories).toEqual([]);
    expect.soft(heapRange).toBeLessThanOrEqual(1024 * 1024);
    for (const sample of samples) {
      expect.soft(sample.nodes).toBe(samples[0]!.nodes);
      expect.soft(sample.jsEventListeners).toBe(samples[0]!.jsEventListeners);
      expect.soft(sample.documents).toBe(samples[0]!.documents);
    }
    expect(pageErrors).toBe(0);
    expect(counts.errors).toBe(0);
    await cdp.detach();
  });

  for (const mode of ['unregister-destroy', 'destroy-unregister', 'disposer-only'] as const) {
    test(`${kind} completed ${mode} disposers release scope and fixture DOM`, async ({ page, context, browser }, info) => {
      test.setTimeout(90_000);
      const directory = await evidence(info); let pageErrors = 0;
      page.on('pageerror', () => { pageErrors++; });
      await openRetentionPage(page);
      const cdp: CDPSession = await context.newCDPSession(page); await cdp.send('Performance.enable');
      const empty = await collectHeap(page, cdp);
      await mountRetentionFixture(page, kind);
      await pendingAttempts(page, 1000);
      await collectHeap(page, cdp);
      const live = await snapshotMachines(cdp, directory, 'live');
      await retainCompletedDisposers(page, mode);
      const completed = await collectHeap(page, cdp);
      const retained = await snapshotMachines(cdp, directory, 'completed-disposers-retained');
      // 사용자 보유 참조만 바꾼 대조. 실패하더라도 원시 증거와 대조 결과를 먼저 저장한다.
      await page.evaluate(() => { window.__retention.disposers = []; window.__retention.api = null; });
      const released = await collectHeap(page, cdp);
      const afterRelease = await snapshotMachines(cdp, directory, 'external-handles-released');
      await record(directory, info, { browser: browser.version(), mode, empty, live, completed, retained,
        released, afterRelease, pageErrors, counts: await page.evaluate(() => window.__retention.counts) });
      expect.soft(live.instances).toBe(1);
      expect.soft(retained.instances).toBe(0);
      expect.soft(completed.nodes).toBe(empty.nodes);
      expect.soft(completed.jsEventListeners).toBe(empty.jsEventListeners);
      expect.soft(completed.documents).toBe(empty.documents);
      expect(afterRelease.instances).toBe(0);
      expect(pageErrors).toBe(0);
      await cdp.detach();
    });
  }
}
