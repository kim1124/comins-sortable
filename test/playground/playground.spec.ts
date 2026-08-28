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

async function lastOperation(page: Page): Promise<string | null> {
  const raw = await page.locator('[data-playground-operation]').innerText();
  const operation = JSON.parse(raw) as { operation: string } | null;
  return operation?.operation ?? null;
}

test('normalizes routes, keeps locale on navigation, and renders actual source', async ({ page }) => {
  await page.goto('/unknown');
  await expect(page).toHaveURL('/examples/simple/react');
  await waitForRuntime(page);
  await expect(page.locator('.cs-playground__brand-mark')).toHaveText('co');
  await expect(page.getByRole('heading', { name: '기본 정렬' })).toBeVisible();
  await expect(page.getByRole('tab', { name: '기본 정렬', exact: true })).toBeVisible();
  await expect(page.getByText('17 / 17 examples')).toHaveCount(0);
  await expect(page.getByLabel('제어 모델')).toHaveCount(0);
  await expect(page.getByLabel('마지막 작업')).toHaveCount(0);

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
    await expect.poll(() => lastOperation(page)).toBe('transfer');
    await expect(page.getByLabel('이벤트 타임라인')).toContainText('afterDrag');
    await expect.poll(() => page.locator('[data-comins-sortable-area="done"] > [data-sortable-id]').evaluateAll(
      (elements) => elements.map((element) => element.getAttribute('data-sortable-id')),
    )).toEqual(['design', 'review']);
  });
}

for (const adapter of adapters) {
  test(`${adapter} Tree route transfers through the official headless model`, async ({ page }) => {
    await page.goto(`/examples/tree/${adapter}`);
    await waitForRuntime(page);

    await expect(page.getByRole('heading', { name: 'Tree API' })).toBeVisible();
    await dragItem(page, 'todo', 'design', { areaId: 'child', beforeId: 'review' });

    await expect.poll(async () => (await model(page)).todo).toEqual(['research', 'build']);
    await expect.poll(async () => (await model(page)).child).toEqual(['design', 'review', 'release']);
    await expect(page.locator('[data-comins-sortable-area="child"]'))
      .toHaveAttribute('data-comins-sortable-area', 'child');
  });

  test(`${adapter} placeholder routes expose consumer styling and skeleton feedback`, async ({ page }) => {
    await page.goto(`/examples/custom-placeholder/${adapter}`);
    await waitForRuntime(page);
    await activateDrag(page, 'design');
    const custom = page.locator('[data-comins-sortable-placeholder]');
    await expect(custom).toHaveClass(/cs-demo-placeholder--custom/);
    await expect(custom).toHaveAttribute('data-comins-sortable-placeholder-preset', 'default');
    await expect.poll(() => custom.evaluate((element) => {
      const style = getComputedStyle(element);
      return {
        background: style.backgroundColor,
        borderStyle: style.borderStyle,
        radius: style.borderRadius,
      };
    })).toEqual({ background: 'rgb(255, 244, 207)', borderStyle: 'dotted', radius: '18px' });
    await page.mouse.up();

    await page.goto(`/examples/skeleton-placeholder/${adapter}`);
    await waitForRuntime(page);
    await activateDrag(page, 'design');
    const skeleton = page.locator('[data-comins-sortable-placeholder]');
    await expect(skeleton).toHaveClass(/cs-demo-placeholder--skeleton/);
    await expect(skeleton).toHaveAttribute('data-comins-sortable-placeholder-preset', 'skeleton');
    await expect.poll(() => skeleton.evaluate((element) => {
      const style = getComputedStyle(element);
      return `${style.animationName}|${style.backgroundImage}`;
    })).toContain('comins-sortable-placeholder-skeleton|linear-gradient');
    await page.mouse.up();
  });
}

async function activateDrag(page: Page, itemId: string): Promise<void> {
  const source = page.locator(`[data-comins-sortable-area="todo"] > [data-sortable-id="${itemId}"]`);
  const box = await source.boundingBox();
  if (box === null) throw new Error(`Missing drag source: ${itemId}`);
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 + 12, box.y + box.height / 2 + 12);
  await expect(page.locator('[data-comins-sortable-placeholder]')).toHaveCount(1);
}

for (const adapter of adapters) {
  test(`${adapter} exposes the remaining desktop parity routes as live behavior`, async ({ page }) => {
    await page.addInitScript(() => {
      const original = Element.prototype.animate;
      Element.prototype.animate = function patchedAnimate(...args) {
        const root = document.documentElement;
        root.dataset.sortableAnimationCalls = String(Number(root.dataset.sortableAnimationCalls ?? 0) + 1);
        return original.apply(this, args);
      };
    });

    for (const route of ['transition', 'transitions'] as const) {
      await page.goto(`/examples/${route}/${adapter}`);
      await waitForRuntime(page);
      const before = Number(await page.locator('html').getAttribute('data-sortable-animation-calls') ?? 0);
      await page.getByRole('button', { name: '순서 뒤집기' }).click();
      await expect.poll(async () => (await model(page)).todo)
        .toEqual(['build', 'design', 'research']);
      await expect.poll(async () => Number(
        await page.locator('html').getAttribute('data-sortable-animation-calls') ?? 0,
      )).toBeGreaterThan(before);
    }

    for (const route of ['table', 'table-column', 'third-party', 'footer-slot', 'header-slot'] as const) {
      await page.goto(`/examples/${route}/${adapter}`);
      await waitForRuntime(page);
      if (route === 'third-party') {
        await expect(page.locator('[data-demo-component-host]')).toHaveCount(1);
      }
      if (route === 'footer-slot') {
        await expect(page.locator('[data-demo-slot="footer"]')).toHaveCount(1);
      }
      if (route === 'header-slot') {
        await expect(page.locator('[data-demo-slot="header"]')).toHaveCount(1);
      }
      await dragItem(page, 'todo', 'design', { areaId: 'todo', beforeId: 'research' });
      await expect.poll(async () => (await model(page)).todo)
        .toEqual(['design', 'research', 'build']);
    }

    await page.goto(`/examples/two-list-slots/${adapter}`);
    await waitForRuntime(page);
    await expect(page.locator('[data-demo-slot="header"]')).toHaveCount(2);
    await expect(page.locator('[data-demo-slot="footer"]')).toHaveCount(2);
    await dragItem(page, 'todo', 'design', { areaId: 'done', beforeId: 'review' });
    await expect.poll(async () => (await model(page)).done).toEqual(['design', 'review']);
    await expect(page.locator('[data-demo-slot]')).toHaveCount(4);

    await page.goto(`/examples/nested/${adapter}`);
    await waitForRuntime(page);
    await dragItem(page, 'todo', 'design', { areaId: 'child', beforeId: 'review' });
    await expect.poll(async () => (await model(page)).todo).toEqual(['research', 'build']);
    await expect.poll(async () => (await model(page)).child).toEqual(['design', 'review', 'release']);

    await page.goto(`/examples/nested-controlled/${adapter}`);
    await waitForRuntime(page);
    await page.getByRole('button', { name: '자식 순서 뒤집기' }).click();
    await expect.poll(async () => (await model(page)).child).toEqual(['release', 'review']);

    await page.goto(`/examples/functional-third-party/${adapter}`);
    await waitForRuntime(page);
    await expect(page.locator('[data-demo-component-host]')).toHaveCount(2);
    await dragItem(page, 'todo', 'build', { areaId: 'child', beforeId: 'review' });
    await expect.poll(async () => (await model(page)).child).toEqual(['build', 'review', 'release']);
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
    await expect.poll(() => lastOperation(page)).toBe('copy');
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
    await expect.poll(() => lastOperation(page)).toBe('copy');
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
    await expect.poll(() => lastOperation(page)).toBe('transfer');
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
