import { expect, test, type Page } from '@playwright/test';
import { touchDrag } from '../playwright/helpers/touch.js';
import { domIds } from './helpers/drag.js';

async function ready(page: Page) {
  await expect(page.locator('.cs-playground__status')).toHaveText('Live');
  await expect(page.locator('[data-sortable-id="research"]')).toBeVisible();
}
const card = (page: Page, id: string) => page.locator(`[data-sortable-id="${id}"]`);
for (const adapter of ['vanilla', 'react', 'vue', 'svelte']) {
  test(`${adapter} touch handle reorders and cancellation preserves order @touch`, async ({ page }) => {
    await page.goto(`/examples/handle/${adapter}`); await ready(page);
    let drag = await touchDrag(page, card(page, 'design').locator('.cs-demo-handle'));
    await expect(card(page, 'design')).toHaveAttribute('data-comins-sortable-dragging', '');
    await drag.moveTo(card(page, 'research'));
    await drag.end();
    await expect.poll(() => domIds(page, 'todo')).toEqual(['design', 'research', 'build', 'review']);
    drag = await touchDrag(page, card(page, 'build').locator('.cs-demo-handle'));
    await expect(card(page, 'build')).toHaveAttribute('data-comins-sortable-dragging', '');
    await drag.moveTo(card(page, 'design'));
    await drag.end(true);
    await expect.poll(() => domIds(page, 'todo')).toEqual(['design', 'research', 'build', 'review']);
    await expect(page.locator('[data-playground-dragging]')).toHaveCount(0);
  });
  test(`${adapter} body touch scroll does not sort @touch`, async ({ page }) => {
    await page.goto(`/examples/handle/${adapter}`); await ready(page);
    await page.locator('[data-comins-sortable-area="todo"]').evaluate((el) => {
      Object.assign((el as HTMLElement).style, { height: '130px', overflow: 'auto', display: 'block' });
    });
    const label = card(page, 'research').locator('.cs-demo-card__copy');
    const box = await label.boundingBox(); if (!box) throw new Error('Missing text');
    const drag = await touchDrag(page, label);
    await drag.move(box.x + 10, box.y - 80); await drag.end();
    await expect.poll(() => page.locator('[data-comins-sortable-area="todo"]').evaluate((el) => el.scrollTop)).toBeGreaterThan(0);
    expect(await domIds(page, 'todo')).toEqual(['research', 'design', 'build', 'review']);
  });
  test(`${adapter} secondary touch cannot replace the active item @touch`, async ({ page }) => {
    await page.goto(`/examples/handle/${adapter}`); await ready(page);
    const drag = await touchDrag(page, card(page, 'design').locator('.cs-demo-handle'));
    await expect(card(page, 'design')).toHaveAttribute('data-comins-sortable-dragging', '');
    await drag.secondPointer();
    await expect(card(page, 'design')).toHaveAttribute('data-comins-sortable-dragging', '');
    await expect(page.locator('[data-comins-sortable-dragging]')).toHaveCount(1);
    await drag.end(true);
    expect(await domIds(page, 'todo')).toEqual(['research', 'design', 'build', 'review']);
  });
}

for (const adapter of ['vanilla', 'react', 'vue', 'svelte']) {
  test(`${adapter} touch transfers into an empty area @touch`, async ({ page }) => {
    await page.goto(`/examples/empty/${adapter}`); await ready(page);
    const drag = await touchDrag(page, card(page, 'research').locator('.cs-demo-handle'));
    await expect(card(page, 'research')).toHaveAttribute('data-comins-sortable-dragging', '');
    const destination = page.locator('[data-comins-sortable-area="done"]');
    const box = await destination.boundingBox(); if (!box) throw new Error('Missing empty area');
    await drag.move(box.x + box.width / 2, box.y + box.height / 2);
    await expect(destination.locator('[data-comins-sortable-placeholder]')).toHaveCount(1);
    await drag.end();
    await expect.poll(async () => JSON.parse(await page.locator('[data-playground-model]').innerText())).toMatchObject({ todo: ['design'], done: ['research'] });
    await expect.poll(() => domIds(page, 'done')).toEqual(['research']);
    await expect.poll(() => domIds(page, 'todo')).toEqual(['design']);
  });
  test(`${adapter} touch drag auto-scrolls and stops on cancellation @touch`, async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 1200 });
    await page.goto(`/examples/auto-scroll/${adapter}`); await ready(page);
    const initialModel = JSON.parse(await page.locator('[data-playground-model]').innerText());
    const initialIds = await domIds(page, 'todo');
    const board = page.locator('.cs-demo-board');
    const box = await board.boundingBox(); if (!box) throw new Error('Missing scroll board');
    const drag = await touchDrag(page, card(page, 'research').locator('.cs-demo-handle'));
    await expect(card(page, 'research')).toHaveAttribute('data-comins-sortable-dragging', '');
    await drag.move(box.x + box.width / 3, box.y + box.height - 8);
    await expect.poll(() => board.evaluate((element) => element.scrollTop)).toBeGreaterThan(0);
    await drag.end(true);
    const after = await board.evaluate((element) => element.scrollTop);
    await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    expect(await board.evaluate((element) => element.scrollTop)).toBe(after);
    expect(await domIds(page, 'todo')).toEqual(initialIds);
    expect(JSON.parse(await page.locator('[data-playground-model]').innerText())).toEqual(initialModel);
  });
}
