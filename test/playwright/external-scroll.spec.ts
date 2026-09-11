import { expect, test } from '@playwright/test';
import { beginDrag, expectIds, fixtureState, item, waitForFixture } from './helpers/drag.js';

for (const immediateDrop of [false, true]) {
  test(`external page scroll reorders with a stationary pointer${immediateDrop ? ' and immediate drop' : ''} @core-fix`, async ({ page }) => {
    await page.goto('/vanilla/?page-scroll');
    await waitForFixture(page);
    await page.evaluate(() => {
      window.scrollTo(0, 200);
      document.addEventListener('pointermove', (event) => {
        document.documentElement.dataset.pointerY = String(event.clientY);
      });
    });
    const drag = await beginDrag(page, 'todo', 'b');
    const target = await item(page, 'todo', 'a').boundingBox();
    if (target === null) throw new Error('Missing first item');
    const pointerY = Number(await page.locator('html').getAttribute('data-pointer-y'));
    const beforeScroll = await page.evaluate(() => scrollY);
    const nextScroll = beforeScroll + target.y + 8 - pointerY;
    expect(nextScroll).toBeGreaterThanOrEqual(0);
    expect(nextScroll).toBeLessThan(beforeScroll);
    await page.evaluate((top) => window.scrollTo(0, top), nextScroll);
    if (!immediateDrop) {
      await expect.poll(() => page.locator('[data-comins-sortable-placeholder]').evaluate((element) =>
        element.nextElementSibling?.getAttribute('data-sortable-id'))).toBe('a');
    }
    await drag.drop();
    await expectIds(page, 'todo', ['b', 'a']);
    const state = await fixtureState(page);
    expect(state.events.filter((event) => event === 'change')).toHaveLength(1);
    expect(state.resources).toEqual({ activeSessions: 0, placeholders: 0 });
  });
}
