import { expect, test } from '@playwright/test';

import { area, beginDrag, expectIds, fixtureState, waitForFixture } from './helpers/drag.js';

for (const adapter of ['vanilla', 'react', 'vue', 'svelte'] as const) {
  test(`${adapter} rejects an exposed descendant host for the actual parent @drag-contract`, async ({ page }, testInfo) => {
    // The headless parent relationship can have an independently positioned host.
    // Keep the destination exposed instead of chasing children inside the moving source.
    await page.goto(`/${adapter}/?nested-parent`);
    await waitForFixture(page);
    await page.evaluate(() => document.addEventListener('pointermove', (event) => {
      document.documentElement.dataset.dropProbe = JSON.stringify({
        point: { x: event.clientX, y: event.clientY },
        hits: document.elementsFromPoint(event.clientX, event.clientY).map((element) => ({
          tag: element.tagName, areaId: element.getAttribute('data-comins-sortable-area'),
          itemId: element.getAttribute('data-sortable-id'),
        })),
      });
    }));
    const drag = await beginDrag(page, 'todo', 'a');
    await drag.moveBefore('done', 'c', false);
    await testInfo.attach('drop-hit-test', { body: await page.locator('html').getAttribute('data-drop-probe') ?? '', contentType: 'application/json' });
    const rejection = await page.evaluate(() => {
      const destination = document.querySelector('[data-comins-sortable-area="done"]');
      const item = destination?.querySelector('[data-sortable-id="c"]');
      return {
        areaScopedMatch: item !== undefined && item !== null && Array.from(destination?.querySelectorAll(':scope > *') ?? []).includes(item),
        itemScopedMatch: item?.matches(':scope > *'),
        feedback: Array.from(document.querySelectorAll('[data-comins-sortable-rejection]')).map((element) => ({
          itemId: element.getAttribute('data-sortable-id'),
          reason: element.getAttribute('data-comins-sortable-rejection'),
        })),
      };
    });
    await expect(area(page, 'done'), JSON.stringify(rejection)).toHaveAttribute('data-comins-sortable-rejection', 'nested-cycle');
    await expect(page.locator('[data-comins-sortable-dragging]')).toHaveAttribute('data-comins-sortable-rejection', 'nested-cycle');
    await drag.drop();
    await expectIds(page, 'todo', ['a', 'b']);
    await expectIds(page, 'done', ['c', 'd']);
    await expect.poll(async () => (await fixtureState(page)).events.filter((event) => event.startsWith('after:')))
      .toEqual(['after:rejected:nested-cycle']);
    const state = await fixtureState(page);
    expect(state.lastOperation).toBe(null);
    expect(state.events).not.toContain('change');
    expect(state.resources).toEqual({ activeSessions: 0, placeholders: 0 });
  });
}
