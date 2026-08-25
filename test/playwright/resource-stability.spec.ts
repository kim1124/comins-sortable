import { expect, test } from '@playwright/test';
import { beginDrag, fixtureResourceCounts, waitForFixture } from './helpers/drag.js';

for (const adapter of ['vanilla', 'react', 'vue', 'svelte'] as const) {
  test(`${adapter} releases real DOM drag resources after repeated cancel and destroy cycles @resource`, async ({ page }) => {
    await page.goto(`/${adapter}/`);
    await waitForFixture(page);
    for (let cycle = 0; cycle < 50; cycle += 1) {
      const drag = await beginDrag(page, 'todo', 'b');
      if (cycle % 2 === 0) await page.keyboard.press('Escape');
      else await page.evaluate(() => window.__sortableFixture?.controls.destroy?.());
      await page.evaluate(() => window.__sortableFixture?.controls.remount?.());
      await drag.drop().catch(() => undefined);
    }
    await expect(page.locator('[data-comins-sortable-placeholder]')).toHaveCount(0);
    await expect(page.locator('[data-comins-sortable-dragging]')).toHaveCount(0);
    await expect(page.locator('[data-comins-sortable-over]')).toHaveCount(0);
    await expect.poll(() => fixtureResourceCounts(page)).toEqual({ activeSessions: 0, placeholders: 0 });
  });
}
