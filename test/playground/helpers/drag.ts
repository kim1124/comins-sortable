import type { Page } from '@playwright/test';
import { beginDrag as beginFixtureDrag } from '../../playwright/helpers/drag.js';

export { domIds, movePointerToDropTarget, waitForFrameworkRender } from '../../playwright/helpers/drag.js';

// Playground cards use handles; the package fixtures still exercise whole-item dragging.
export function beginDrag(
  page: Page,
  areaId: string,
  itemId: string,
  options: { handle?: string } = {},
) {
  return beginFixtureDrag(page, areaId, itemId, { handle: '.cs-demo-handle', ...options });
}

export async function dragItem(
  page: Page,
  areaId: string,
  itemId: string,
  target: { areaId: string; beforeId?: string; accepted?: boolean },
): Promise<void> {
  const drag = await beginDrag(page, areaId, itemId);
  await drag.moveBefore(target.areaId, target.beforeId, target.accepted);
  await drag.drop();
}
