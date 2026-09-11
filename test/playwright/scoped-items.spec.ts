import { expect, test } from '@playwright/test';
import { area, beginDrag, expectIds, fixtureState, item, waitForFixture } from './helpers/drag.js';

test('scoped items reorder past the source while retaining the footer boundary @core-fix', async ({ page }) => {
  await page.goto('/vanilla/?scoped-items&slots');
  await waitForFixture(page);
  const drag = await beginDrag(page, 'todo', 'b');
  await drag.moveBefore('todo', 'a');
  const first = await item(page, 'todo', 'a').boundingBox();
  if (first === null) throw new Error('Missing first item');
  await page.mouse.move(first.x + first.width / 2, first.y + first.height - 4);
  await expect.poll(() => page.locator('[data-comins-sortable-placeholder]').evaluate((element) =>
    element.nextElementSibling?.getAttribute('data-test-footer'))).toBe('todo');
  await drag.drop();
  await expectIds(page, 'todo', ['a', 'b']);
  await expect(area(page, 'todo').locator(':scope > :last-child')).toHaveAttribute('data-test-footer', 'todo');
});

test('scoped items select the actual swap target @core-fix', async ({ page }) => {
  await page.goto('/vanilla/?scoped-items&swap');
  await waitForFixture(page);
  const drag = await beginDrag(page, 'todo', 'a');
  const target = item(page, 'todo', 'b');
  const box = await target.boundingBox();
  if (box === null) throw new Error('Missing swap target');
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await expect(target).toHaveAttribute('data-comins-sortable-swap-target', '');
  await drag.drop();
  await expectIds(page, 'todo', ['b', 'a']);
  expect((await fixtureState(page)).lastOperation?.operation).toBe('swap');
});

for (const invalidCopy of [false, true]) {
  test(`scoped Copy ${invalidCopy ? 'rejects a nonmatching destination copy' : 'validates a detached copy in its destination'} @core-fix`, async ({ page }) => {
    await page.goto(`/vanilla/?scoped-items&copy-items&slots${invalidCopy ? '&invalid-copy' : ''}`);
    await waitForFixture(page);
    // Copy uses an inert preview rather than marking the original as dragging.
    const source = item(page, 'todo', 'a');
    const box = await source.boundingBox();
    if (box === null) throw new Error('Missing copy source');
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2 + 12, box.y + box.height / 2 + 12);
    await expect(page.locator('[data-comins-sortable-dragging]')).toHaveAttribute('inert', '');
    await expect(source).toBeVisible();
    expect((await fixtureState(page)).events).toContain('source:todo:a');
    const destination = await item(page, 'done', 'c').boundingBox();
    if (destination === null) throw new Error('Missing copy destination');
    await page.mouse.move(destination.x + 8, destination.y + 8);
    await expect(area(page, 'done').locator('[data-comins-sortable-placeholder]')).toHaveCount(1);
    await page.mouse.up();
    await expectIds(page, 'todo', ['a', 'b']);
    await expectIds(page, 'done', invalidCopy ? ['c', 'd'] : ['a-copy', 'c', 'd']);
    await expect(area(page, 'done').locator(':scope > :last-child')).toHaveAttribute('data-test-footer', 'done');
    await expect(page.locator('[data-comins-sortable-dragging]')).toHaveCount(0);
    await expect(page.locator('[data-comins-sortable-placeholder]')).toHaveCount(0);
    const state = await fixtureState(page);
    if (invalidCopy) {
      expect(state.lastOperation).toBe(null);
      expect(state.events).not.toContain('change');
      expect(state.events).toContain('after:cancelled:error');
      await expect(page.locator('[data-sortable-id="a-copy"]')).toHaveCount(0);
    } else {
      expect(state.lastOperation?.operation).toBe('copy');
    }
  });
}

test('scoped items still reject the footer slot @core-fix', async ({ page }) => {
  await page.goto('/vanilla/?scoped-items&slots');
  await waitForFixture(page);
  const drag = await beginDrag(page, 'todo', 'a');
  const footer = page.locator('[data-test-footer="done"]');
  const box = await footer.boundingBox();
  if (box === null) throw new Error('Missing footer');
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await expect(footer).toHaveAttribute('data-comins-sortable-rejection', 'not-accepted');
  await drag.drop();
  await expectIds(page, 'todo', ['a', 'b']);
  await expectIds(page, 'done', ['c', 'd']);
});
