import { expect, test, type Page } from '@playwright/test';

import { dragItem, movePointerToDropTarget } from '../playwright/helpers/drag.js';

type Adapter = 'vanilla' | 'react' | 'vue' | 'svelte';
const adapters: readonly Adapter[] = ['vanilla', 'react', 'vue', 'svelte'];

async function waitForRuntime(page: Page): Promise<void> {
  await expect(page.locator('.cs-playground__status')).toHaveText('Live');
  await expect(page.locator('[data-comins-sortable-area="todo"]')).toBeVisible();
}

async function model(page: Page): Promise<Record<string, string[]>> {
  return JSON.parse(await page.locator('[data-playground-model]').innerText()) as Record<string, string[]>;
}

test('normalizes routes, keeps locale on navigation, and renders actual source', async ({ page }) => {
  await page.goto('/unknown');
  await expect(page).toHaveURL('/examples/simple/react');
  await waitForRuntime(page);
  await expect(page.getByRole('heading', { name: '기본 정렬' })).toBeVisible();

  await page.getByRole('button', { name: 'Switch to English' }).click();
  await expect(page).toHaveURL('/examples/simple/react');
  await expect(page.getByRole('heading', { name: 'Simple sorting' })).toBeVisible();

  await page.getByRole('button', { name: 'View code' }).click();
  await expect(page.getByLabel('Source code')).toContainText('SortableArea');
  await expect(page.getByRole('listitem')).toHaveCount(4);
});

for (const adapter of adapters) {
  test(`${adapter} two-list route transfers controlled state`, async ({ page }) => {
    await page.goto(`/examples/two-lists/${adapter}`);
    await waitForRuntime(page);

    await dragItem(page, 'todo', 'design', { areaId: 'done', beforeId: 'review' });

    await expect.poll(async () => (await model(page)).todo).toEqual(['research', 'build']);
    await expect.poll(async () => (await model(page)).done).toEqual(['design', 'review']);
    await expect(page.getByLabel('마지막 작업')).toContainText('transfer');
    await expect(page.getByLabel('이벤트 타임라인')).toContainText('afterDrag');
    await expect.poll(() => page.locator('[data-comins-sortable-area="done"] > [data-sortable-id]').evaluateAll(
      (elements) => elements.map((element) => element.getAttribute('data-sortable-id')),
    )).toEqual(['design', 'review']);
  });
}

for (const adapter of adapters) {
  test(`${adapter} clone route preserves its source and inserts one copied item`, async ({ page }) => {
    await page.goto(`/examples/clone/${adapter}`);
    await waitForRuntime(page);

    await dragItem(page, 'todo', 'design', { areaId: 'done', beforeId: 'review' });

    await expect.poll(async () => (await model(page)).todo)
      .toEqual(['research', 'design', 'build']);
    await expect.poll(async () => (await model(page)).done)
      .toEqual(['design-copy-1', 'review']);
    await expect(page.getByLabel('마지막 작업')).toContainText('copy');
    await expect(page.getByLabel('이벤트 타임라인').getByText('change', { exact: true }))
      .toHaveCount(1);
    await expect(page.getByLabel('이벤트 타임라인')).toContainText('drop');
  });

  test(`${adapter} custom clone route renders the customized copied item`, async ({ page }) => {
    await page.goto(`/examples/custom-clone/${adapter}`);
    await waitForRuntime(page);

    await dragItem(page, 'todo', 'design', { areaId: 'done', beforeId: 'review' });

    await expect.poll(async () => (await model(page)).done)
      .toEqual(['design-copy-1', 'review']);
    const copy = page.locator('[data-comins-sortable-area="done"] > [data-sortable-id="design-copy-1"]');
    await expect(copy).toContainText('Design Copy');
    await expect(copy).toContainText('Customized clone');
  });

  test(`${adapter} modifier route copies with Alt and moves without it`, async ({ page, browserName }) => {
    await page.goto(`/examples/modifier-copy/${adapter}`);
    await waitForRuntime(page);

    await page.keyboard.down('Alt');
    try {
      await dragItem(page, 'todo', 'design', { areaId: 'done', beforeId: 'review' });
    } finally {
      await page.keyboard.up('Alt');
    }
    await expect.poll(async () => (await model(page)).todo)
      .toEqual(['research', 'design', 'build']);
    await expect.poll(async () => (await model(page)).done)
      .toEqual(['design-copy-1', 'review']);
    await expect(page.getByLabel('마지막 작업')).toContainText('copy');
    await expect(page.getByLabel('이벤트 타임라인')).toContainText('drop');

    await page.getByRole('button', { name: '데이터 초기화' }).click();
    await expect.poll(async () => (await model(page)).done).toEqual(['review']);
    if (browserName === 'webkit') {
      await page.reload();
      await waitForRuntime(page);
    }
    await dragItem(page, 'todo', 'design', { areaId: 'done', beforeId: 'review' });
    await expect.poll(async () => (await model(page)).todo).toEqual(['research', 'build']);
    await expect.poll(async () => (await model(page)).done).toEqual(['design', 'review']);
    await expect(page.getByLabel('마지막 작업')).toContainText('transfer');
  });
}

for (const adapter of adapters) {
  test(`${adapter} empty example keeps the remaining single card at the standard height`, async ({ page }) => {
    await page.goto(`/examples/empty/${adapter}`);
    await waitForRuntime(page);

    const standardHeight = await page.locator('[data-sortable-id="research"]').evaluate(
      (element) => element.getBoundingClientRect().height,
    );
    await dragItem(page, 'todo', 'design', { areaId: 'done' });

    await expect.poll(() => page.locator('[data-comins-sortable-area="todo"] > [data-sortable-id="research"]')
      .evaluate(
        (element, expectedHeight) => element.getBoundingClientRect().height - expectedHeight,
        standardHeight,
      ))
      .toBe(0);
  });
}

test('handle, empty destination, and rejection scenarios change only through product behavior', async ({ page, browserName }) => {
  await page.goto('/examples/handle/react');
  await waitForRuntime(page);
  const initial = (await model(page)).todo;
  const sourceCard = page.locator('[data-sortable-id="design"]');
  const targetCard = page.locator('[data-sortable-id="research"]');
  const sourceBox = await sourceCard.boundingBox();
  const targetBox = await targetCard.boundingBox();
  if (sourceBox === null || targetBox === null) throw new Error('Missing handle scenario geometry');
  await page.mouse.move(sourceBox.x + sourceBox.width - 12, sourceBox.y + sourceBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(targetBox.x + 8, targetBox.y + 8);
  await page.mouse.up();
  await expect.poll(async () => (await model(page)).todo).toEqual(initial);
  if (browserName === 'webkit') {
    await page.reload();
    await waitForRuntime(page);
  }

  const handle = page.locator('[data-sortable-id="design"] .cs-demo-handle');
  const handleBox = await handle.boundingBox();
  const currentTargetBox = await targetCard.boundingBox();
  if (handleBox === null || currentTargetBox === null) throw new Error('Missing accessible handle');
  await page.mouse.move(handleBox.x + handleBox.width / 2, handleBox.y + handleBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(handleBox.x + handleBox.width / 2 + 12, handleBox.y + handleBox.height / 2 + 12);
  await expect(page.locator('[data-comins-sortable-dragging]')).toHaveCount(1);
  await movePointerToDropTarget(
    page,
    { x: currentTargetBox.x + 8, y: currentTargetBox.y + 8 },
    'todo',
    'research',
  );
  await page.mouse.up();
  await expect(page.locator('[data-comins-sortable-dragging]')).toHaveCount(0);
  await expect(page.locator('[data-comins-sortable-placeholder]')).toHaveCount(0);
  await expect.poll(async () => (await model(page)).todo).not.toEqual(initial);

  await page.goto('/examples/empty/svelte');
  await waitForRuntime(page);
  await dragItem(page, 'todo', 'design', { areaId: 'done' });
  await expect.poll(async () => (await model(page)).done).toEqual(['design']);

  await page.goto('/examples/accept/vue');
  await waitForRuntime(page);
  await page.getByRole('button', { name: '대상 이동 허용' }).click();
  await dragItem(page, 'todo', 'design', { areaId: 'done', beforeId: 'review', accepted: false });
  await expect.poll(async () => (await model(page)).done).toEqual(['review']);
  await expect(page.getByLabel('이벤트 타임라인')).toContainText('not-accepted');
});

for (const adapter of adapters) {
  test(`${adapter} auto-scroll route moves its live scroll container`, async ({ page }) => {
    await page.goto(`/examples/auto-scroll/${adapter}`);
    await waitForRuntime(page);
    const board = page.locator('.cs-demo-board--scroll');
    await board.scrollIntoViewIfNeeded();
    const boardBox = await board.boundingBox();
    const sourceBox = await page.locator('[data-sortable-id="research"]').boundingBox();
    if (boardBox === null || sourceBox === null) throw new Error('Missing auto-scroll geometry');

    await expect.poll(() => board.evaluate((element) => element.scrollTop)).toBe(0);
    await page.mouse.move(sourceBox.x + sourceBox.width / 2, sourceBox.y + sourceBox.height / 2);
    await page.mouse.down();
    await page.mouse.move(sourceBox.x + sourceBox.width / 2 + 12, sourceBox.y + sourceBox.height / 2 + 12);
    await expect(page.locator('[data-comins-sortable-dragging]')).toHaveCount(1);
    await page.mouse.move(boardBox.x + boardBox.width / 2, boardBox.y + boardBox.height - 4);
    await expect.poll(() => board.evaluate((element) => element.scrollTop)).toBeGreaterThan(0);
    await page.mouse.up();
  });
}

test('mobile route has no page overflow and reduced motion removes transitions', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto('/examples/simple/vanilla');
  await waitForRuntime(page);
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await expect.poll(() => page.locator('.cs-demo-card').first().evaluate((element) => getComputedStyle(element).transitionDuration)).toBe('0s');
});
