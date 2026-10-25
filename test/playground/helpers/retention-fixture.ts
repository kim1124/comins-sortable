import { readFile } from 'node:fs/promises';
import { isAbsolute, relative, resolve } from 'node:path';
import { expect, type Page } from '@playwright/test';
import type { AfterDragResult, SortableChange, SortableScope } from '../../../src/core.js';

export type RetentionApi = 'core' | 'vanilla';
interface FixtureCounts { starts: number; ends: number; changes: number; errors: number; reasons: Record<string, number> }
interface RetentionFixture {
  api: Pick<SortableScope, 'destroy' | 'cancel'> | null;
  disposers: Array<() => void>;
  counts: FixtureCounts;
}
declare global { interface Window { __retention: RetentionFixture } }

export async function openRetentionPage(page: Page): Promise<void> {
  const root = resolve('dist');
  await page.route('**/__retention__/**', async (route) => {
    const pathname = new URL(route.request().url()).pathname;
    if (pathname === '/__retention__/') {
      await route.fulfill({ contentType: 'text/html', body: '<!doctype html><html><body></body></html>' });
      return;
    }
    const file = resolve(root, `.${decodeURIComponent(pathname.slice('/__retention__'.length))}`);
    const path = relative(root, file);
    if (path.startsWith('..') || isAbsolute(path) || !file.endsWith('.js')) { await route.abort(); return; }
    await route.fulfill({ contentType: 'text/javascript', body: await readFile(file) });
  });
  await page.goto('/__retention__/');
}

export async function mountRetentionFixture(page: Page, kind: RetentionApi): Promise<void> {
  await page.evaluate(async (kind) => {
    const coreEntry = '/__retention__/core.js'; const vanillaEntry = '/__retention__/index.js';
    const core = await import(coreEntry);
    const vanilla = await import(vanillaEntry);
    const makeArea = (id: string, x: number, ids: string[]): HTMLElement => {
      const area = document.createElement('ul'); area.id = `retention-${id}`;
      area.style.cssText = `position:absolute;left:${x}px;top:20px;width:280px;height:100px;margin:0;padding:0;`;
      for (const id of ids) {
        const item = document.createElement('li'); item.dataset.sortableId = id;
        item.style.cssText = 'display:block;width:280px;height:45px;'; item.textContent = id; area.append(item);
      }
      document.body.append(area); return area;
    };
    const root = makeArea('root', 20, ['a', 'b']);
    const extra = makeArea('extra', 400, ['c', 'd']);
    const counts: FixtureCounts = { starts: 0, ends: 0, changes: 0, errors: 0, reasons: {} };
    // 계수만 보존한다. 반복 로그나 fixture DOM을 callback에 저장하지 않는다.
    const options = {
      onDragStart: () => { counts.starts++; },
      onAfterDrag: (result: AfterDragResult) => { counts.ends++; counts.reasons[result.reason] = (counts.reasons[result.reason] ?? 0) + 1; },
      onChange: (change: SortableChange) => {
        counts.changes++;
        if (kind !== 'core') return;
        for (const order of change.orders) {
          const area = document.querySelector(`[data-comins-sortable-area="${order.areaId}"]`)!;
          const items = new Map(Array.from(area.children).filter((e) => e.hasAttribute('data-sortable-id')).map((e) => [e.getAttribute('data-sortable-id'), e]));
          for (const id of order.itemIds) area.append(items.get(String(id))!);
        }
      },
      onError: () => { counts.errors++; },
    };
    const areaOptions = { areaId: 'root', item: '[data-sortable-id]', autoScroll: false, animation: false as const };
    const api = kind === 'core' ? core.createSortableScope(options) : vanilla.createSortable(root, { ...options, ...areaOptions });
    const disposers: Array<() => void> = [];
    if (kind === 'core') disposers.push(api.registerArea(root, areaOptions));
    disposers.push(api.registerArea(extra, { ...areaOptions, areaId: 'extra' }));
    window.__retention = { api, disposers, counts };
  }, kind);
}

export async function pendingAttempts(page: Page, count: number): Promise<void> {
  await page.evaluate((count) => {
    const item = document.querySelector('#retention-root > [data-sortable-id]')!;
    const input = { pointerId: 1, pointerType: 'mouse', isPrimary: true, button: 0, bubbles: true, cancelable: true, clientX: 40, clientY: 40 };
    for (let i = 0; i < count; i++) {
      item.dispatchEvent(new PointerEvent('pointerdown', input));
      document.dispatchEvent(new PointerEvent('pointerup', input));
    }
  }, count);
}

export async function exerciseNativeInput(page: Page): Promise<void> {
  for (let i = 0; i < 20; i++) await page.mouse.click(40, 40);
  for (const cancel of [false, true]) {
    for (let i = 0; i < 20; i++) {
      const before = await page.locator('#retention-root > [data-sortable-id]').evaluateAll((items) => items.map((e) => e.getAttribute('data-sortable-id')));
      await page.mouse.move(40, 40); await page.mouse.down(); await page.mouse.move(52, 52);
      await expect(page.locator('[data-comins-sortable-dragging]')).toHaveCount(1);
      if (cancel) await page.keyboard.press('Escape');
      else {
        const box = await page.locator('#retention-root > [data-sortable-id]').last().boundingBox();
        if (box === null) throw new Error('Missing destination');
        await page.mouse.move(box.x + 20, box.y + box.height - 4);
      }
      await page.mouse.up();
      await expect(page.locator('[data-comins-sortable-dragging],[data-comins-sortable-placeholder]')).toHaveCount(0);
      await expect.poll(() => page.locator('#retention-root > [data-sortable-id]').evaluateAll((items) => items.map((e) => e.getAttribute('data-sortable-id')))).toEqual(cancel ? before : [...before].reverse());
    }
  }
  expect(await page.evaluate(() => window.__retention.counts)).toEqual({ starts: 40, ends: 40, changes: 20, errors: 0, reasons: { drop: 20, escape: 20 } });
}

export async function retainCompletedDisposers(page: Page, mode: 'unregister-destroy' | 'destroy-unregister' | 'disposer-only'): Promise<void> {
  await page.evaluate((mode) => {
    if (mode !== 'destroy-unregister') for (const dispose of window.__retention.disposers) dispose();
    if (mode !== 'disposer-only') window.__retention.api!.destroy();
    if (mode === 'destroy-unregister') for (const dispose of window.__retention.disposers) dispose();
    if (mode === 'disposer-only') window.__retention.api = null;
    // Vanilla의 초기 area를 포함하여 document의 다른 정상 보유 경로도 제거한다.
    document.body.replaceChildren();
  }, mode);
}
