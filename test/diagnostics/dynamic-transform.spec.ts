import { expect, test, type Page } from '@playwright/test';
import { beginDrag, domIds, movePointerToDropTarget } from '../playground/helpers/drag.js';
const adapters = ['vanilla', 'react', 'vue', 'svelte'] as const;
async function waitForRuntime(page: Page): Promise<void> {
  await expect(page.locator('.cs-playground__status')).toHaveText('Live');
  await expect(page.locator('[data-comins-sortable-area="todo"]')).toBeVisible();
}
async function expectModelAndDom(page: Page, expected: Record<string, string[]>): Promise<void> {
  await expect.poll(async () => JSON.parse(await page.locator('[data-playground-model]').innerText())).toEqual(expected);
  for (const [areaId, ids] of Object.entries(expected)) expect(await domIds(page, areaId)).toEqual(ids);
}
// 지원 범위를 조사하는 진단 suite다. 기본 acceptance gate에 포함하지 않는다.
// 드래그가 시작된 뒤 바뀐 좌표계에서도 포인터 기준점과 종료 계약을 확인한다.
for (const adapter of adapters) {
  for (const initialTransform of ['none', 'scale(0.9)']) {
    test(`${adapter} follows a changed ancestor transform during movement ${initialTransform} @dynamic-transform`, async ({ page }) => {
      await page.goto(`/examples/two-lists/${adapter}`);
      await waitForRuntime(page);
      const host = page.locator('[data-comins-sortable-area="todo"]');
      await host.evaluate((el, transform) => {
        Object.assign((el as HTMLElement).style, { transform, transformOrigin: '0 0' });
      }, initialTransform);
      const source = host.locator('[data-sortable-id="design"]');
      await source.scrollIntoViewIfNeeded();
      const before = await source.boundingBox();
      const handle = await source.locator('.cs-demo-handle').boundingBox();
      if (!before || !handle) throw new Error('Missing dynamic transform geometry');
      const originalStyles = await source.evaluate((el) => (el as HTMLElement).style.cssText);
      const sourceNode = await source.elementHandle();
      const origin = { x: handle.x + handle.width / 2, y: handle.y + handle.height / 2 };
      await page.mouse.move(origin.x, origin.y);
      await page.mouse.down();
      await page.mouse.move(origin.x + 12, origin.y + 10);
      await expect(source).toHaveAttribute('data-comins-sortable-dragging', '');
      expect(await sourceNode?.evaluate((el) => el.parentElement?.getAttribute('data-comins-sortable-area'))).toBe('todo');
      await page.evaluate(() => {
        const result = window as unknown as { dynamicFrame?: { x: number; y: number; width: number; height: number } };
        window.addEventListener('pointermove', () => requestAnimationFrame(() => {
          const rect = document.querySelector('[data-sortable-id="design"]')!.getBoundingClientRect();
          result.dynamicFrame = { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
        }), { once: true });
      });
      await host.evaluate((el) => { (el as HTMLElement).style.transform = 'rotate(8deg) scale(0.7)'; });
      await page.mouse.move(origin.x + 36, origin.y + 24);
      await page.waitForFunction(() => (window as unknown as { dynamicFrame?: unknown }).dynamicFrame !== undefined);
      const actual = await page.evaluate(() => (window as unknown as { dynamicFrame: { x: number; y: number } }).dynamicFrame);
      expect(Math.max(Math.abs(actual.x - before.x - 36), Math.abs(actual.y - before.y - 24))).toBeLessThan(1.5);
      // 목적지는 transform 변경 후 실제 hit과 삽입 표시를 다시 확인한다.
      await movePointerToDropTarget(page, await dropPoint(page), 'done', 'review');
      await page.mouse.up();
      await expectModelAndDom(page, { todo: ['research', 'build'], done: ['design', 'review'] });
      await expect(page.getByLabel('이벤트 타임라인')).toContainText('drop');
      await expect(page.locator('[data-comins-sortable-placeholder],[data-comins-sortable-dragging]')).toHaveCount(0);
      expect(await source.evaluate((el) => (el as HTMLElement).style.cssText)).toBe(originalStyles);
    });
  }

  test(`${adapter} reanchors a stationary drag when ancestor transform changes @dynamic-transform`, async ({ page }) => {
    await page.goto(`/examples/simple/${adapter}`);
    await waitForRuntime(page);
    const host = page.locator('[data-comins-sortable-area="todo"]');
    await host.evaluate((el) => { (el as HTMLElement).style.transform = 'scale(0.9)'; });
    const source = host.locator('[data-sortable-id="research"]');
    const drag = await beginDrag(page, 'todo', 'research');
    const anchored = await source.boundingBox();
    if (!anchored) throw new Error('Missing stationary source');
    await host.evaluate((el) => { (el as HTMLElement).style.transform = 'scale(0.7)'; });
    await expect.poll(async () => {
      const actual = await source.boundingBox();
      return actual === null ? Infinity : Math.max(Math.abs(actual.x - anchored.x), Math.abs(actual.y - anchored.y));
    }).toBeLessThan(1.5);
    await page.keyboard.press('Escape');
    await drag.drop();
    expect(await domIds(page, 'todo')).toEqual(['research', 'design', 'build', 'review']);
    await expect(page.getByLabel('이벤트 타임라인')).toContainText('escape');
    await expect(page.locator('[data-comins-sortable-placeholder],[data-comins-sortable-dragging]')).toHaveCount(0);
  });
}

async function dropPoint(page: Page): Promise<{ x: number; y: number }> {
  const target = await page.locator('[data-comins-sortable-area="done"] [data-sortable-id="review"]').boundingBox();
  if (!target) throw new Error('Missing dynamic transform destination');
  return { x: target.x + target.width / 2, y: target.y + 2 };
}

