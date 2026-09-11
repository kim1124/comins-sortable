import { expect, test, type Page } from '@playwright/test';
import { beginDrag, expectIds, fixtureState, waitForFixture } from './helpers/drag.js';

const adapters = ['vanilla', 'react', 'vue', 'svelte'] as const;
const sharedReasons = [
  ['outside', 'cancelled'],
  ['escape', 'cancelled'],
  ['pointer-cancel', 'cancelled'],
  ['blur', 'cancelled'],
  ['disabled', 'rejected'],
  ['reject', 'rejected'],
  ['unmount', 'cancelled'],
  ['callback-error', 'cancelled'],
] as const;

async function control(page: Page, name: string): Promise<void> {
  await page.evaluate(async (controlName) => {
    window.__sortableFixture?.controls[controlName]?.();
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
  }, name);
}

async function expectRollback(
  page: Page,
  reason: string,
  status: string,
  focusExpected: boolean,
  orderExpected = true,
  host: 'registered' | 'retained' | 'removed' = 'registered',
): Promise<void> {
  if (orderExpected) {
    if (host === 'registered') {
      await expectIds(page, 'todo', ['a', 'b']);
    } else {
      await expect.poll(async () => (await fixtureState(page)).areas.todo).toEqual(['a', 'b']);
      await expect(page.locator('[data-comins-sortable-area="todo"]')).toHaveCount(0);
      const retainedItems = page.locator('[data-test-area="todo"] > [data-sortable-id]');
      if (host === 'retained') {
        await expect.poll(() => retainedItems.evaluateAll((elements) => elements.map((element) => element.getAttribute('data-sortable-id'))))
          .toEqual(['a', 'b']);
      } else {
        await expect(page.locator('[data-test-area="todo"]')).toHaveCount(0);
        await expect(page.locator('[data-area-section="todo"] [data-sortable-id]')).toHaveCount(0);
      }
    }
  }
  await expect.poll(async () => {
    const events = (await fixtureState(page)).events;
    const after = `after:${status}:${reason === 'reject' ? 'not-accepted' : reason === 'unmount' ? 'unmounted' : reason === 'callback-error' ? 'error' : reason}`;
    const before = events.filter((event) => event === 'before').length;
    const start = events.filter((event) => event === 'start').length;
    const change = events.filter((event) => event === 'change').length;
    const changeExpected = reason === 'callback-error' || reason === 'state-not-committed' ? 1 : 0;
    return events[events.length - 1] === after
      && before === 1
      && start === 1
      && change === changeExpected
      && events.filter((event) => event === after).length === 1;
  }).toBe(true);
  await expect(page.locator('[data-comins-sortable-placeholder]')).toHaveCount(0);
  await expect(page.locator('[data-comins-sortable-dragging]')).toHaveCount(0);
  await expect(page.locator('[data-comins-sortable-over]')).toHaveCount(0);
  if (focusExpected) await expect(page.locator('[data-comins-sortable-area="todo"] [data-sortable-id="b"]')).toBeFocused();
}

for (const adapter of adapters) {
  test.describe(`${adapter} rollback`, () => {
    test.beforeEach(async ({ page }) => {
      await page.goto(`/${adapter}/`);
      await waitForFixture(page);
    });

    for (const [reason, status] of sharedReasons) {
      test(`reports the actual ${reason} trigger and restores the active drag`, async ({ page }) => {
        const source = page.locator('[data-comins-sortable-area="todo"] [data-sortable-id="b"]');
        await source.focus();
        const drag = await beginDrag(page, 'todo', 'b');

        if (reason === 'outside') {
          await drag.moveOutside();
          await drag.drop();
        } else if (reason === 'escape') {
          await page.keyboard.press('Escape');
        } else if (reason === 'pointer-cancel' || reason === 'blur' || reason === 'disabled') {
          await control(page, reason);
        } else if (reason === 'reject') {
          await control(page, reason);
          await drag.moveBefore('done', undefined, false);
          await drag.drop();
        } else if (reason === 'unmount') {
          await drag.moveBefore('done');
          await control(page, reason);
        } else {
          await control(page, reason);
          await drag.moveBefore('done');
          await drag.drop();
        }

        await expectRollback(page, reason, status, reason !== 'unmount', true,
          adapter === 'svelte' && reason === 'unmount' ? 'removed' : 'registered');
      });
    }

    if (adapter !== 'vanilla') {
      test('rejects a controlled update that does not commit rendered state', async ({ page }) => {
        const source = page.locator('[data-comins-sortable-area="todo"] [data-sortable-id="b"]');
        await source.focus();
        const drag = await beginDrag(page, 'todo', 'b');
        await control(page, 'state-not-committed');
        await drag.moveBefore('done');
        await drag.drop();
        await expectRollback(page, 'state-not-committed', 'rejected', true);
      });
    }

    test('cleans up when its public destroy control runs during an active drag', async ({ page }) => {
        const drag = await beginDrag(page, 'todo', 'b');
        await drag.moveBefore('done');
        await control(page, 'destroy');
        await expectRollback(page, 'destroyed', 'cancelled', false, adapter === 'vanilla', 'retained');
    });
  });
}
