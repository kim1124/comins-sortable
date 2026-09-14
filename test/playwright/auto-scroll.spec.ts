import { expect, test } from '@playwright/test';
import { beginDrag, waitForFixture } from './helpers/drag.js';

for (const adapter of ['vanilla', 'react', 'vue', 'svelte'] as const) {
  test(`${adapter} scrolls its nearest scroll container before the page`, async ({ page }) => {
    await page.goto(`/${adapter}/`);
    await waitForFixture(page);
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.evaluate(() => window.__sortableFixture?.controls.scrollable?.());
    await expect.poll(() => page.locator('[data-test-scroll]').evaluate((element) => ({
      top: (element as HTMLElement).scrollTop,
      max: (element as HTMLElement).scrollHeight - (element as HTMLElement).clientHeight,
    }))).toMatchObject({ top: expect.any(Number), max: expect.any(Number) });
    const baseline = await page.locator('[data-test-scroll]').evaluate((element) => ({
      inner: (element as HTMLElement).scrollTop,
      max: (element as HTMLElement).scrollHeight - (element as HTMLElement).clientHeight,
      page: window.scrollY,
    }));
    expect(baseline.inner).toBeLessThan(baseline.max);
    const drag = await beginDrag(page, 'todo', 'b');
    await expect(page.locator('[data-comins-sortable-dragging]')).toHaveCount(1);
    await drag.moveToScrollEdge();
    await expect.poll(() => page.locator('[data-test-scroll]').evaluate((element) => (
      (element as HTMLElement).scrollTop
    ))).toBeGreaterThan(baseline.inner);
    const positions = await page.evaluate(() => ({ inner: document.querySelector<HTMLElement>('[data-test-scroll]')?.scrollTop ?? 0, page: window.scrollY }));
    expect(positions.inner).toBeGreaterThan(baseline.inner);
    expect(positions.page).toBe(baseline.page);
    await page.keyboard.press('Escape');
  });
}

test('RTL page auto-scroll reaches negative offsets and returns toward the right edge', async ({ page }) => {
  await page.goto('/vanilla/');
  await waitForFixture(page);
  await page.evaluate(() => {
    document.documentElement.dir = 'rtl';
    document.body.style.width = '2400px';
    document.body.style.minHeight = '100vh';
    const main = document.querySelector('main')!;
    Object.assign(main.style, { position: 'fixed', right: '40px', top: '40px', width: '600px' });
    window.scrollTo(0, 0);
  });
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeGreaterThan(page.viewportSize()!.width);
  await beginDrag(page, 'todo', 'a');
  await page.mouse.move(2, 300);
  await expect.poll(() => page.evaluate(() => window.scrollX)).toBeLessThan(-30);
  const left = await page.evaluate(() => window.scrollX);
  await page.mouse.move(page.viewportSize()!.width - 2, 300);
  await expect.poll(() => page.evaluate(() => window.scrollX)).toBeGreaterThan(left);
  await page.keyboard.press('Escape');
  await page.mouse.up();
});

for (const adapter of ['vanilla', 'react', 'vue', 'svelte'] as const) {
  test(`${adapter} auto-scrolls an RTL container in both directions and stops on cancel`, async ({ page }) => {
    await page.goto(`/${adapter}/`);
    await waitForFixture(page);
    const scroll = page.locator('[data-test-scroll]');
    await scroll.evaluate((element) => {
      Object.assign((element as HTMLElement).style, {
        display: 'block', direction: 'rtl', width: '360px',
        height: '240px', maxHeight: '240px', overflowX: 'auto', overflowY: 'hidden',
      });
      for (const child of element.children) (child as HTMLElement).style.minWidth = '800px';
      element.scrollLeft = 0;
    });
    await beginDrag(page, 'todo', 'a');
    const box = await scroll.boundingBox();
    if (box === null) throw new Error('Missing RTL container');
    const baseline = await scroll.evaluate((element) => element.scrollLeft);
    await page.mouse.move(box.x + 4, box.y + 100);
    await expect.poll(() => scroll.evaluate((element) => element.scrollLeft)).toBeLessThan(baseline - 30);
    const left = await scroll.evaluate((element) => element.scrollLeft);
    await page.mouse.move(box.x + box.width - 4, box.y + 100);
    await expect.poll(() => scroll.evaluate((element) => element.scrollLeft)).toBeGreaterThan(left);
    expect(await page.evaluate(() => window.scrollX)).toBe(0);
    await page.keyboard.press('Escape');
    await page.mouse.up();
    const stopped = await scroll.evaluate((element) => element.scrollLeft);
    await page.evaluate(() => new Promise<void>((resolve) => {
      requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
    }));
    expect(await scroll.evaluate((element) => element.scrollLeft)).toBe(stopped);
  });
}
