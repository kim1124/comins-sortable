import { expect, test } from '@playwright/test';
import { beginDrag, dragItem, expectAtomicChange, expectDestinationIndex, expectEventOrder, expectIds, fixtureState, item, waitForFixture, waitForFrameworkRender } from './helpers/drag.js';

const adapters = ['vanilla', 'react', 'vue', 'svelte'] as const;

for (const adapter of adapters) {
  test.describe(adapter, () => {
    test.beforeEach(async ({ page }) => {
      await page.goto(`/${adapter}/`);
      await waitForFixture(page);
    });

    test('reorders inside one area with a visible placeholder', async ({ page }) => {
      await expect(page.getByRole('list')).toHaveCount(2);
      await expect(page.getByRole('listitem')).toHaveCount(4);
      await expect(item(page, 'todo', 'b')).toHaveAttribute('aria-label', 'Item b');
      await expect(item(page, 'todo', 'b')).toHaveAttribute('aria-selected', 'false');
      const drag = await beginDrag(page, 'todo', 'b');
      await drag.moveBefore('todo', 'a');
      const placeholder = page.locator('[data-comins-sortable-placeholder]');
      await expect(placeholder).toHaveCount(1);
      await expect(placeholder).toBeEmpty();
      await expect(placeholder).toHaveAttribute('aria-hidden', 'true');
      await expect(item(page, 'todo', 'b')).toHaveAttribute('aria-label', 'Item b');
      await expect(item(page, 'todo', 'b')).toHaveAttribute('aria-selected', 'false');
      await expect.poll(async () => (await fixtureState(page)).events.filter((event) => event === 'insert').length).toBe(1);
      await drag.moveBefore('todo', 'a');
      await expect.poll(async () => (await fixtureState(page)).events.filter((event) => event === 'insert').length).toBe(1);
      await drag.drop();
      await expectIds(page, 'todo', ['b', 'a']);
      await expectEventOrder(page, ['before', 'start', 'drag', 'insert', 'change', 'after:dropped:drop']);
      await expect(item(page, 'todo', 'b')).toHaveAttribute('aria-label', 'Item b');
      await expect(item(page, 'todo', 'b')).toHaveAttribute('aria-selected', 'false');
    });

    test('transfers into the pointer index of another area', async ({ page }) => {
      await dragItem(page, 'todo', 'b', { areaId: 'done', beforeId: 'd' });
      await expectIds(page, 'todo', ['a']);
      await expectIds(page, 'done', ['c', 'b', 'd']);
      await expectAtomicChange(page, { operation: 'transfer', sourceAreaId: 'todo', destinationAreaId: 'done', itemId: 'b' });
    });

    test('inserts into an empty destination at index zero', async ({ page }) => {
      await page.getByRole('button', { name: 'Clear done' }).click();
      await expect(page.locator('[data-comins-sortable-area="done"] [data-sortable-id]')).toHaveCount(0);
      await waitForFrameworkRender(page);
      await dragItem(page, 'todo', 'a', { areaId: 'done' });
      await expectIds(page, 'done', ['a']);
      await expectDestinationIndex(page, 0);
    });

    test('honors reduced motion for the active drag and placeholder', async ({ page }) => {
      await page.emulateMedia({ reducedMotion: 'reduce' });
      const drag = await beginDrag(page, 'todo', 'b');
      await drag.moveBefore('todo', 'a');
      const transitions = await page.locator('[data-comins-sortable-dragging], [data-comins-sortable-placeholder]').evaluateAll(
        (elements) => elements.map((element) => getComputedStyle(element).transitionDuration),
      );
      expect(transitions).toHaveLength(2);
      expect(transitions.every((duration) => duration === '0s')).toBe(true);
      await page.keyboard.press('Escape');
    });
  });
}
