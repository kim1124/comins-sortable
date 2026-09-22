import { expect, test } from '@playwright/test';
import { item, waitForFixture } from './helpers/drag.js';

test('selected class updates and destroy clear markers on retained consumer DOM', async ({ page }) => {
  await page.goto('/vanilla/?selection-lifecycle');
  await waitForFixture(page);
  const selected = item(page, 'todo', 'a');
  await selected.click();
  await expect(selected).toHaveClass(/selection-before/);
  await page.locator('[data-test-selection-class]').click();
  await expect(selected).not.toHaveClass(/selection-before/);
  await expect(selected).toHaveClass(/selection-after/);
  await expect(selected).toHaveAttribute('data-comins-sortable-selected', '');
  await page.evaluate(() => window.__sortableFixture?.controls.destroy?.());
  const retained = page.locator('[data-test-area="todo"] > [data-sortable-id="a"]');
  await expect(retained).toHaveClass('fixture-item');
  await expect(retained).not.toHaveAttribute('data-comins-sortable-selected');
  await expect(retained).toHaveText('a');
});
