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

export async function domIds(page: Page, areaId: string): Promise<string[]> {
  return area(page, areaId).evaluate((element) => Array.from(element.children)
    .filter((child) => child.hasAttribute('data-sortable-id')
      && !child.hasAttribute('data-comins-sortable-placeholder'))
    .map((child) => child.getAttribute('data-sortable-id') as string));
}

async function waitForPointerFrame(page: Page): Promise<void> {
  await page.evaluate(() => new Promise<void>((resolve) => {
    requestAnimationFrame(() => resolve());
  }));
}

async function scrollIntoSafeView(page: Page, locator: Locator): Promise<void> {
  await locator.scrollIntoViewIfNeeded();
  await waitForPointerFrame(page);
  const box = await locator.boundingBox();
  const viewport = page.viewportSize();
  if (
    box !== null
    && viewport !== null
    && (box.y < 88 || box.y + box.height > viewport.height - 16)
  ) {
    await locator.evaluate((element, tall) => {
      element.scrollIntoView({ block: tall ? 'start' : 'center', inline: 'center' });
      // A tall subtree centered in the viewport can put its drop point under
      // the fixed Playground header. Keep its leading edge exposed instead.
      if (tall) window.scrollBy(0, -96);
    }, box.height > viewport.height - 104);
    await waitForPointerFrame(page);
  }
}

export async function movePointerToDropTarget(
  page: Page,
  point: { x: number; y: number },
  destinationAreaId: string,
  beforeId?: string,
): Promise<void> {
  const placeholder = page.locator('[data-comins-sortable-placeholder]');
  let lastState: unknown = null;
  await page.mouse.move(point.x, point.y, { steps: 2 });
  await waitForPointerFrame(page);
  try {
    await expect.poll(async () => {
      const location = await placeholder.count() === 1
        ? await placeholder.evaluate((element) => ({
            areaId: element.parentElement?.getAttribute('data-comins-sortable-area') ?? null,
            beforeId: element.nextElementSibling?.getAttribute('data-sortable-id') ?? null,
          }))
        : null;
      const diagnostics = await page.evaluate(({ clientX, clientY, destinationAreaId, beforeId }) => ({
        point: { x: clientX, y: clientY },
        viewport: { width: innerWidth, height: innerHeight },
        scroll: { x: scrollX, y: scrollY },
        hitAreaIds: [...new Set(document.elementsFromPoint(clientX, clientY)
          .map((element) => element.closest('[data-comins-sortable-area]')
            ?.getAttribute('data-comins-sortable-area'))
          .filter((areaId): areaId is string => areaId !== undefined && areaId !== null))],
        hitItemIds: document.elementsFromPoint(clientX, clientY)
          .map((element) => element.closest('[data-sortable-id]')?.getAttribute('data-sortable-id')),
        destinationRect: document.querySelector(beforeId === undefined
          ? `[data-comins-sortable-area="${destinationAreaId}"]`
          : `[data-comins-sortable-area="${destinationAreaId}"] [data-sortable-id="${beforeId}"]`)
          ?.getBoundingClientRect().toJSON(),
        placeholderRect: document.querySelector('[data-comins-sortable-placeholder]')?.getBoundingClientRect().toJSON(),
        transform: (document.querySelector('[data-comins-sortable-dragging]') as HTMLElement | null)
          ?.style.transform ?? null,
      }), { clientX: point.x, clientY: point.y, destinationAreaId, beforeId });
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
  await page.mouse.move(4, 4, { steps: 2 });
  await waitForPointerFrame(page);
  await expect(over).toHaveCount(0);
}

export async function beginDrag(
  page: Page,
  areaId: string,
  itemId: string,
  options: { handle?: string } = {},
) {
  const source = item(page, areaId, itemId);
  await expect(source).toHaveCount(1);
  expect(await source.evaluate((element) => element.parentElement
    ?.closest('[data-comins-sortable-area]')?.getAttribute('data-comins-sortable-area'))).toBe(areaId);
  await scrollIntoSafeView(page, source);
  const activation = await source.evaluate((element, handle) => {
    const target = handle === undefined ? element : element.querySelector(handle);
    if (target === null) throw new Error('Missing requested drag handle');
    const rect = target.getBoundingClientRect();
    const points = [0.5, 0.15, 0.85, 0.3, 0.7].flatMap((y) => (
      [0.5, 0.15, 0.85].map((x) => ({ x: rect.left + rect.width * x, y: rect.top + rect.height * y }))
    ));
    const hits = points.map((point) => {
      const hit = element.ownerDocument.elementFromPoint(point.x, point.y);
      const ownItem = hit?.closest('[data-sortable-id]') === element;
      const interactive = hit?.closest('a,button,input,textarea,select,[contenteditable]');
      return {
        point,
        valid: ownItem && target.contains(hit) && (handle !== undefined || !interactive),
        hitItemId: hit?.closest('[data-sortable-id]')?.getAttribute('data-sortable-id'),
      };
    });
    return { point: hits.find((hit) => hit.valid)?.point, rect: rect.toJSON(), hits };
  }, options.handle);
  if (activation.point === undefined) {
    throw new Error(`No exposed activation point for ${areaId}/${itemId}: ${JSON.stringify(activation)}`);
  }
  const origin = activation.point;
  const startOutput = page.locator('[data-playground-drag-start]');
  const hasStartOutput = await startOutput.count() === 1;
  const previousStart = hasStartOutput ? JSON.parse(await startOutput.innerText()) as { sequence: number } | null : null;
  try {
    await page.mouse.move(origin.x, origin.y);
    await page.mouse.down();
    await page.mouse.move(origin.x + 12, origin.y + 12);
    await expect(page.locator('[data-comins-sortable-dragging]')).toHaveCount(1);
    if (hasStartOutput) {
      await expect.poll(async () => JSON.parse(await startOutput.innerText())).toMatchObject({
        sequence: (previousStart?.sequence ?? 0) + 1,
        areaId,
        itemId,
      });
    }
    const draggedSource = await source.evaluate((element) => element.hasAttribute('data-comins-sortable-dragging'));
    if (!hasStartOutput || draggedSource) {
      await expect(source).toHaveAttribute('data-comins-sortable-dragging', '');
    } else {
      await expect(page.locator('[data-comins-sortable-dragging]')).toHaveAttribute('inert', '');
      await expect(source).toBeVisible();
    }
  } catch (error) {
    await page.keyboard.press('Escape');
    await page.mouse.up();
    throw error;
  }
  return {
    async moveBefore(
      destinationAreaId: string,
      beforeId?: string,
      accepted = true,
    ): Promise<void> {
      const destination = beforeId === undefined
        ? area(page, destinationAreaId)
        : item(page, destinationAreaId, beforeId);
      await scrollIntoSafeView(page, destination);
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
        await page.mouse.move(destinationPoint.x, destinationPoint.y, { steps: 2 });
        await waitForPointerFrame(page);
        await expect.poll(async () => {
          const actual = await dragging.evaluate((element) => {
            const matrix = new DOMMatrixReadOnly(getComputedStyle(element).transform);
            return { x: matrix.e, y: matrix.f };
          });
          return Math.abs(actual.x - (destinationPoint.x - origin.x)) <= 1
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
  await expect.poll(() => domIds(page, areaId)).toEqual(ids);
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
