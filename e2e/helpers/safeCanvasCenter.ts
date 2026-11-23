import { expect, type Page } from 'playwright/test';

export async function getViewOffsetPx(page: Page): Promise<{ ox: number; oy: number }> {
  const attr = await page
    .locator('[data-testid="root-canvas-host"]')
    .getAttribute('data-view-offset');
  if (!attr) {
    return { ox: 0, oy: 0 };
  }
  const [rawX, rawY] = attr.split(',').map(Number);
  return {
    ox: Number.isFinite(rawX) ? rawX : 0,
    oy: Number.isFinite(rawY) ? rawY : 0,
  };
}

export async function getSafeCanvasCenter(
  page: Page,
  settleMs = 0,
): Promise<{
  x: number;
  y: number;
  box: { x: number; y: number; width: number; height: number };
}> {
  if (settleMs > 0) {
    await page.waitForTimeout(settleMs);
  }
  const canvas = page.locator('[data-testid="root-canvas-host"] canvas');
  const box = await canvas.boundingBox();
  if (!box) {
    throw new Error('Missing bounding box for [data-testid="root-canvas-host"] canvas');
  }
  const { ox, oy } = await getViewOffsetPx(page);
  return {
    x: box.x + box.width / 2 - ox,
    y: box.y + box.height / 2 - oy,
    box,
  };
}

export async function panCanvasOffCenter(
  page: Page,
  deltaX = 120,
  deltaY = 60,
): Promise<void> {
  const { x, y } = await getSafeCanvasCenter(page);
  await page.mouse.move(x, y);
  await page.mouse.down({ button: 'right' });
  await page.mouse.move(x + deltaX, y + deltaY, { steps: 6 });
  await page.mouse.up({ button: 'right' });
}

export function expectTelemetryTupleWithin(
  actual: string | null,
  expected: string,
  epsilon = 0.05,
): void {
  expect(actual).not.toBeNull();
  const actualNums = (actual ?? '').split(',').map(Number);
  const expectedNums = expected.split(',').map(Number);
  expect(actualNums.length).toBe(expectedNums.length);
  for (let i = 0; i < expectedNums.length; i += 1) {
    expect(Math.abs((actualNums[i] ?? Number.NaN) - (expectedNums[i] ?? 0))).toBeLessThanOrEqual(
      epsilon,
    );
  }
}
