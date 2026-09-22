import { expect, test, type Page } from '@playwright/test';

import { exampleIds } from '../../example/src/app/navigation.js';
import { beginDrag, domIds, dragItem, movePointerToDropTarget, waitForFrameworkRender } from './helpers/drag.js';
import { bundleDisplayedExample } from './helpers/source-bundle.js';

type Adapter = 'vanilla' | 'react' | 'vue' | 'svelte';
const adapters: readonly Adapter[] = ['vanilla', 'react', 'vue', 'svelte'];

for (const adapter of adapters) {
  test(`${adapter} empty slots retain preview and committed item boundaries @human-review`, async ({ page }) => {
    await page.goto(`/examples/two-list-slots/${adapter}`);
    await waitForRuntime(page);
    const footer = await page.locator('[data-demo-area="todo"] > [data-demo-slot="footer"]').elementHandle();
    for (const id of ['research', 'design', 'build']) {
      await dragItem(page, 'todo', id, { areaId: 'done', beforeId: 'review' });
    }
    await expect.poll(async () => (await model(page)).todo).toEqual([]);
    await expect(page.locator('[data-demo-column="todo"] > header small')).toHaveText('0 items');
    await expect(page.locator('[data-demo-column="done"] > header small')).toHaveText('4 items');
    expect(await footer?.evaluate((element) => element.isConnected)).toBe(true);
    const drag = await beginDrag(page, 'done', 'build');
    const header = await page.locator('[data-demo-area="todo"] > [data-demo-slot="header"]').boundingBox();
    if (!header) throw new Error('Missing header');
    await page.mouse.move(header.x + header.width / 2, header.y + header.height + 4, { steps: 12 });
    const children = page.locator('[data-demo-area="todo"] > *');
    await expect(children.nth(1)).toHaveAttribute('data-comins-sortable-placeholder', '');
    await expect(children.last()).toHaveAttribute('data-demo-slot', 'footer');
    await drag.drop();
    await expect(children.nth(1)).toHaveAttribute('data-sortable-id', 'build');
    await expect(children.last()).toHaveAttribute('data-demo-slot', 'footer');
    await expect.poll(async () => (await model(page)).todo).toEqual(['build']);
    await expect(page.locator('[data-demo-column="todo"] > header small')).toHaveText('1 items');
    await expect(page.locator('[data-demo-column="done"] > header small')).toHaveText('3 items');
  });

  test(`${adapter} drag origin modes preserve order and restore text selection @human-review`, async ({ page }) => {
    await page.goto(`/examples/handle/${adapter}`);
    await waitForRuntime(page);
    const choice = page.getByLabel('드래그 시작 영역', { exact: true });
    await choice.selectOption('card');
    let drag = await beginDrag(page, 'todo', 'build', { handle: '.cs-demo-card__copy small' });
    await drag.moveBefore('todo', 'research');
    await drag.drop();
    await expect.poll(async () => (await model(page)).todo?.[0]).toBe('build');
    await choice.selectOption('title');
    drag = await beginDrag(page, 'todo', 'design', { handle: '.cs-demo-card__copy strong' });
    await drag.moveBefore('todo', 'build');
    await drag.drop();
    await expect.poll(async () => (await model(page)).todo?.[0]).toBe('design');
    await choice.selectOption('handle');
    await selectCardTitle(page, 'design');
    await page.getByRole('button', { name: '데이터 초기화', exact: true }).click();
    await expect(choice).toHaveValue('handle');
    await expectModelAndDom(page, { todo: ['research', 'design', 'build', 'review'] });
  });

  test(`${adapter} feedback styles change accepted and rejected indicators @human-review`, async ({ page }) => {
    await page.goto(`/examples/custom-placeholder/${adapter}`);
    await waitForRuntime(page);
    const drag = await beginDrag(page, 'todo', 'build');
    await drag.moveBefore('done', 'release');
    await expect(page.locator('[data-comins-sortable-placeholder]')).toHaveCSS('border-top-style', 'dotted');
    await page.keyboard.press('Escape');
    await page.mouse.up();
    await page.getByRole('button', { name: '사용자 스타일', exact: true }).click();
    const standard = await beginDrag(page, 'todo', 'build');
    await standard.moveBefore('done', 'release');
    await expect(page.locator('[data-comins-sortable-placeholder]')).toHaveCSS('border-top-style', 'dashed');
    await page.keyboard.press('Escape');
    await page.mouse.up();
    await page.getByRole('button', { name: '사용자 스타일', exact: true }).click();
    await page.getByRole('button', { name: '대상 이동 허용', exact: true }).click();
    const rejected = await beginDrag(page, 'todo', 'build');
    await rejected.moveBefore('done', 'release', false);
    await expect(page.locator('[data-demo-area="done"]')).toHaveAttribute('data-comins-sortable-rejection', 'not-accepted');
    await expect(page.locator('[data-demo-area="done"]')).toHaveCSS('outline-style', 'dashed');
    await expect(page.locator('[data-comins-sortable-placeholder]')).toHaveCSS('visibility', 'hidden');
    await rejected.drop();
    await expect.poll(async () => (await model(page)).done).toEqual(['release']);
  });
}

for (const adapter of adapters) {
  test(`${adapter} documentation follows the selected adapter @docs`, async ({ page, browserName }) => {
    await page.goto(`/examples/simple/${adapter}`);
    await waitForRuntime(page);
    const api = page.getByLabel('API', { exact: true });
    await expect(api).toContainText(adapter === 'vanilla' ? 'item' : adapter === 'vue' ? 'modelValue' : 'items');
    await expect(api).toContainText(adapter === 'vanilla' ? 'onChange' : adapter === 'vue' ? 'update:modelValue' : 'onItemsChange');
    if (adapter === 'vanilla' || adapter === 'vue') await expect(api).not.toContainText('onItemsChange');
    await page.getByRole('button', { name: '코드 보기', exact: true }).click();
    const files = page.locator('[data-source-file]');
    await files.selectOption('main.ts');
    await expect(page.locator('.cs-playground__source pre')).toContainText("exampleId: 'simple'");
    await files.selectOption('adapters/demo-data.ts');
    await expect(page.locator('.cs-playground__source pre')).toContainText("from 'comins-sortable/core'");
    await page.goto(`/examples/tree/${adapter}`);
    await waitForRuntime(page);
    await page.getByRole('button', { name: '코드 보기', exact: true }).click();
    await files.selectOption('main.ts');
    await expect(page.locator('.cs-playground__source pre')).toContainText("exampleId: 'tree'");
    if (adapter === 'svelte') {
      await files.selectOption('adapters/SvelteTreeArea.svelte');
      await expect(page.locator('.cs-playground__source pre')).toContainText("from 'comins-sortable/svelte'");
    }
    if (browserName === 'chromium') await bundleDisplayedExample(page);
  });

  test(`${adapter} locale changes translate the live tree without resetting its state @docs`, async ({ page }) => {
    await page.goto(`/examples/tree/${adapter}`);
    await waitForRuntime(page);
    await page.getByRole('button', { name: '자식 순서 뒤집기', exact: true }).click();
    await expect.poll(async () => (await model(page)).child).toEqual(['release', 'review']);
    const before = await model(page);
    await page.getByRole('button', { name: 'Switch to English', exact: true }).click();
    await expect(page.locator('.cs-demo-nested-shell > strong').first()).toHaveText('Research children');
    await expect.poll(() => model(page)).toEqual(before);
    await page.getByRole('button', { name: '한국어로 전환', exact: true }).click();
    await expect(page.locator('.cs-demo-nested-shell > strong').first()).toHaveText('Research 하위 항목');
    await expect.poll(() => model(page)).toEqual(before);

    await page.goto(`/examples/transitions/${adapter}`);
    await waitForRuntime(page);
    const selected = page.locator('[data-sortable-id="build"]');
    await selected.locator('.cs-demo-handle').click({ modifiers: ['Meta'] });
    await expect(selected).toHaveClass(/cs-demo-card--selected/);
    await page.getByRole('button', { name: 'Switch to English', exact: true }).click();
    await expect(selected).toHaveClass(/cs-demo-card--selected/);
    await dragItem(page, 'todo', 'build', { areaId: 'todo', beforeId: 'research' });
    await expect.poll(async () => (await model(page)).todo?.[0]).toBe('build');
  });
}

async function selectCardTitle(page: Page, itemId: string): Promise<void> {
  const title = page.locator(`[data-sortable-id="${itemId}"] > .cs-demo-card__copy > strong`);
  await title.scrollIntoViewIfNeeded();
  const bounds = await title.evaluate((element) => {
    const range = document.createRange();
    range.selectNodeContents(element);
    const rect = range.getBoundingClientRect();
    return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
  });
  await page.mouse.move(bounds.x + 0.5, bounds.y + bounds.height / 2);
  await page.mouse.down();
  await page.mouse.move(bounds.x + bounds.width - 0.5, bounds.y + bounds.height / 2, { steps: 8 });
  await page.mouse.up();
  await expect.poll(() => page.evaluate(() => window.getSelection()?.toString())).toBe(await title.innerText());
  await expect(page.locator('[data-comins-sortable-dragging]')).toHaveCount(0);
}

test('one-move handle drags commit after the activation frame @text-copy', async ({ page }) => {
  await page.goto('/examples/handle/react');
  await waitForRuntime(page);
  const handle = page.getByRole('button', { name: 'Drag Design', exact: true });
  await handle.scrollIntoViewIfNeeded();
  const origin = await handle.boundingBox();
  const target = await page.locator('[data-sortable-id="research"]').boundingBox();
  if (origin === null || target === null) throw new Error('Missing one-move drag geometry');
  await page.mouse.move(origin.x + origin.width / 2, origin.y + origin.height / 2);
  await page.mouse.down();
  await page.mouse.move(target.x + 8, target.y + 8);
  await expect(page.locator('[data-sortable-id="design"]')).toHaveAttribute('data-comins-sortable-dragging', '');
  await page.mouse.up();
  await expectModelAndDom(page, { todo: ['design', 'research', 'build', 'review'] });
  await expect(page.locator('[data-comins-sortable-dragging], [data-comins-sortable-placeholder]')).toHaveCount(0);
});

for (const adapter of adapters) {
  test(`${adapter} copied cards retain their handle and selectable text @text-copy`, async ({ page }) => {
    await page.goto(`/examples/custom-clone/${adapter}`);
    await waitForRuntime(page);
    await dragItem(page, 'todo', 'design', { areaId: 'done', beforeId: 'review' });
    await expectModelAndDom(page, { todo: ['research', 'design', 'build'], done: ['design-copy-1', 'review'] });
    await selectCardTitle(page, 'design-copy-1');
    const copiedDrag = await beginDrag(page, 'done', 'design-copy-1');
    // Enter the list first so the destination geometry includes its placeholder.
    await copiedDrag.moveBefore('todo', 'research');
    await copiedDrag.moveBefore('todo', 'build');
    await copiedDrag.drop();
    await expectModelAndDom(page, { todo: ['research', 'design', 'design-copy-1', 'build'], done: ['review'] });
    await selectCardTitle(page, 'design-copy-1');
  });

  test(`${adapter} text remains selectable before and after moving and cancelling @text-copy`, async ({ page }) => {
    await page.goto(`/examples/handle/${adapter}`);
    await waitForRuntime(page);
    await selectCardTitle(page, 'research');
    await expectModelAndDom(page, { todo: ['research', 'design', 'build', 'review'] });
    const drag = await beginDrag(page, 'todo', 'design', { handle: '.cs-demo-handle' });
    await expect(page.locator('[data-playground-dragging]')).toHaveCount(1);
    const title = page.locator('[data-sortable-id="research"] > .cs-demo-card__copy');
    await expect.poll(() => title.evaluate((element) => {
      const css = getComputedStyle(element);
      return css.getPropertyValue('user-select') || css.getPropertyValue('-webkit-user-select');
    })).toBe('none');
    await drag.moveBefore('todo', 'research');
    await drag.drop();
    await expectModelAndDom(page, { todo: ['design', 'research', 'build', 'review'] });
    await expect(page.locator('[data-playground-dragging]')).toHaveCount(0);
    await selectCardTitle(page, 'design');
    for (const ending of ['escape', 'blur', 'pointercancel'] as const) {
      await beginDrag(page, 'todo', 'research', { handle: '.cs-demo-handle' });
      if (ending === 'escape') await page.keyboard.press('Escape');
      else if (ending === 'blur') await page.evaluate(() => window.dispatchEvent(new Event('blur')));
      else await page.evaluate(() => document.dispatchEvent(new PointerEvent('pointercancel', { pointerId: 1 })));
      await page.mouse.up();
      await expect(page.locator('[data-playground-dragging]')).toHaveCount(0);
      await expectModelAndDom(page, { todo: ['design', 'research', 'build', 'review'] });
      await selectCardTitle(page, 'research');
    }
  });
}

for (const adapter of adapters) {
  test(`${adapter} selection input preserves right-click state and scopes context menus @feedback`, async ({ page }) => {
    await page.goto(`/examples/transitions/${adapter}`);
    await waitForRuntime(page);
    await page.locator('[data-sortable-id="research"] > .cs-demo-handle').click({ modifiers: ['Meta'] });
    await page.locator('[data-sortable-id="build"] > .cs-demo-handle').click({ modifiers: ['Meta'] });
    const selected = page.locator('[data-comins-sortable-selected]');
    await expect(selected).toHaveCount(2);
    await page.locator('[data-sortable-id="design"]').click({ button: 'right' });
    await expect.poll(() => selected.evaluateAll((items) => items.map((item) => item.getAttribute('data-sortable-id'))))
      .toEqual(['research', 'build']);
    await page.keyboard.press('Escape');
    await selectCardTitle(page, 'design');
    await expect.poll(() => selected.evaluateAll((items) => items.map((item) => item.getAttribute('data-sortable-id'))))
      .toEqual(['research', 'build']);
    const menuCancelled = async (selector: string, ctrlKey: boolean) => page.locator(selector).evaluate((element, ctrl) => {
      const event = new MouseEvent('contextmenu', { bubbles: true, cancelable: true, ctrlKey: ctrl });
      element.dispatchEvent(event);
      return event.defaultPrevented;
    }, ctrlKey);
    expect(await menuCancelled('[data-sortable-id="design"] > .cs-demo-handle', true)).toBe(true);
    expect(await menuCancelled('[data-sortable-id="design"] > .cs-demo-card__copy', true)).toBe(false);
    expect(await menuCancelled('[data-sortable-id="design"]', false)).toBe(false);
    expect(await menuCancelled('[data-demo-area="todo"]', true)).toBe(false);
    await expect(page.getByText(/macOS에서는 Command/)).toBeVisible();
    await page.goto(`/examples/simple/${adapter}`);
    await waitForRuntime(page);
    expect(await menuCancelled('[data-sortable-id="design"]', true)).toBe(false);
  });

  test(`${adapter} swap grid exchanges two cells across rows and keeps all other positions @feedback`, async ({ page }) => {
    await page.goto(`/examples/swap-grid/${adapter}`);
    await waitForRuntime(page);
    await expect(page.getByRole('heading', { name: '스왑 그리드', exact: true })).toBeVisible();
    const target = page.locator('[data-sortable-id="grid-10"]');
    await target.scrollIntoViewIfNeeded();
    const drag = await beginDrag(page, 'todo', 'grid-1');
    const box = await target.boundingBox();
    if (!box) throw new Error('Missing swap grid target');
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await expect(target).toHaveAttribute('data-comins-sortable-swap-target', '');
    await drag.drop();
    const expected = Array.from({ length: 20 }, (_, i) => `grid-${i + 1}`);
    [expected[0], expected[9]] = [expected[9]!, expected[0]!];
    await expectModelAndDom(page, { todo: expected });
    await expectOperation(page, 'swap', 'grid-1', { areaId: 'todo', index: 0 }, { areaId: 'todo', index: 9 });
    await expect(page.locator('[data-comins-sortable-swap-target]')).toHaveCount(0);
  });

  test(`${adapter} tree moves a complete subtree and rejects cycles after reparenting @feedback`, async ({ page }) => {
    await page.goto(`/examples/tree/${adapter}`);
    await waitForRuntime(page);
    await expectModelAndDom(page, {
      todo: ['research', 'design', 'build'], child: ['review', 'release'],
      'tree-children-review': ['document', 'observe'], 'tree-children-design': [],
    });
    await dragItem(page, 'child', 'review', { areaId: 'tree-children-design' });
    const moved = {
      todo: ['research', 'design', 'build'], child: ['release'],
      'tree-children-review': ['document', 'observe'], 'tree-children-design': ['review'],
    };
    await expectModelAndDom(page, moved);
    await expect(page.locator('[data-sortable-id="design"] [data-sortable-id="review"] [data-sortable-id="document"]')).toHaveCount(1);
    // A host inside the moving source is not hittable. Expose it independently
    // to verify the logical parent relationship after the real subtree transfer.
    await page.locator('[data-demo-area="tree-children-review"]').evaluate((host) => {
      const marker = document.createElement('span');
      marker.dataset.cycleHostMarker = '';
      host.before(marker);
      const portal = document.createElement('div');
      portal.dataset.cycleHostPortal = '';
      portal.style.cssText = 'position:fixed;top:120px;right:20px;width:220px;z-index:100;background:white';
      document.body.append(portal);
      portal.append(host);
    });
    const drag = await beginDrag(page, 'todo', 'design');
    const target = page.locator('[data-sortable-id="document"]');
    const box = await target.boundingBox();
    if (!box) throw new Error('Missing descendant target');
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await expect(page.locator('[data-comins-sortable-dragging]')).toHaveAttribute('data-comins-sortable-rejection', 'nested-cycle');
    await drag.drop();
    await page.evaluate(() => {
      const marker = document.querySelector('[data-cycle-host-marker]')!;
      marker.replaceWith(document.querySelector('[data-demo-area="tree-children-review"]')!);
      document.querySelector('[data-cycle-host-portal]')?.remove();
    });
    await expectModelAndDom(page, moved);
    await expect(page.locator('[data-comins-sortable-placeholder], [data-comins-sortable-dragging]')).toHaveCount(0);
  });
}

for (const adapter of adapters) {
  test(`${adapter} activates the requested nested parent @drag-contract`, async ({ page }, testInfo) => {
    await page.goto(`/examples/nested/${adapter}`);
    await waitForRuntime(page);
    await page.evaluate(() => {
      document.addEventListener('pointerdown', (event) => {
        const hit = document.elementFromPoint(event.clientX, event.clientY);
        const source = document.querySelector('[data-comins-sortable-area="todo"] [data-sortable-id="research"]');
        document.documentElement.dataset.activationProbe = JSON.stringify({
          point: { x: event.clientX, y: event.clientY },
          viewport: { width: innerWidth, height: innerHeight },
          sourceRect: source?.getBoundingClientRect().toJSON(),
          hitAreaId: hit?.closest('[data-comins-sortable-area]')?.getAttribute('data-comins-sortable-area'),
          hitItemId: hit?.closest('[data-sortable-id]')?.getAttribute('data-sortable-id'),
        });
      }, { once: true, capture: true });
    });
    try {
      const drag = await beginDrag(page, 'todo', 'research');
      const actual = await page.locator('[data-comins-sortable-dragging]').evaluate((element) => ({
        areaId: element.parentElement?.getAttribute('data-comins-sortable-area'),
        itemId: element.getAttribute('data-sortable-id'),
      }));
      await testInfo.attach('activation-identity', {
        body: JSON.stringify({
          requested: { areaId: 'todo', itemId: 'research' },
          actual,
          input: await page.locator('html').getAttribute('data-activation-probe'),
        }),
        contentType: 'application/json',
      });
      expect(actual).toEqual({ areaId: 'todo', itemId: 'research' });
      await drag.moveBefore('todo', 'build');
      await drag.drop();
      await expectModelAndDom(page, { todo: ['design', 'research', 'build'], child: ['review', 'release'] });
      await expectOperation(page, 'reorder', 'research', { areaId: 'todo', index: 0 }, { areaId: 'todo', index: 1 });
    } finally {
      await page.keyboard.press('Escape');
      await page.mouse.up();
    }
  });
}

async function waitForRuntime(page: Page): Promise<void> {
  await expect(page.locator('.cs-playground__status')).toHaveText('Live');
  const route = new URL(page.url()).pathname.replace('/examples/', '');
  await expect(page.locator('[data-playground-runtime]')).toHaveAttribute('data-playground-mounted', route);
  await expect(page.locator('[data-comins-sortable-area="todo"]')).toBeVisible();
}

async function model(page: Page): Promise<Record<string, string[]>> {
  return JSON.parse(await page.locator('[data-playground-model]').innerText()) as Record<string, string[]>;
}

async function expectModelAndDom(page: Page, expected: Record<string, string[]>): Promise<void> {
  await expect.poll(() => model(page)).toMatchObject(expected);
  for (const [areaId, ids] of Object.entries(expected)) {
    await expect.poll(() => domIds(page, areaId)).toEqual(ids);
  }
}

async function lastOperation(page: Page): Promise<string | null> {
  const raw = await page.locator('[data-playground-operation]').innerText();
  const operation = JSON.parse(raw) as { operation: string } | null;
  return operation?.operation ?? null;
}

async function expectOperation(
  page: Page,
  operation: string,
  itemId: string,
  source: { areaId: string; index: number },
  destination: { areaId: string; index: number },
): Promise<void> {
  await expect.poll(async () => JSON.parse(await page.locator('[data-playground-operation]').innerText()))
    .toEqual({ operation, itemId, source, destination });
}

for (const adapter of adapters) {
  test(`${adapter} mounts every documented Playground route`, async ({ page }) => {
    for (const exampleId of exampleIds) {
      await page.goto(`/examples/${exampleId}/${adapter}`);
      await waitForRuntime(page);
      await expect(page.locator('[data-playground-model]')).not.toHaveText('');
      await expect(page.getByRole('button', { name: /View code|코드 보기/ })).toBeVisible();
    }
  });
}

test('normalizes routes, keeps locale on navigation, and renders actual source', async ({ page }) => {
  await page.goto('/unknown');
  await expect(page).toHaveURL('/examples/simple/react');
  await waitForRuntime(page);
  await expect(page.getByRole('link', { name: 'Comins Sortable 인터랙션 플레이그라운드' }))
    .toHaveAttribute('href', '/examples/simple/react');
  await expect(page.getByRole('heading', { name: '기본 정렬' })).toBeVisible();
  await expect(page.getByRole('tab', { name: '기본 정렬', exact: true })).toBeVisible();
  await expect(page.getByText('17 / 17 examples')).toHaveCount(0);
  await expect(page.getByLabel('제어 모델')).toHaveCount(0);
  await expect(page.getByLabel('마지막 작업')).toHaveCount(0);

  for (const removedRoute of ['table', 'table-column']) {
    await page.goto(`/examples/${removedRoute}/react`);
    await expect(page).toHaveURL('/examples/simple/react');
    await waitForRuntime(page);
  }

  await page.getByRole('button', { name: 'Switch to English' }).click();
  await expect(page).toHaveURL('/examples/simple/react');
  await expect(page.getByRole('heading', { name: 'Simple sorting' })).toBeVisible();

  await page.getByRole('button', { name: 'View code' }).click();
  const sourceCode = page.getByLabel('Source code');
  await expect(sourceCode).toContainText('SortableArea');
  await expect(sourceCode).toBeInViewport();
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
  test(`${adapter} Tree route transfers through the official headless model @drag-contract`, async ({ page }) => {
    await page.goto(`/examples/tree/${adapter}`);
    await waitForRuntime(page);

    await expect(page.getByRole('heading', { name: '하위 트리 이동' })).toBeVisible();
    await dragItem(page, 'todo', 'design', { areaId: 'child', beforeId: 'review' });

    await expect.poll(async () => (await model(page)).todo).toEqual(['research', 'build']);
    await expect.poll(async () => (await model(page)).child).toEqual(['design', 'review', 'release']);
    await expect(page.locator('[data-comins-sortable-area="child"]'))
      .toHaveAttribute('data-comins-sortable-area', 'child');

    await dragItem(page, 'todo', 'build', { areaId: 'child', beforeId: 'review' });
    await expect.poll(async () => (await model(page)).todo).toEqual(['research']);
    await expect.poll(async () => (await model(page)).child)
      .toEqual(['design', 'build', 'review', 'release']);

    const returning = await beginDrag(page, 'child', 'design');
    await returning.moveBefore('todo', 'research');
    await returning.drop();
    await expect.poll(async () => (await model(page)).todo).toEqual(['design', 'research']);
    await expect.poll(async () => (await model(page)).child).toEqual(['build', 'review', 'release']);
    await expect(page.locator('[data-sortable-id="design"]')).toHaveCount(1);
    await expectModelAndDom(page, { todo: ['design', 'research'], child: ['build', 'review', 'release'] });
    await expectOperation(page, 'transfer', 'design', { areaId: 'child', index: 0 }, { areaId: 'todo', index: 0 });
  });

  test(`${adapter} placeholder routes expose consumer styling and skeleton feedback`, async ({ page }) => {
    await page.goto(`/examples/custom-placeholder/${adapter}`);
    await waitForRuntime(page);
    const customDrag = await beginDrag(page, 'todo', 'design');
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
    await customDrag.moveOutside();
    await expect(custom).toHaveCount(1);
    await expect(custom).toBeHidden();
    await customDrag.moveBefore('todo', 'research');
    await expect(custom).toBeVisible();
    await expect(custom).toHaveClass(/cs-demo-placeholder--custom/);
    await customDrag.drop();
    await expectModelAndDom(page, { todo: ['design', 'research', 'build', 'review'] });

    await page.goto(`/examples/skeleton-placeholder/${adapter}`);
    await waitForRuntime(page);
    const skeletonDrag = await beginDrag(page, 'todo', 'design');
    const skeleton = page.locator('[data-comins-sortable-placeholder]');
    await expect(skeleton).toHaveClass(/cs-demo-placeholder--skeleton/);
    await expect(skeleton).toHaveAttribute('data-comins-sortable-placeholder-preset', 'skeleton');
    await expect.poll(() => skeleton.evaluate((element) => {
      const style = getComputedStyle(element);
      return `${style.animationName}|${style.backgroundImage}`;
    })).toContain('comins-sortable-placeholder-skeleton|linear-gradient');
    await skeletonDrag.moveOutside();
    await expect(skeleton).toHaveCount(1);
    await expect(skeleton).toBeHidden();
    await skeletonDrag.moveBefore('todo', 'research');
    await expect(skeleton).toBeVisible();
    await expect(skeleton).toHaveAttribute('data-comins-sortable-placeholder-preset', 'skeleton');
    await page.keyboard.press('Escape');
    await skeletonDrag.drop();
    await expectModelAndDom(page, { todo: ['research', 'design', 'build', 'review'] });
  });
}

async function activateDrag(page: Page, itemId: string): Promise<void> {
  await beginDrag(page, 'todo', itemId);
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

    for (const route of ['transition'] as const) {
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

    for (const route of ['third-party', 'footer-slot', 'header-slot'] as const) {
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
  test(`${adapter} reset clears multi-selection and its range anchor @reset-selection`, async ({ page }) => {
    await page.goto(`/examples/transitions/${adapter}`);
    await waitForRuntime(page);
    const initial = ['research', 'design', 'build', 'review', 'release', 'document', 'observe', 'measure'];
    const selected = page.locator('[data-comins-sortable-selected]');

    for (let attempt = 0; attempt < 2; attempt += 1) {
      await page.getByRole('button', { name: 'Drag Build', exact: true }).click({ modifiers: ['Meta'] });
      await expect(selected).toHaveCount(1);
      await page.getByRole('button', { name: '데이터 초기화' }).click();
      await expectModelAndDom(page, { todo: initial });
      await expect(selected).toHaveCount(0);
      await expect(page.locator('.cs-demo-card--selected')).toHaveCount(0);

      await page.getByRole('button', { name: 'Drag Review', exact: true }).click({ modifiers: ['Shift'] });
      await expect(selected).toHaveCount(1);
      await expect(selected).toHaveAttribute('data-sortable-id', 'review');
      await dragItem(page, 'todo', 'review', { areaId: 'todo', beforeId: 'research' });
      await expectModelAndDom(page, {
        todo: ['review', 'research', 'design', 'build', 'release', 'document', 'observe', 'measure'],
      });
      await selectCardTitle(page, 'review');
      // Start the next round from a fresh selection, while retaining the reordered data.
      await page.getByRole('button', { name: 'Drag Build', exact: true }).click();
      await page.getByRole('button', { name: 'Drag Build', exact: true }).click({ modifiers: ['Meta'] });
      await expect(selected).toHaveCount(0);
    }
  });

  test(`${adapter} multi-drag selects with modifiers and moves the ordered group @drag-contract`, async ({ page }) => {
    await page.goto(`/examples/transitions/${adapter}`);
    await waitForRuntime(page);

    await page.keyboard.down('Control');
    await page.locator('[data-sortable-id="research"] > .cs-demo-handle').click();
    await page.keyboard.up('Control');
    await page.keyboard.down('Shift');
    await page.locator('[data-sortable-id="build"] > .cs-demo-handle').click();
    await page.keyboard.up('Shift');

    const selected = page.locator('[data-comins-sortable-selected]');
    await expect(selected).toHaveCount(3);
    await expect(selected.first()).toHaveClass(/cs-demo-card--selected/);
    await expect.poll(() => selected.first().evaluate((element) => {
      const style = getComputedStyle(element);
      return { background: style.backgroundColor, border: style.borderColor };
    })).toEqual({ background: 'rgb(228, 244, 236)', border: 'rgb(23, 99, 67)' });

    const drag = await beginDrag(page, 'todo', 'design');
    await drag.moveBefore('todo', 'release');
    await expect(page.locator('[data-comins-sortable-placeholder]')).toHaveCount(1);
    await drag.drop();
    await expectModelAndDom(page, { todo: [
      'review', 'research', 'design', 'build', 'release', 'document', 'observe', 'measure',
    ] });
    await expect(selected).toHaveCount(3);

    await page.goto(`/examples/transitions/${adapter}`);
    await waitForRuntime(page);
    await page.keyboard.down('Meta');
    await page.locator('[data-sortable-id="research"] > .cs-demo-handle').click();
    await page.locator('[data-sortable-id="build"] > .cs-demo-handle').click();
    await page.keyboard.up('Meta');
    await expect(selected).toHaveCount(2);
    await dragItem(page, 'todo', 'research', { areaId: 'todo', beforeId: 'measure' });
    await expectModelAndDom(page, { todo: [
      'design', 'review', 'release', 'document', 'observe', 'research', 'build', 'measure',
    ] });
    await expect(selected).toHaveCount(2);
  });

  test(`${adapter} thresholds change the result of the same pointer path @drag-contract`, async ({ page }) => {
    for (const scenario of [
      { threshold: '0.2', invert: false, fraction: 0.75, reorder: false },
      { threshold: '0.8', invert: false, fraction: 0.75, reorder: true },
      { threshold: '0.2', invert: true, fraction: 0.25, reorder: true },
      { threshold: '0.8', invert: true, fraction: 0.25, reorder: false },
    ]) {
      await test.step(JSON.stringify(scenario), async () => {
        await page.goto(`/examples/thresholds/${adapter}`);
        await waitForRuntime(page);
        const range = page.getByRole('slider', { name: '전환 임계값' });
        await range.fill(scenario.threshold);
        await expect(range).toHaveValue(scenario.threshold);
        const invert = page.getByRole('button', { name: '임계 영역 반전' });
        if (scenario.invert) await invert.click();
        await expect(invert).toHaveAttribute('aria-pressed', String(scenario.invert));
        const activeFraction = (scenario.invert ? 1 - Number(scenario.threshold) : 1 + Number(scenario.threshold)) / 2;
        await expect(page.locator('[data-threshold-guide]')).toContainText(`카드 상단 ${Math.round(activeFraction * 100)}%`);
        await expect.poll(() => page.locator('[data-sortable-id="research"]').evaluate((element) => {
          const shade = getComputedStyle(element, '::before');
          return Math.round(parseFloat(shade.height) / element.clientHeight * 100);
        })).toBe(Math.round(activeFraction * 100));
        const drag = await beginDrag(page, 'todo', 'design');
        const target = await page.locator('[data-sortable-id="research"] > .cs-demo-handle').boundingBox();
        if (target === null) throw new Error('Missing threshold target');
        await page.mouse.move(target.x + target.width / 2, target.y + target.height * scenario.fraction);
        await waitForFrameworkRender(page);
        await drag.drop();
        await expectModelAndDom(page, { todo: [
          ...(scenario.reorder ? ['design', 'research'] : ['research', 'design']),
          'build', 'review', 'release', 'document',
        ] });
        await expect.poll(() => lastOperation(page)).toBe(scenario.reorder ? 'reorder' : null);
      });
    }
  });

  test(`${adapter} grid uses two-dimensional positions for first and last moves @drag-contract`, async ({ page }) => {
    await page.goto(`/examples/grid/${adapter}`);
    await waitForRuntime(page);
    await expect(page.locator('.cs-demo-list--grid > [data-sortable-id]')).toHaveCount(20);
    await dragItem(page, 'todo', 'grid-20', { areaId: 'todo', beforeId: 'grid-1' });
    const others = Array.from({ length: 19 }, (_, index) => `grid-${index + 1}`);
    await expectModelAndDom(page, { todo: ['grid-20', ...others] });
    await expectOperation(page, 'reorder', 'grid-20', { areaId: 'todo', index: 19 }, { areaId: 'todo', index: 0 });
    await dragItem(page, 'todo', 'grid-20', { areaId: 'todo', beforeId: 'grid-16' });
    await expectModelAndDom(page, { todo: [...others.slice(0, 15), 'grid-20', ...others.slice(15)] });
    const drag = await beginDrag(page, 'todo', 'grid-20');
    const last = page.locator('[data-sortable-id="grid-19"]');
    await last.evaluate((element) => element.scrollIntoView({ block: 'center' }));
    await waitForFrameworkRender(page);
    const box = await last.boundingBox();
    if (box === null) throw new Error('Missing last grid item');
    await movePointerToDropTarget(page, { x: box.x + box.width - 8, y: box.y + box.height / 2 }, 'todo');
    const placeholder = page.locator('[data-comins-sortable-placeholder]');
    const location = await placeholder.boundingBox();
    if (location === null) throw new Error('Missing grid placeholder');
    await page.mouse.move(location.x + location.width / 2, location.y + location.height / 2);
    await waitForFrameworkRender(page);
    expect(await placeholder.evaluate((element) => element.nextElementSibling?.getAttribute('data-sortable-id') ?? null)).toBe(null);
    await drag.drop();
    await expectModelAndDom(page, { todo: [...others, 'grid-20'] });
    await expectOperation(page, 'reorder', 'grid-20', { areaId: 'todo', index: 15 }, { areaId: 'todo', index: 19 });
  });

  test(`${adapter} swap exchanges only the dragged and target positions @drag-contract`, async ({ page }) => {
    await page.goto(`/examples/swap/${adapter}`);
    await waitForRuntime(page);
    const drag = await beginDrag(page, 'todo', 'research');
    const target = page.locator('[data-sortable-id="review"]');
    await target.evaluate((element) => element.scrollIntoView({ block: 'center' }));
    const targetBox = await target.boundingBox();
    if (targetBox === null) throw new Error('Missing swap target');
    await page.mouse.move(
      targetBox.x + targetBox.width / 2,
      targetBox.y + targetBox.height / 2,
      { steps: 3 },
    );
    await expect(target).toHaveAttribute('data-comins-sortable-swap-target', '');
    await drag.drop();
    await expectModelAndDom(page, { todo: [
      'review', 'design', 'build', 'research', 'release', 'document',
    ] });
    await expect.poll(() => lastOperation(page)).toBe('swap');
    await expectOperation(page, 'swap', 'research', { areaId: 'todo', index: 0 }, { areaId: 'todo', index: 3 });
  });
}

for (const adapter of adapters) {
  test(`${adapter} copy drag keeps its source visible while only destination feedback moves`, async ({ page }) => {
    await page.goto(`/examples/clone/${adapter}`);
    await waitForRuntime(page);
    const source = page.locator('[data-comins-sortable-area="todo"] > [data-sortable-id="design"]');
    const before = await source.evaluate((element) => {
      const rect = element.getBoundingClientRect();
      return {
        x: rect.x + scrollX,
        y: rect.y + scrollY,
        width: rect.width,
        height: rect.height,
      };
    });

    const drag = await beginDrag(page, 'todo', 'design');
    await expect(source).not.toHaveAttribute('data-comins-sortable-dragging', '');
    await expect(source).toBeVisible();
    await expect(page.locator('[data-comins-sortable-dragging]')).toHaveCount(1);
    await drag.moveBefore('done', 'review');
    await expect(page.locator('[data-comins-sortable-placeholder]')).toHaveJSProperty(
      'parentElement.dataset.cominsSortableArea',
      'done',
    );
    expect(await source.evaluate((element) => {
      const rect = element.getBoundingClientRect();
      return {
        x: rect.x + scrollX,
        y: rect.y + scrollY,
        width: rect.width,
        height: rect.height,
      };
    })).toEqual(before);

    await drag.drop();
    await expect.poll(async () => (await model(page)).todo)
      .toEqual(['research', 'design', 'build']);
  });

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

test('non-sortable slots reject drops with global warning feedback', async ({ page }) => {
  for (const target of [
    { route: 'header-slot', slot: 'header' },
    { route: 'footer-slot', slot: 'footer' },
    { route: 'two-list-slots', slot: 'header' },
  ] as const) {
    await page.goto(`/examples/${target.route}/react`);
    await waitForRuntime(page);
    const before = await model(page);
    const drag = await beginDrag(page, 'todo', 'design');
    const slot = page.locator(
      `[data-comins-sortable-area="todo"] > [data-demo-slot="${target.slot}"]`,
    );
    await slot.scrollIntoViewIfNeeded();
    await expect.poll(async () => {
      const slotBox = await slot.boundingBox();
      if (slotBox === null) return null;
      await page.mouse.move(
        slotBox.x + slotBox.width / 2,
        slotBox.y + slotBox.height / 2,
        { steps: 2 },
      );
      await page.evaluate(() => new Promise<void>((resolve) => {
        requestAnimationFrame(() => resolve());
      }));
      return slot.getAttribute('data-comins-sortable-rejection');
    }).toBe('not-accepted');
    await expect(slot).toHaveAttribute('data-comins-sortable-rejection', 'not-accepted');
    await expect(page.locator('[data-comins-sortable-dragging]'))
      .toHaveAttribute('data-comins-sortable-rejection', 'not-accepted');
    await expect.poll(() => slot.evaluate((element) => {
      const style = getComputedStyle(element);
      return { outlineStyle: style.outlineStyle, outlineColor: style.outlineColor };
    })).toEqual({ outlineStyle: 'solid', outlineColor: 'rgb(220, 38, 38)' });

    await drag.drop();
    await expect.poll(() => model(page)).toEqual(before);
    await expect(page.locator('[data-comins-sortable-rejection]')).toHaveCount(0);
  }
});

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

test('handle, empty destination, and rejection scenarios change only through product behavior', async ({ page }) => {
  await page.goto('/examples/handle/react');
  await waitForRuntime(page);
  const initial = (await model(page)).todo;
  const sourceCard = page.locator('[data-sortable-id="design"]');
  const targetCard = page.locator('[data-sortable-id="research"]');
  await sourceCard.scrollIntoViewIfNeeded();
  const sourceBox = await sourceCard.boundingBox();
  const targetBox = await targetCard.boundingBox();
  if (sourceBox === null || targetBox === null) throw new Error('Missing handle scenario geometry');
  await page.mouse.move(sourceBox.x + sourceBox.width - 12, sourceBox.y + sourceBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(targetBox.x + 8, targetBox.y + 8);
  await page.mouse.up();
  await expect.poll(async () => (await model(page)).todo).toEqual(initial);

  const handleDrag = await beginDrag(page, 'todo', 'design', { handle: '.cs-demo-handle' });
  await handleDrag.moveBefore('todo', 'research');
  await handleDrag.drop();
  await expectModelAndDom(page, { todo: ['design', 'research', 'build', 'review'] });

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
  test(`${adapter} accept control returns to its runtime default after reset and remount @drag-contract`, async ({ page }) => {
    await page.goto(`/examples/accept/${adapter}`);
    await waitForRuntime(page);
    const toggle = page.getByRole('button', { name: '대상 이동 허용' });

    await expect(toggle).toHaveAttribute('aria-pressed', 'true');
    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-pressed', 'false');
    const rejectedDrag = await beginDrag(page, 'todo', 'design');
    await rejectedDrag.moveBefore('done', 'review', false);
    await expect(page.locator('[data-comins-sortable-area="done"]')).toHaveAttribute('data-comins-sortable-rejection', 'not-accepted');
    await expect(page.locator('[data-comins-sortable-dragging]')).toHaveAttribute('data-comins-sortable-rejection', 'not-accepted');
    await rejectedDrag.drop();
    await expectModelAndDom(page, { todo: ['research', 'design', 'build'], done: ['review'] });
    await expect.poll(() => lastOperation(page)).toBe(null);
    await page.getByRole('button', { name: '데이터 초기화' }).click();
    await expect(toggle).toHaveAttribute('aria-pressed', 'true');
    await dragItem(page, 'todo', 'design', { areaId: 'done', beforeId: 'review' });
    await expectModelAndDom(page, { todo: ['research', 'build'], done: ['design', 'review'] });
    await page.getByRole('button', { name: '데이터 초기화' }).click();

    await toggle.click();
    await page.getByRole('tab', { name: '기본 정렬', exact: true }).click();
    await waitForRuntime(page);
    await page.getByRole('tab', { name: '이동 허용과 거부', exact: true }).click();
    await waitForRuntime(page);
    await expect(page.locator('[data-playground-runtime]'))
      .toHaveAttribute('data-playground-mounted', `accept/${adapter}`);
    await expect(toggle).toHaveAttribute('aria-pressed', 'true');
    await dragItem(page, 'todo', 'design', { areaId: 'done', beforeId: 'review' });
    await expectModelAndDom(page, { todo: ['research', 'build'], done: ['design', 'review'] });
  });
}

for (const adapter of adapters) {
  test(`${adapter} scroll-edge feedback matches drop validity without shrinking the list @edge-feedback`, async ({ page }) => {
    // Keep the container edge away from the viewport edge so this scenario
    // exercises container scrolling, without also starting page auto-scroll.
    await page.setViewportSize({ width: 1440, height: 1100 });
    await page.goto(`/examples/auto-scroll/${adapter}`);
    await waitForRuntime(page);
    const initial = ['research', 'design', 'build', 'review', 'release', 'document', 'observe', 'measure', 'improve'];

    for (const ending of ['outside', 'reenter', 'escape'] as const) {
      await page.getByRole('button', { name: '데이터 초기화' }).click();
      await expectModelAndDom(page, { todo: initial });
      const board = page.locator('.cs-demo-board--scroll');
      await board.scrollIntoViewIfNeeded();
      const drag = await beginDrag(page, 'todo', 'research');
      const boardBox = await board.boundingBox();
      if (boardBox === null) throw new Error('Missing scroll board');
      const height = await board.evaluate((element) => element.scrollHeight);
      await page.mouse.move(boardBox.x + 100, boardBox.y + boardBox.height - 8, { steps: 12 });
      await expect.poll(() => board.evaluate((element) =>
        Math.abs(element.scrollHeight - element.clientHeight - element.scrollTop))).toBeLessThan(1);

      const placeholder = page.locator('[data-comins-sortable-placeholder]');
      await expect(placeholder).toHaveCount(1);
      await expect(placeholder).toBeHidden();
      await expect(board).toHaveJSProperty('scrollHeight', height);
      const scrollTop = await board.evaluate((element) => element.scrollTop);
      await waitForFrameworkRender(page);
      await expect(board).toHaveJSProperty('scrollTop', scrollTop);

      if (ending === 'reenter') {
        const reentryBox = await board.boundingBox();
        if (reentryBox === null) throw new Error('Missing scroll board after scrolling');
        await page.mouse.move(reentryBox.x + 100, reentryBox.y + reentryBox.height - 30, { steps: 3 });
        await expect(placeholder).toBeVisible();
        await drag.drop();
        await expectModelAndDom(page, {
          todo: ['design', 'build', 'review', 'release', 'document', 'observe', 'measure', 'improve', 'research'],
        });
      } else {
        if (ending === 'escape') await page.keyboard.press('Escape');
        await drag.drop();
        await expectModelAndDom(page, { todo: initial });
        await expect(page.getByRole('region', { name: '이벤트 타임라인' }).locator('li').last())
          .toContainText(ending);
      }
      await expect(page.locator('[data-playground-dragging]')).toHaveCount(0);
    }
  });

  test(`${adapter} auto-scroll route moves its live scroll container`, async ({ page }) => {
    await page.goto(`/examples/auto-scroll/${adapter}`);
    await waitForRuntime(page);
    const board = page.locator('.cs-demo-board--scroll');
    await board.scrollIntoViewIfNeeded();
    const boardBox = await board.boundingBox();
    const sourceBox = await page.locator('[data-sortable-id="research"] > .cs-demo-handle').boundingBox();
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
