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
