import { expect, type Locator, type Page } from '@playwright/test';

export async function touchDrag(page: Page, source: Locator) {
  await source.scrollIntoViewIfNeeded();
  const box = await source.boundingBox();
  if (!box) throw new Error('Missing touch source');
  const session = await page.context().newCDPSession(page);
  const origin = { x: box.x + box.width / 2, y: box.y + box.height / 2, id: 1 };
  const frame = () => page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => resolve())));
  await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [origin] });
  await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ ...origin, y: origin.y + 12 }] });
  await frame();
  return {
    async moveTo(target: Locator) {
      const rect = await target.boundingBox();
      if (!rect) throw new Error('Missing touch destination');
      await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: rect.x + rect.width / 2, y: rect.y + 4, id: 1 }] });
      await frame();
    },
    async move(x: number, y: number) {
      await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y, id: 1 }] });
      await frame();
    },
    async secondPointer() {
      await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [origin, { x: origin.x + 60, y: origin.y, id: 2 }] });
      await frame();
    },
    async end(cancel = false) {
      await session.send('Input.dispatchTouchEvent', { type: cancel ? 'touchCancel' : 'touchEnd', touchPoints: [] });
      await frame(); await session.detach();
      await expect(page.locator('[data-comins-sortable-dragging],[data-comins-sortable-placeholder]')).toHaveCount(0);
    },
  };
}
