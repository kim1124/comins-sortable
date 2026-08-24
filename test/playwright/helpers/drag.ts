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

async function waitForPointerFrame(page: Page): Promise<void> {
  await page.evaluate(() => new Promise<void>((resolve) => {
    requestAnimationFrame(() => resolve());
  }));
}

export async function movePointerToDropTarget(
  page: Page,
  point: { x: number; y: number },
  destinationAreaId: string,
  beforeId?: string,
): Promise<void> {
  const placeholder = page.locator('[data-comins-sortable-placeholder]');
  let attempt = 0;
  let lastState: unknown = null;
  try {
    await expect.poll(async () => {
      const x = point.x + (attempt++ % 2);
      await page.mouse.move(x, point.y, { steps: 2 });
      await waitForPointerFrame(page);
      const location = await placeholder.count() === 1
        ? await placeholder.evaluate((element) => ({
            areaId: element.parentElement?.getAttribute('data-comins-sortable-area') ?? null,
            beforeId: element.nextElementSibling?.getAttribute('data-sortable-id') ?? null,
          }))
        : null;
      const diagnostics = await page.evaluate(({ clientX, clientY }) => ({
        point: { x: clientX, y: clientY },
        viewport: { width: innerWidth, height: innerHeight },
        scroll: { x: scrollX, y: scrollY },
        hitAreaIds: [...new Set(document.elementsFromPoint(clientX, clientY)
          .map((element) => element.closest('[data-comins-sortable-area]')
            ?.getAttribute('data-comins-sortable-area'))
          .filter((areaId): areaId is string => areaId !== undefined && areaId !== null))],
        transform: (document.querySelector('[data-comins-sortable-dragging]') as HTMLElement | null)
          ?.style.transform ?? null,
      }), { clientX: x, clientY: point.y });
      lastState = { location, diagnostics };
      return location?.areaId === destinationAreaId
        && (beforeId === undefined || location.beforeId === beforeId);
    }).toBe(true);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`${message}\nLast drag state: ${JSON.stringify(lastState)}`);
  }
}

export async function movePointerOutside(page: Page): Promise<void> {
  const over = page.locator('[data-comins-sortable-over]');
  let attempt = 0;
  await expect.poll(async () => {
    await page.mouse.move(4 + (attempt++ % 2), 4, { steps: 2 });
    await waitForPointerFrame(page);
    return over.count();
  }).toBe(0);
}

export async function beginDrag(page: Page, areaId: string, itemId: string) {
  const source = item(page, areaId, itemId);
  const box = await source.boundingBox();
  if (box === null) throw new Error(`Missing sortable item: ${areaId}/${itemId}`);
  const origin = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
  await page.mouse.move(origin.x, origin.y);
  await page.mouse.down();
  await page.mouse.move(origin.x + 12, origin.y + 12);
  await expect(page.locator('[data-comins-sortable-dragging]')).toHaveCount(1);
  await waitForFrameworkRender(page);
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
      const destinationPoint = { x: destinationBox.x + 8, y: destinationBox.y + 8 };
      if (accepted) {
        await movePointerToDropTarget(
          page,
          destinationPoint,
          destinationAreaId,
          beforeId,
        );
      } else {
        const dragging = page.locator('[data-comins-sortable-dragging]');
        let attempt = 0;
        await expect.poll(async () => {
          const x = destinationPoint.x + (attempt++ % 2);
          await page.mouse.move(x, destinationPoint.y, { steps: 2 });
          await waitForPointerFrame(page);
          const actual = await dragging.evaluate((element) => {
            const matrix = new DOMMatrixReadOnly(getComputedStyle(element).transform);
            return { x: matrix.e, y: matrix.f };
          });
          return Math.abs(actual.x - (x - origin.x)) <= 1
            && Math.abs(actual.y - (destinationPoint.y - origin.y)) <= 1;
        }).toBe(true);
      }
    },
    async drop(): Promise<void> {
      await page.mouse.up();
      await expect(page.locator('[data-comins-sortable-dragging]')).toHaveCount(0);
      await expect(page.locator('[data-comins-sortable-placeholder]')).toHaveCount(0);
    },
    async moveOutside(): Promise<void> {
      await movePointerOutside(page);
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
