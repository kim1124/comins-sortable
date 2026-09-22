import { expect, test, type CDPSession, type Page } from '@playwright/test';

import { beginDrag, domIds, dragItem } from './helpers/drag.js';

interface ResourceSample {
  readonly label: string;
  readonly jsHeapMb: number;
  readonly domNodes: number;
  readonly eventListeners: number;
  readonly documents: number;
  readonly liveNodes: number;
}

async function waitForRuntime(page: Page): Promise<void> {
  await expect(page.locator('.cs-playground__status')).toHaveText('Live');
  await expect(page.locator('[data-comins-sortable-area="todo"]')).toBeVisible();
}

async function openFeature(page: Page, label: string, route: string): Promise<void> {
  await page.getByRole('tab', { name: label, exact: true }).click();
  await expect(page).toHaveURL(`/examples/${route}/react`);
  await expect(page.locator('[data-playground-runtime]'))
    .toHaveAttribute('data-playground-mounted', `${route}/react`);
  await waitForRuntime(page);
}

async function model(page: Page): Promise<Record<string, string[]>> {
  return JSON.parse(await page.locator('[data-playground-model]').innerText()) as Record<string, string[]>;
}

async function expectModel(page: Page, areaId: string, expected: string[]): Promise<void> {
  await expect.poll(async () => (await model(page))[areaId]).toEqual(expected);
  await expect.poll(() => domIds(page, areaId)).toEqual(expected);
}

async function sampleResources(
  page: Page,
  cdp: CDPSession,
  label: string,
): Promise<ResourceSample> {
  await cdp.send('HeapProfiler.collectGarbage');
  const [{ metrics }, counters] = await Promise.all([
    cdp.send('Performance.getMetrics') as Promise<{
      metrics: Array<{ name: string; value: number }>;
    }>,
    cdp.send('Memory.getDOMCounters') as Promise<{
      documents: number;
      nodes: number;
      jsEventListeners: number;
    }>,
  ]);
  const heapBytes = metrics.find((metric) => metric.name === 'JSHeapUsedSize')?.value;
  if (heapBytes === undefined) throw new Error('JSHeapUsedSize metric is unavailable');
  return {
    label,
    jsHeapMb: Number((heapBytes / 1024 / 1024).toFixed(2)),
    domNodes: counters.nodes,
    eventListeners: counters.jsEventListeners,
    documents: counters.documents,
    liveNodes: await page.locator('*').count(),
  };
}

async function exerciseAllFeatures(page: Page): Promise<void> {
  await openFeature(page, '기본 정렬', 'simple');
  await page.getByRole('button', { name: '코드 보기' }).click();
  await expect(page.getByLabel('소스 코드')).toBeInViewport();
  await page.getByRole('button', { name: '코드 닫기' }).click();
  await dragItem(page, 'todo', 'design', { areaId: 'todo', beforeId: 'research' });
  await expectModel(page, 'todo', ['design', 'research', 'build', 'review']);

  await openFeature(page, '두 목록', 'two-lists');
  await dragItem(page, 'todo', 'design', { areaId: 'done', beforeId: 'review' });
  await expectModel(page, 'todo', ['research', 'build']);
  await expectModel(page, 'done', ['design', 'review']);

  await openFeature(page, '복제', 'clone');
  await dragItem(page, 'todo', 'design', { areaId: 'done', beforeId: 'review' });
  await expectModel(page, 'todo', ['research', 'design', 'build']);
  await expectModel(page, 'done', ['design-copy-1', 'review']);

  await openFeature(page, '사용자 정의 복제', 'custom-clone');
  await dragItem(page, 'todo', 'design', { areaId: 'done', beforeId: 'review' });
  await expectModel(page, 'done', ['design-copy-1', 'review']);
  await expect(page.locator('[data-sortable-id="design-copy-1"]')).toContainText('Customized clone');

  await openFeature(page, '보조키 복제', 'modifier-copy');
  await page.keyboard.down('Alt');
  try {
    await dragItem(page, 'todo', 'design', { areaId: 'done', beforeId: 'review' });
  } finally {
    await page.keyboard.up('Alt');
  }
  await expectModel(page, 'todo', ['research', 'design', 'build']);
  await expectModel(page, 'done', ['design-copy-1', 'review']);
  await page.getByRole('button', { name: '데이터 초기화' }).click();
  await expectModel(page, 'done', ['review']);
  await dragItem(page, 'todo', 'design', { areaId: 'done', beforeId: 'review' });
  await expectModel(page, 'todo', ['research', 'build']);
  await expectModel(page, 'done', ['design', 'review']);

  await openFeature(page, '드래그 시작 영역', 'handle');
  const initialHandleModel = (await model(page)).todo;
  if (initialHandleModel === undefined) throw new Error('Handle model is unavailable');
  const sourceCard = page.locator('[data-sortable-id="design"]');
  const targetCard = page.locator('[data-sortable-id="research"]');
  const sourceBox = await sourceCard.boundingBox();
  const targetBox = await targetCard.boundingBox();
  if (sourceBox === null || targetBox === null) throw new Error('Handle geometry is unavailable');
  await page.mouse.move(sourceBox.x + sourceBox.width - 12, sourceBox.y + sourceBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(targetBox.x + 8, targetBox.y + 8);
  await page.mouse.up();
  await expectModel(page, 'todo', initialHandleModel);
  const handleDrag = await beginDrag(page, 'todo', 'design', { handle: '.cs-demo-handle' });
  await handleDrag.moveBefore('todo', 'research');
  await handleDrag.drop();
  await expectModel(page, 'todo', ['design', 'research', 'build', 'review']);

  await openFeature(page, '전환 효과', 'transition');
  await page.getByRole('button', { name: '순서 뒤집기' }).click();
  await expectModel(page, 'todo', ['build', 'design', 'research']);

  await openFeature(page, '다중 선택 이동', 'transitions');
  await page.keyboard.down('Control');
  await page.locator('[data-sortable-id="research"] > .cs-demo-handle').click();
  await page.keyboard.up('Control');
  await page.keyboard.down('Shift');
  await page.locator('[data-sortable-id="build"] > .cs-demo-handle').click();
  await page.keyboard.up('Shift');
  await expect(page.locator('[data-comins-sortable-selected]')).toHaveCount(3);
  await dragItem(page, 'todo', 'design', { areaId: 'todo', beforeId: 'release' });
  await expectModel(page, 'todo', [
    'review', 'research', 'design', 'build', 'release', 'document', 'observe', 'measure',
  ]);

  await openFeature(page, '정렬 전환 기준', 'thresholds');
  await page.getByRole('slider', { name: '전환 임계값' }).fill('0.8');
  await page.getByRole('button', { name: '임계 영역 반전' }).click();
  await page.getByRole('button', { name: '임계 영역 반전' }).click();
  await dragItem(page, 'todo', 'design', { areaId: 'todo', beforeId: 'research' });
  await expectModel(page, 'todo', ['design', 'research', 'build', 'review', 'release', 'document']);

  await openFeature(page, '스왑', 'swap');
  const swapDrag = await beginDrag(page, 'todo', 'research');
  const swapTarget = page.locator('[data-sortable-id="review"]');
  await swapTarget.evaluate((element) => element.scrollIntoView({ block: 'center' }));
  const swapTargetBox = await swapTarget.boundingBox();
  if (swapTargetBox === null) throw new Error('Swap target geometry is unavailable');
  await page.mouse.move(
    swapTargetBox.x + swapTargetBox.width / 2,
    swapTargetBox.y + swapTargetBox.height / 2,
    { steps: 3 },
  );
  await expect(swapTarget).toHaveAttribute('data-comins-sortable-swap-target', '');
  await swapDrag.drop();
  await expectModel(page, 'todo', ['review', 'design', 'build', 'research', 'release', 'document']);

  await openFeature(page, '그리드', 'grid');
  await dragItem(page, 'todo', 'grid-20', { areaId: 'todo', beforeId: 'grid-1' });
  const gridOrder = (await model(page)).todo;
  if (gridOrder === undefined || gridOrder[0] !== 'grid-20') throw new Error('Grid move did not commit');

  await openFeature(page, '스왑 그리드', 'swap-grid');
  const gridSwap = await beginDrag(page, 'todo', 'grid-1');
  const gridTarget = page.locator('[data-sortable-id="grid-10"]');
  const gridTargetBox = await gridTarget.boundingBox();
  if (gridTargetBox === null) throw new Error('Swap grid geometry is unavailable');
  await page.mouse.move(gridTargetBox.x + gridTargetBox.width / 2, gridTargetBox.y + gridTargetBox.height / 2);
  await expect(gridTarget).toHaveAttribute('data-comins-sortable-swap-target', '');
  await gridSwap.drop();
  const swappedGrid = Array.from({ length: 20 }, (_, index) => `grid-${index + 1}`);
  [swappedGrid[0], swappedGrid[9]] = [swappedGrid[9]!, swappedGrid[0]!];
  await expectModel(page, 'todo', swappedGrid);

  for (const [label, route] of [
    ['사용자 컴포넌트 Host', 'third-party'],
    ['하단 슬롯', 'footer-slot'],
    ['상단 슬롯', 'header-slot'],
  ] as const) {
    await openFeature(page, label, route);
    if (route === 'footer-slot' || route === 'header-slot') {
      const initial = (await model(page)).todo;
      if (initial === undefined) throw new Error(`Missing slot model: ${route}`);
      const drag = await beginDrag(page, 'todo', 'design');
      const slot = page.locator(
        `[data-comins-sortable-area="todo"] > [data-demo-slot="${route === 'footer-slot' ? 'footer' : 'header'}"]`,
      );
      await slot.scrollIntoViewIfNeeded();
      const slotBox = await slot.boundingBox();
      if (slotBox === null) throw new Error(`Missing slot geometry: ${route}`);
      await page.mouse.move(
        slotBox.x + slotBox.width / 2,
        slotBox.y + slotBox.height / 2,
        { steps: 4 },
      );
      await expect(slot).toHaveAttribute('data-comins-sortable-rejection', 'not-accepted');
      await drag.drop();
      await expectModel(page, 'todo', initial);
    }
    await dragItem(page, 'todo', 'design', { areaId: 'todo', beforeId: 'research' });
    await expectModel(page, 'todo', ['design', 'research', 'build']);
  }

  await openFeature(page, '두 목록 슬롯', 'two-list-slots');
  await expect(page.locator('[data-demo-slot]')).toHaveCount(4);
  await dragItem(page, 'todo', 'design', { areaId: 'done', beforeId: 'review' });
  await expectModel(page, 'done', ['design', 'review']);

  await openFeature(page, '중첩 목록', 'nested');
  await dragItem(page, 'todo', 'design', { areaId: 'child', beforeId: 'review' });
  await expectModel(page, 'todo', ['research', 'build']);
  await expectModel(page, 'child', ['design', 'review', 'release']);
  await dragItem(page, 'todo', 'build', { areaId: 'child', beforeId: 'review' });
  await expectModel(page, 'todo', ['research']);
  await expectModel(page, 'child', ['design', 'build', 'review', 'release']);
  await dragItem(page, 'child', 'design', { areaId: 'todo', beforeId: 'research' });
  await expectModel(page, 'todo', ['design', 'research']);
  await expectModel(page, 'child', ['build', 'review', 'release']);

  await openFeature(page, '목록별 상태 제어', 'nested-controlled');
  await page.getByRole('button', { name: '자식 순서 뒤집기' }).click();
  await expectModel(page, 'child', ['release', 'review']);

  await openFeature(page, '사용자 컴포넌트 중첩', 'functional-third-party');
  await expect(page.locator('[data-demo-component-host]')).toHaveCount(2);
  await dragItem(page, 'todo', 'build', { areaId: 'child', beforeId: 'review' });
  await expectModel(page, 'child', ['build', 'review', 'release']);

  await openFeature(page, '빈 대상 목록', 'empty');
  const standardHeight = await page.locator('[data-sortable-id="research"]').evaluate(
    (element) => element.getBoundingClientRect().height,
  );
  await dragItem(page, 'todo', 'design', { areaId: 'done' });
  await expectModel(page, 'done', ['design']);
  await expect.poll(() => page.locator('[data-sortable-id="research"]').evaluate(
    (element) => element.getBoundingClientRect().height,
  )).toBe(standardHeight);

  await openFeature(page, '이동 허용과 거부', 'accept');
  await page.getByRole('button', { name: '대상 이동 허용' }).click();
  await dragItem(page, 'todo', 'design', { areaId: 'done', beforeId: 'review', accepted: false });
  await expectModel(page, 'done', ['review']);
  await expect(page.getByLabel('이벤트 타임라인')).toContainText('not-accepted');

  await openFeature(page, '자동 스크롤', 'auto-scroll');
  const board = page.locator('.cs-demo-board--scroll');
  await board.scrollIntoViewIfNeeded();
  const boardBox = await board.boundingBox();
  const autoScrollSourceBox = await page.locator('[data-sortable-id="research"] > .cs-demo-handle').boundingBox();
  if (boardBox === null || autoScrollSourceBox === null) throw new Error('Auto-scroll geometry is unavailable');
  await page.mouse.move(
    autoScrollSourceBox.x + autoScrollSourceBox.width / 2,
    autoScrollSourceBox.y + autoScrollSourceBox.height / 2,
  );
  await page.mouse.down();
  await page.mouse.move(
    autoScrollSourceBox.x + autoScrollSourceBox.width / 2 + 12,
    autoScrollSourceBox.y + autoScrollSourceBox.height / 2 + 12,
  );
  await page.mouse.move(boardBox.x + boardBox.width / 2, boardBox.y + boardBox.height - 4);
  await expect.poll(() => board.evaluate((element) => element.scrollTop)).toBeGreaterThan(0);
  await page.mouse.up();

  await openFeature(page, '하위 트리 이동', 'tree');
  await dragItem(page, 'todo', 'design', { areaId: 'child', beforeId: 'review' });
  await expectModel(page, 'todo', ['research', 'build']);
  await expectModel(page, 'child', ['design', 'review', 'release']);
  await dragItem(page, 'todo', 'build', { areaId: 'child', beforeId: 'review' });
  await expectModel(page, 'todo', ['research']);
  await expectModel(page, 'child', ['design', 'build', 'review', 'release']);
  await dragItem(page, 'child', 'design', { areaId: 'todo', beforeId: 'research' });
  await expectModel(page, 'todo', ['design', 'research']);
  await expectModel(page, 'child', ['build', 'review', 'release']);

  await dragItem(page, 'child', 'review', { areaId: 'tree-children-design' });
  await expectModel(page, 'child', ['build', 'release']);
  await expectModel(page, 'tree-children-design', ['review']);
  await expectModel(page, 'tree-children-review', ['document', 'observe']);

  for (const [label, route] of [
    ['드롭 피드백 스타일', 'custom-placeholder'],
    ['Skeleton Placeholder', 'skeleton-placeholder'],
  ] as const) {
    await openFeature(page, label, route);
    await dragItem(page, 'todo', 'design', { areaId: 'todo', beforeId: 'research' });
    await expectModel(page, 'todo', ['design', 'research', 'build', 'review']);
    await expect(page.getByLabel('이벤트 타임라인')).toContainText('insertDragArea');
  }
}

test('all Playground features stabilize heap, DOM nodes, and listeners after warm-up', async ({ page, context }) => {
  const cdp = await context.newCDPSession(page);
  await cdp.send('Performance.enable');
  await page.goto('/examples/two-lists/react');
  await waitForRuntime(page);
  const baseline = await sampleResources(page, cdp, 'baseline');

  await exerciseAllFeatures(page);
  await openFeature(page, '두 목록', 'two-lists');
  await page.getByRole('button', { name: '데이터 초기화' }).click();
  const warm = await sampleResources(page, cdp, 'warm');

  await exerciseAllFeatures(page);
  await openFeature(page, '두 목록', 'two-lists');
  await page.getByRole('button', { name: '데이터 초기화' }).click();
  const repeated = await sampleResources(page, cdp, 'repeated');

  console.log(JSON.stringify({ baseline, warm, repeated }, null, 2));
  expect(repeated.documents).toBe(warm.documents);
  expect(repeated.liveNodes).toBe(warm.liveNodes);
  expect(repeated.eventListeners - warm.eventListeners).toBeLessThanOrEqual(5);
  expect(repeated.domNodes - warm.domNodes).toBeLessThanOrEqual(10);
  expect(repeated.jsHeapMb - warm.jsHeapMb).toBeLessThanOrEqual(1);
});
