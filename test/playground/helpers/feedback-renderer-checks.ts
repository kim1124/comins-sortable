import { expect, test, type Page } from '@playwright/test';
import { beginDrag, domIds } from './drag.js';

async function openRendererExample(page: Page, adapter: string): Promise<void> {
  await page.setViewportSize({ width: 1440, height: 1100 });
  await page.goto(`/examples/custom-placeholder/${adapter}`);
  await expect(page.locator('.cs-playground__status')).toHaveText('Live');
  await page.getByRole('button', { name: '사용자 콘텐츠 렌더링', exact: true }).click();
  await expect(page.getByRole('button', { name: '사용자 콘텐츠 렌더링', exact: true })).toHaveAttribute('aria-pressed', 'true');
}

async function model(page: Page): Promise<Record<string, string[]>> {
  return JSON.parse(await page.locator('[data-playground-model]').innerText()) as Record<string, string[]>;
}

async function expectClean(page: Page): Promise<void> {
  await expect(page.locator('[data-comins-sortable-placeholder], [data-comins-sortable-dragging], [data-comins-sortable-overlay], [data-comins-sortable-over], [data-comins-sortable-rejection]')).toHaveCount(0);
  await expect(page.locator('[data-sortable-id="build"]')).toBeVisible();
}

/** Included by the ordinary Playground suite so its existing browser projects own these checks. */
export function registerRendererChecks(): void {
  for (const adapter of ['vanilla', 'react', 'vue', 'svelte'] as const) {
    test(`${adapter} custom feedback renders both hosts and commits a direct transfer @renderer`, async ({ page }) => {
      await openRendererExample(page, adapter);
      const source = page.locator('[data-demo-area="todo"] > [data-sortable-id="build"]');
      const drag = await beginDrag(page, 'todo', 'build');
      const overlay = page.locator('body > [data-comins-sortable-overlay]');
      await expect(overlay).toHaveAttribute('inert', '');
      await expect(overlay).toHaveAttribute('aria-hidden', 'true');
      await expect(overlay).toHaveCSS('pointer-events', 'none');
      await expect(source).toBeHidden();
      await expect(page.locator('[data-comins-sortable-placeholder] > .cs-demo-rendered-placeholder')).toHaveText('Drop build');
      await expect(overlay.locator('.cs-demo-rendered-overlay')).toHaveText('build · todo');
      await drag.moveBefore('done', 'release');
      await expect(overlay.locator('.cs-demo-rendered-overlay')).toHaveText('build · done');
      await drag.drop();
      await expect.poll(async () => (await model(page)).done).toEqual(['build', 'release']);
      await expect.poll(() => domIds(page, 'done')).toEqual(['build', 'release']);
      await expectClean(page);
    });

    test(`${adapter} custom feedback updates rejection and restores the original item on escape @renderer`, async ({ page }) => {
      await openRendererExample(page, adapter);
      await page.getByRole('button', { name: '대상 이동 허용', exact: true }).click();
      const before = await model(page);
      const drag = await beginDrag(page, 'todo', 'build');
      await drag.moveBefore('done', 'release', false);
      await expect(page.locator('[data-comins-sortable-overlay]')).toHaveAttribute('data-comins-sortable-rejection', 'not-accepted');
      await expect(page.locator('.cs-demo-rendered-overlay')).toHaveText('build · not-accepted');
      await expect(page.locator('[data-comins-sortable-placeholder]')).toHaveCSS('visibility', 'hidden');
      await page.keyboard.press('Escape');
      await page.mouse.up();
      await expect.poll(() => model(page)).toEqual(before);
      await expectClean(page);
    });

    test(`${adapter} renderer option changes apply to the next activation @renderer`, async ({ page }) => {
      await openRendererExample(page, adapter);
      await beginDrag(page, 'todo', 'build');
      await page.getByRole('button', { name: '사용자 콘텐츠 렌더링', exact: true }).evaluate((button) => (button as HTMLButtonElement).click());
      await expect(page.locator('[data-comins-sortable-overlay]')).toHaveCount(1);
      await page.keyboard.press('Escape');
      await page.mouse.up();
      await expectClean(page);
      const defaultDrag = await beginDrag(page, 'todo', 'build');
      await expect(page.locator('[data-comins-sortable-overlay]')).toHaveCount(0);
      await expect(page.locator('[data-comins-sortable-dragging]')).toHaveAttribute('data-sortable-id', 'build');
      await defaultDrag.moveBefore('done', 'release');
      await defaultDrag.drop();
      await expect.poll(async () => (await model(page)).done).toEqual(['build', 'release']);
      await expectClean(page);
    });
  }
}
