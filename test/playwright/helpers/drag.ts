import { expect, type Locator, type Page } from '@playwright/test';

export type FixtureAdapter = 'vanilla' | 'react' | 'vue' | 'svelte';

export const fixtureControlKeys = [
  'horizontal',
  'emptyGeometry',
  'scrollable',
  'outside',
  'escape',
  'pointer-cancel',
  'blur',
  'disabled',
  'reject',
  'unmount',
  'destroy',
  'callback-error',
  'state-not-committed',
  'remount',
] as const;

interface FixtureState {
  areas: Record<string, string[]>;
  events: string[];
  lastOperation: { operation: string; sourceAreaId: string; destinationAreaId: string; itemId: string; destinationIndex: number } | null;
  resources: { activeSessions: number; placeholders: number };
}

export function area(page: Page, areaId: string): Locator {
  return page.locator(`[data-comins-sortable-area="${areaId}"]`);
}

export function item(page: Page, areaId: string, itemId: string): Locator {
  return area(page, areaId).locator(`[data-sortable-id="${itemId}"]`);
}

export async function movePointerToDropTarget(
  page: Page,
  point: { x: number; y: number },
  destinationAreaId: string,
  beforeId?: string,
): Promise<void> {
  const placeholder = page.locator('[data-comins-sortable-placeholder]');
  let attempt = 0;
  await expect.poll(async () => {
    await page.mouse.move(point.x + (attempt++ % 2), point.y, { steps: 2 });
    if (await placeholder.count() !== 1) return null;
    return placeholder.evaluate((element, expectedBeforeId) => ({
      areaId: element.parentElement?.getAttribute('data-comins-sortable-area') ?? null,
      ...(expectedBeforeId === undefined ? {} : {
        beforeId: element.nextElementSibling?.getAttribute('data-sortable-id') ?? null,
      }),
    }), beforeId);
  }).toEqual({
    areaId: destinationAreaId,
    ...(beforeId === undefined ? {} : { beforeId }),
  });
}

export async function beginDrag(page: Page, areaId: string, itemId: string) {
  const source = item(page, areaId, itemId);
  const box = await source.boundingBox();
  if (box === null) throw new Error(`Missing sortable item: ${areaId}/${itemId}`);
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 + 12, box.y + box.height / 2 + 12);
  await expect(page.locator('[data-comins-sortable-dragging]')).toHaveCount(1);
  return {
    async moveBefore(
      destinationAreaId: string,
      beforeId?: string,
      accepted = true,
    ): Promise<void> {
      const destination = beforeId === undefined
        ? area(page, destinationAreaId)
        : item(page, destinationAreaId, beforeId);
      const destinationBox = await destination.boundingBox();
      if (destinationBox === null) throw new Error(`Missing destination: ${destinationAreaId}/${beforeId ?? 'empty'}`);
      const dragging = page.locator('[data-comins-sortable-dragging]');
      const previousTransform = accepted
        ? null
        : await dragging.evaluate((element) => (element as HTMLElement).style.transform);
      if (accepted) {
        await movePointerToDropTarget(
          page,
          { x: destinationBox.x + 8, y: destinationBox.y + 8 },
          destinationAreaId,
          beforeId,
        );
      } else {
        let attempt = 0;
        await expect.poll(async () => {
          await page.mouse.move(
            destinationBox.x + 8 + (attempt++ % 2),
            destinationBox.y + 8,
            { steps: 2 },
          );
          return dragging.evaluate((element) => (element as HTMLElement).style.transform);
        }).not.toBe(previousTransform);
      }
    },
    async drop(): Promise<void> {
      await page.mouse.up();
      await expect(page.locator('[data-comins-sortable-dragging]')).toHaveCount(0);
      await expect(page.locator('[data-comins-sortable-placeholder]')).toHaveCount(0);
    },
    async moveOutside(): Promise<void> {
      await page.mouse.move(4, 4);
      await expect(page.locator('[data-comins-sortable-over]')).toHaveCount(0);
    },
    async moveToScrollEdge(): Promise<void> {
      const scroll = page.locator('[data-test-scroll]');
      const scrollBox = await scroll.boundingBox();
      if (scrollBox === null) throw new Error('Missing scroll container');
      await page.mouse.move(scrollBox.x + scrollBox.width / 2, scrollBox.y + scrollBox.height - 4);
    },
  };
}

export async function dragItem(
  page: Page,
  sourceAreaId: string,
  itemId: string,
  target: { areaId: string; beforeId?: string; accepted?: boolean },
): Promise<void> {
  const drag = await beginDrag(page, sourceAreaId, itemId);
  await drag.moveBefore(target.areaId, target.beforeId, target.accepted);
  await drag.drop();
}

export async function fixtureState(page: Page): Promise<FixtureState> {
  return page.evaluate(() => window.__sortableFixture?.state() ?? null) as Promise<FixtureState>;
}

export async function waitForFixture(page: Page): Promise<void> {
  await page.waitForFunction(() => (
    typeof window.__sortableFixture?.state === 'function'
    && Object.keys(window.__sortableFixture.controls).length === 14
  ));
  await expect.poll(() => page.evaluate(() => Object.keys(window.__sortableFixture?.controls ?? {}).sort()))
    .toEqual([...fixtureControlKeys].sort());
}

export async function waitForFrameworkRender(page: Page): Promise<void> {
  await page.evaluate(async () => {
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
  });
}

export async function expectIds(page: Page, areaId: string, ids: string[]): Promise<void> {
  await expect.poll(async () => (await fixtureState(page)).areas[areaId]).toEqual(ids);
}

export async function expectAtomicChange(
  page: Page,
  expected: Pick<NonNullable<FixtureState['lastOperation']>, 'operation' | 'sourceAreaId' | 'destinationAreaId' | 'itemId'>,
): Promise<void> {
  await expect.poll(async () => (await fixtureState(page)).lastOperation).toMatchObject(expected);
}

export async function expectDestinationIndex(page: Page, index: number): Promise<void> {
  await expect.poll(async () => (await fixtureState(page)).lastOperation?.destinationIndex).toBe(index);
}

export async function expectEventOrder(page: Page, expected: string[]): Promise<void> {
  await expect.poll(async () => {
    const events = (await fixtureState(page)).events;
    let cursor = 0;
    for (const event of events) if (event === expected[cursor]) cursor += 1;
    return cursor === expected.length
      && ['before', 'start', 'change'].every((value) => events.filter((event) => event === value).length === 1)
      && events.filter((value) => value.startsWith('after:')).length === 1;
  }).toBe(true);
}

export async function fixtureResourceCounts(page: Page): Promise<FixtureState['resources']> {
  return (await fixtureState(page)).resources;
}

declare global {
  interface Window {
    __sortableFixture?: {
      state(): FixtureState;
      controls: Record<string, () => void>;
    };
  }
}
