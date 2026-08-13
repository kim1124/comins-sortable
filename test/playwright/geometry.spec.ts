import { expect, test } from '@playwright/test';
import {
  beginDrag,
  expectAtomicChange,
  expectDestinationIndex,
  expectIds,
  fixtureState,
  waitForFixture,
  waitForFrameworkRender,
} from './helpers/drag.js';

for (const adapter of ['vanilla', 'react', 'vue', 'svelte'] as const) {
  test.describe(`${adapter} geometry`, () => {
    test.beforeEach(async ({ page }) => {
      await page.goto(`/${adapter}/`);
      await waitForFixture(page);
    });
    test('reorders across horizontal item midpoints with variable widths and a CSS gap', async ({ page }) => {
      await page.evaluate(() => window.__sortableFixture?.controls.horizontal?.());
      await waitForFrameworkRender(page);
      const geometry = await page.locator('[data-comins-sortable-area="todo"] [data-sortable-id]').evaluateAll(
        (items) => items.map((item) => {
          const rect = item.getBoundingClientRect();
          return { id: item.getAttribute('data-sortable-id'), x: rect.x, width: rect.width, right: rect.right };
        }),
      );
      expect(geometry.map((item) => item.id)).toEqual(['a', 'b']);
      expect(geometry[0]?.x).toBeLessThan(geometry[1]?.x ?? 0);
      expect(geometry[0]?.width).not.toBe(geometry[1]?.width);
      expect((geometry[1]?.x ?? 0) - (geometry[0]?.right ?? 0)).toBeGreaterThan(0);

      const drag = await beginDrag(page, 'todo', 'b');
      await drag.moveBefore('todo', 'a');
      await drag.drop();
      await expectIds(page, 'todo', ['b', 'a']);
      await expectAtomicChange(page, {
        operation: 'reorder', sourceAreaId: 'todo', destinationAreaId: 'todo', itemId: 'b',
      });
      await expectDestinationIndex(page, 0);
      await expect.poll(async () => (await fixtureState(page)).events.filter((event) => event === 'change').length).toBe(1);
    });
    test('inserts at zero into an actual empty horizontal zero-width destination threshold', async ({ page }) => {
      await page.evaluate(() => window.__sortableFixture?.controls.emptyGeometry?.());
      await waitForFrameworkRender(page);
      const destination = page.locator('[data-comins-sortable-area="done"]');
      await expect(destination.locator('[data-sortable-id]')).toHaveCount(0);
      await expect(destination).toHaveClass(/horizontal/);
      await expect.poll(async () => destination.evaluate((element) => element.getBoundingClientRect().width)).toBe(0);
      const drag = await beginDrag(page, 'todo', 'a');
      await drag.moveBefore('done');
      await drag.drop();
      await expectIds(page, 'done', ['a']);
      await expectAtomicChange(page, {
        operation: 'transfer', sourceAreaId: 'todo', destinationAreaId: 'done', itemId: 'a',
      });
      await expectDestinationIndex(page, 0);
      await expect.poll(async () => (await fixtureState(page)).events.filter((event) => event === 'change').length).toBe(1);
    });
  });
}
