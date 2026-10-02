import { expect, test } from '@playwright/test';
import { beginDrag, expectIds, fixtureState, waitForFixture } from './helpers/drag.js';

for (const adapter of ['vanilla', 'react', 'vue', 'svelte']) {
  test(`${adapter} rejects a drop after the owner clears its destination`, async ({ page }) => {
    await page.goto(`/${adapter}/`);
    await waitForFixture(page);
    const drag = await beginDrag(page, 'todo', 'b');
    // An independent owner update while the pointer is held, not a second gesture.
    await page.getByRole('button', { name: 'Clear done' }).evaluate((button) => (button as HTMLButtonElement).click());
    await expectIds(page, 'done', []);
    await drag.moveBefore('done'); await drag.drop();
    await expectIds(page, 'todo', ['a', 'b']);
    await expectIds(page, 'done', []);
    await expect.poll(async () => (await fixtureState(page)).events.slice(-1)[0]).toBe('after:rejected:state-not-committed');
    expect((await fixtureState(page)).lastOperation).toBeNull();
    await expect(page.locator('[data-comins-sortable-dragging], [data-comins-sortable-placeholder]')).toHaveCount(0);
  });
}

test('external reorder during dragging preserves the owner order and rejects the drop', async ({ page }) => {
  await page.goto('/vanilla/?scoped-items');
  await waitForFixture(page);
  const drag = await beginDrag(page, 'todo', 'b');
  await page.locator('[data-test-area="todo"]').evaluate((area) => {
    area.insertBefore(area.querySelector('[data-sortable-id="b"]')!, area.querySelector('[data-sortable-id="a"]'));
  });
  await drag.moveBefore('done', 'c');
  await drag.drop();
  await expectIds(page, 'todo', ['b', 'a']);
  await expectIds(page, 'done', ['c', 'd']);
  await expect.poll(async () => (await fixtureState(page)).events.slice(-1)[0]).toBe('after:rejected:state-not-committed');
  expect((await fixtureState(page)).lastOperation).toBeNull();
  await expect(page.locator('[data-comins-sortable-dragging], [data-comins-sortable-placeholder]')).toHaveCount(0);
});

test('callback rollback keeps group selection through a selectedClass update', async ({ page }) => {
  await page.goto('/vanilla/?scoped-items&selection-lifecycle');
  await waitForFixture(page);
  await page.locator('[data-sortable-id="a"]').click();
  await page.locator('[data-sortable-id="b"]').click({ modifiers: ['Control'] });
  await page.evaluate(() => window.__sortableFixture!.controls['callback-error']!());
  const drag = await beginDrag(page, 'todo', 'a');
  await drag.moveBefore('done', 'c'); await drag.drop();
  await expect.poll(async () => (await fixtureState(page)).events.slice(-1)[0]).toBe('after:cancelled:error');
  await page.getByRole('button', { name: 'Update selected class' }).click();
  await expectIds(page, 'todo', ['a', 'b']);
  await expectIds(page, 'done', ['c', 'd']);
  await expect.poll(() => page.locator('[data-comins-sortable-selected]').evaluateAll((items) => items.map((item) => item.getAttribute('data-sortable-id')))).toEqual(['a', 'b']);
});

for (const [name, markup, editable] of [
  ['empty', '<span contenteditable="">Editable text for selection</span>', true],
  ['plaintext', '<span contenteditable="plaintext-only">Editable text for selection</span>', true],
  ['true', '<span contenteditable="true">Editable text for selection</span>', true],
  ['inherited', '<div contenteditable="true"><span>Editable text for selection</span></div>', true],
  ['false island', '<div contenteditable="true"><span contenteditable="false">Sortable text</span></div>', false],
] as const) {
  test(`${name} editability controls whole-item drag activation`, async ({ page }) => {
    await page.goto('/vanilla/?scoped-items');
    await waitForFixture(page);
    await page.locator('[data-sortable-id="a"]').evaluate((item, html) => { item.innerHTML = html; }, markup);
    const text = page.locator('[data-sortable-id="a"] span');
    expect(await text.evaluate((element) => (element as HTMLElement).isContentEditable)).toBe(editable);
    const box = (await text.boundingBox())!;
    await page.mouse.move(box.x + 5, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + 35, box.y + box.height / 2, { steps: 4 });
    await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
    await expect(page.locator('[data-comins-sortable-dragging]')).toHaveCount(editable ? 0 : 1);
    if (editable) expect((await fixtureState(page)).events).not.toContain('start');
    await page.mouse.up();
  });
}
