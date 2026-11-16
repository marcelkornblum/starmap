/// <reference lib="dom" />
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test, expect, type Page } from 'playwright/test';

interface SelectionSample {
  readonly label: string;
  readonly clickToCommitMs: number;
  readonly clickToSettledPaintMs: number;
  readonly maxFrameGapMs: number;
  readonly domMutationRecords: number;
}

interface DragMetrics {
  readonly fps: number;
  readonly meanFrameTimeMs: number;
  readonly p95FrameTimeMs: number;
  readonly maxFrameTimeMs: number;
  readonly domMutationRecords: number;
}

async function waitForCanvasReady(page: Page, route: string, rootTestId = 'galaxy-view-root') {
  await page.goto(route);
  await expect(page.getByTestId(rootTestId)).toBeVisible({ timeout: 15_000 });
  const rootHost = page.locator('[data-testid="root-canvas-host"]');
  await expect(rootHost).toBeVisible({ timeout: 15_000 });
  await expect(rootHost).toHaveAttribute('data-camera-pos', /.+/, { timeout: 15_000 });
  const canvas = rootHost.locator('canvas');
  await expect(canvas).toBeVisible({ timeout: 15_000 });
  await page.evaluate(
    () =>
      new Promise<void>((resolve) => {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            setTimeout(resolve, 1200);
          });
        });
      }),
  );
  return { rootHost, canvas };
}

function projectStarScreenPoint(
  starPos: [number, number, number],
  camPos: [number, number, number],
  camTarget: [number, number, number],
  canvasBox: { x: number; y: number; width: number; height: number },
): { x: number; y: number } {
  let zx = camPos[0] - camTarget[0];
  let zy = camPos[1] - camTarget[1];
  let zz = camPos[2] - camTarget[2];
  const zLen = Math.hypot(zx, zy, zz) || 1;
  zx /= zLen;
  zy /= zLen;
  zz /= zLen;

  let xx = -zy;
  let xy = zx;
  const xLen = Math.hypot(xx, xy) || 1;
  xx /= xLen;
  xy /= xLen;

  const yx = -zz * xy;
  const yy = zz * xx;
  const yz = zx * xy - zy * xx;

  const dx = starPos[0] - camPos[0];
  const dy = starPos[1] - camPos[1];
  const dz = starPos[2] - camPos[2];

  const xCam = dx * xx + dy * xy;
  const yCam = dx * yx + dy * yy + dz * yz;
  const zCam = -(dx * zx + dy * zy + dz * zz);

  const aspect = canvasBox.width / canvasBox.height;
  const tanFov = Math.tan(((45 / 2) * Math.PI) / 180);
  const ndcX = xCam / (zCam * tanFov * aspect);
  const ndcY = yCam / (zCam * tanFov);

  return {
    x: canvasBox.x + (ndcX * 0.5 + 0.5) * canvasBox.width,
    y: canvasBox.y + (-ndcY * 0.5 + 0.5) * canvasBox.height,
  };
}

async function measureCanvasStarClick(
  page: Page,
  star: { id: string; label: string; x: number; y: number },
): Promise<SelectionSample> {
  await page.evaluate(
    ({ expectedId, sampleLabel }) => {
      const prevEntityId =
        document.querySelector('[data-testid="details-panel"]')?.getAttribute('data-entity-id') ?? '';

      const pendingPromise = new Promise<SelectionSample>((resolve) => {
        let t0 = 0;
        let domMutations = 0;
        let commitTime = 0;
        const frameGaps: number[] = [];
        let rafRunning = false;
        let lastFrame = 0;

        const tick = (now: number) => {
          if (!rafRunning) return;
          frameGaps.push(now - lastFrame);
          lastFrame = now;
          requestAnimationFrame(tick);
        };

        let resolveCommitted!: () => void;
        const committedPromise = new Promise<void>((res) => {
          resolveCommitted = res;
        });

        const checkCommitted = () => {
          if (t0 === 0 || commitTime !== 0) return;
          const panelEntityId =
            document.querySelector('[data-testid="details-panel"]')?.getAttribute('data-entity-id') ?? '';
          const focusedLabel = document.querySelector(
            `[data-testid="entity-label-inner-${expectedId}"][data-state="focused"]`,
          );
          if (
            panelEntityId === expectedId ||
            focusedLabel !== null ||
            (panelEntityId.length > 0 && panelEntityId !== prevEntityId)
          ) {
            commitTime = performance.now();
            resolveCommitted();
          }
        };

        const observer = new MutationObserver((records) => {
          if (t0 > 0) domMutations += records.length;
          checkCommitted();
        });

        window.addEventListener(
          'pointerup',
          () => {
            t0 = performance.now();
            lastFrame = t0;
            rafRunning = true;
            requestAnimationFrame(tick);
            observer.observe(document.body, {
              subtree: true,
              childList: true,
              characterData: true,
              attributes: true,
            });
            checkCommitted();

            void (async () => {
              await Promise.race([
                committedPromise,
                new Promise<void>((res) => setTimeout(res, 5_000)),
              ]);
              if (commitTime === 0) {
                commitTime = performance.now();
              }

              await new Promise<void>((res) => {
                requestAnimationFrame(() => {
                  requestAnimationFrame(() => res());
                });
              });
              const settledPaintTime = performance.now();

              await new Promise<void>((res) => setTimeout(res, 150));

              rafRunning = false;
              observer.disconnect();

              const maxGap = frameGaps.length > 0 ? Math.max(...frameGaps) : 0;
              resolve({
                label: sampleLabel,
                clickToCommitMs: Number((commitTime - t0).toFixed(2)),
                clickToSettledPaintMs: Number((settledPaintTime - t0).toFixed(2)),
                maxFrameGapMs: Number(maxGap.toFixed(2)),
                domMutationRecords: domMutations,
              });
            })();
          },
          { capture: true, once: true },
        );
      });

      (window as unknown as { __canvasClickPerf?: Promise<SelectionSample> }).__canvasClickPerf =
        pendingPromise;
    },
    { expectedId: star.id, sampleLabel: star.label },
  );

  await page.mouse.move(star.x, star.y);
  await page.mouse.click(star.x, star.y);

  return page.evaluate(() => {
    const p = (window as unknown as { __canvasClickPerf?: Promise<SelectionSample> }).__canvasClickPerf;
    if (!p) throw new Error('Missing __canvasClickPerf promise');
    return p;
  });
}

async function measureSearchResultClick(
  page: Page,
  query: string,
  linkPattern: RegExp,
  sampleLabel: string,
): Promise<SelectionSample> {
  await page.waitForTimeout(250);
  const searchInput = page.getByRole('searchbox', { name: /search query/i });
  await searchInput.fill(query);
  const resultLink = page
    .getByTestId('search-results-group-stars')
    .getByRole('link', { name: linkPattern })
    .first();
  await expect(resultLink).toBeVisible({ timeout: 10_000 });
  await page.evaluate(
    () =>
      new Promise<void>((r) =>
        requestAnimationFrame(() => requestAnimationFrame(() => r())),
      ),
  );
  const box = await resultLink.boundingBox();
  if (!box) {
    throw new Error(`Missing bounding box for search result ${query}`);
  }
  const clickX = box.x + box.width / 2;
  const clickY = box.y + box.height / 2;

  return page.evaluate(
    async ({ x, y, labelText }) => {
      const prevEntityId =
        document.querySelector('[data-testid="details-panel"]')?.getAttribute('data-entity-id') ?? '';
      let domMutations = 0;
      let commitTime = 0;
      const frameGaps: number[] = [];
      let rafRunning = true;
      let lastFrame = performance.now();

      const tick = (now: number) => {
        if (!rafRunning) return;
        frameGaps.push(now - lastFrame);
        lastFrame = now;
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);

      let resolveCommitted!: () => void;
      const committedPromise = new Promise<void>((res) => {
        resolveCommitted = res;
      });

      const checkCommitted = () => {
        const panelEntityId =
          document.querySelector('[data-testid="details-panel"]')?.getAttribute('data-entity-id') ?? '';
        if (commitTime === 0 && panelEntityId.length > 0 && panelEntityId !== prevEntityId) {
          commitTime = performance.now();
          resolveCommitted();
        }
      };

      const observer = new MutationObserver((records) => {
        domMutations += records.length;
        checkCommitted();
      });
      observer.observe(document.body, {
        subtree: true,
        childList: true,
        characterData: true,
        attributes: true,
      });

      const el = document.elementFromPoint(x, y) as HTMLElement | null;
      const anchor = (el?.closest('a') ?? el) as HTMLElement | null;
      const t0 = performance.now();
      anchor?.click();

      checkCommitted();
      await Promise.race([
        committedPromise,
        new Promise<void>((res) => setTimeout(res, 5_000)),
      ]);
      if (commitTime === 0) {
        commitTime = performance.now();
      }

      await new Promise<void>((res) => {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => res());
        });
      });
      const settledPaintTime = performance.now();

      await new Promise<void>((res) => setTimeout(res, 200));
      rafRunning = false;
      observer.disconnect();

      const maxGap = frameGaps.length > 0 ? Math.max(...frameGaps) : 0;
      return {
        label: labelText,
        clickToCommitMs: Number((commitTime - t0).toFixed(2)),
        clickToSettledPaintMs: Number((settledPaintTime - t0).toFixed(2)),
        maxFrameGapMs: Number(maxGap.toFixed(2)),
        domMutationRecords: domMutations,
      };
    },
    { x: clickX, y: clickY, labelText: sampleLabel },
  );
}

async function measureFocusedOrbitDrag(page: Page, route: string): Promise<DragMetrics> {
  const { canvas } = await waitForCanvasReady(page, route);
  if (route.includes('focus=')) {
    await expect(page.getByTestId('orbital-schematic-panel')).toBeVisible({ timeout: 15_000 });
    if (route.includes('focus=sol')) {
      await expect(page.getByTestId('details-canon-section')).toBeVisible({ timeout: 15_000 });
    }
    await page.waitForTimeout(300);
    await page.evaluate(
      () =>
        new Promise<void>((r) =>
          requestAnimationFrame(() => requestAnimationFrame(() => r())),
        ),
    );
  }
  const box = await canvas.boundingBox();
  if (!box) {
    throw new Error('Missing canvas bounding box');
  }
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;

  return page.evaluate(
    ({ centerX, centerY }) =>
      new Promise<DragMetrics>((resolve) => {
        const canvasEl = document.querySelector('[data-testid="root-canvas-host"] canvas');
        const timestamps: number[] = [];
        const radius = 90;
        const totalSteps = 40;
        let step = 0;
        let domMutations = 0;

        const observer = new MutationObserver((records) => {
          domMutations += records.length;
        });
        observer.observe(document.body, {
          subtree: true,
          childList: true,
          characterData: true,
          attributes: true,
        });

        canvasEl?.dispatchEvent(
          new PointerEvent('pointerdown', {
            clientX: centerX,
            clientY: centerY,
            button: 0,
            buttons: 1,
            bubbles: true,
          }),
        );

        const onFrame = (now: number) => {
          timestamps.push(now);
          if (step < totalSteps) {
            const angle = (step / totalSteps) * Math.PI * 2;
            canvasEl?.dispatchEvent(
              new PointerEvent('pointermove', {
                clientX: centerX + Math.cos(angle) * radius,
                clientY: centerY + Math.sin(angle) * radius,
                button: 0,
                buttons: 1,
                bubbles: true,
              }),
            );
            step++;
            requestAnimationFrame(onFrame);
            return;
          }

          canvasEl?.dispatchEvent(
            new PointerEvent('pointerup', {
              clientX: centerX,
              clientY: centerY,
              button: 0,
              buttons: 0,
              bubbles: true,
            }),
          );
          observer.disconnect();

          const deltas: number[] = [];
          for (let i = 1; i < timestamps.length; i++) {
            deltas.push(timestamps[i]! - timestamps[i - 1]!);
          }
          const totalDuration =
            timestamps.length >= 2 ? timestamps[timestamps.length - 1]! - timestamps[0]! : 1;
          const sorted = [...deltas].sort((a, b) => a - b);
          const p95Idx = Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95));

          resolve({
            fps: Number(((deltas.length / totalDuration) * 1000).toFixed(2)),
            meanFrameTimeMs: Number((totalDuration / Math.max(deltas.length, 1)).toFixed(2)),
            p95FrameTimeMs: Number((sorted[p95Idx] ?? 0).toFixed(2)),
            maxFrameTimeMs: Number((sorted[sorted.length - 1] ?? 0).toFixed(2)),
            domMutationRecords: domMutations,
          });
        };

        requestAnimationFrame(onFrame);
      }),
    { centerX: cx, centerY: cy },
  );
}

test.describe('System Selection Latency & Focused Interaction Performance Guard', () => {
  test.setTimeout(120_000);

  test('selecting systems on /, /galaxy, and direct 3D canvas commits without main-thread lag and maintains smooth focused orbit FPS', async ({
    page,
  }) => {
    const selectionSamples: SelectionSample[] = [];

    // 1. Root landing route `/` (default zoom, ~1,000 streamed stars) -> first selection + sequential selections
    await waitForCanvasReady(page, '/');
    selectionSamples.push(
      await measureSearchResultClick(page, 'Tau Ceti', /Tau Ceti/i, 'root:/ -> Tau Ceti'),
    );
    selectionSamples.push(
      await measureSearchResultClick(page, 'Sol', /\bSol\b/i, '/galaxy -> Sol'),
    );
    selectionSamples.push(
      await measureSearchResultClick(page, 'Epsilon Eridani', /Epsilon Eridani/i, '/galaxy -> Epsilon Eridani'),
    );
    selectionSamples.push(
      await measureSearchResultClick(page, 'Sirius', /Sirius/i, '/galaxy -> Sirius'),
    );

    // 2. Direct 3D canvas raycast clicks on `/galaxy?dist=10` (trusted Playwright mouse clicks matching canvas-interaction-and-fps.spec.ts)
    const { rootHost: hostDist10, canvas: canvasDist10 } = await waitForCanvasReady(
      page,
      '/galaxy?dist=10',
    );
    await expect(page.getByTestId('bodies-galaxy-system-item').first()).toBeVisible({
      timeout: 15_000,
    });
    await page.waitForTimeout(300);

    const box10 = await canvasDist10.boundingBox();
    expect(box10).not.toBeNull();
    const cx10 = box10!.x + box10!.width / 2;
    const cy10 = box10!.y + box10!.height / 2;

    selectionSamples.push(
      await measureCanvasStarClick(page, {
        id: 'sol',
        label: 'canvas:/galaxy?dist=10 -> Sol',
        x: cx10,
        y: cy10,
      }),
    );

    await expect(page.locator('[data-testid="details-panel"]')).toBeVisible({ timeout: 15_000 });

    const activeCanvasBox = await canvasDist10.boundingBox();
    expect(activeCanvasBox).not.toBeNull();
    const curCx = activeCanvasBox!.x + activeCanvasBox!.width / 2;
    const curCy = activeCanvasBox!.y + activeCanvasBox!.height / 2;

    await page.mouse.move(curCx, curCy);
    await page.mouse.down({ button: 'right' });
    await page.mouse.move(curCx + 40, curCy + 30, { steps: 5 });
    await page.mouse.up({ button: 'right' });

    let consecutiveMatches = 0;
    let prevSample = '';
    for (let i = 0; i < 30; i++) {
      await page.waitForTimeout(100);
      const currentSample = `${await hostDist10.getAttribute('data-camera-pos')}|${await hostDist10.getAttribute('data-camera-target')}`;
      if (currentSample === prevSample && currentSample.length > 5) {
        consecutiveMatches++;
        if (consecutiveMatches >= 5) {
          break;
        }
      } else {
        consecutiveMatches = 0;
      }
      prevSample = currentSample;
    }

    const targetAfterPan = (await hostDist10.getAttribute('data-camera-target'))!
      .split(',')
      .map(Number) as [number, number, number];
    const posAfterPan = (await hostDist10.getAttribute('data-camera-pos'))!
      .split(',')
      .map(Number) as [number, number, number];

    const nonSolCandidates: Array<{ id: string; name: string; pos: [number, number, number] }> = [
      { id: 'hip-32349', name: 'Sirius', pos: [-0.494, 2.477, -0.759] },
      { id: 'gaia-5164707970261890560', name: 'Epsilon Eridani', pos: [1.902, 2.522, -0.638] },
      { id: 'hip-71683', name: 'Alpha Centauri', pos: [-0.495, -0.414, -1.157] },
      { id: 'gaia-4472832130942575872', name: "Barnard's Star", pos: [-0.057, -1.815, 0.149] },
      { id: 'luhman-16', name: 'Luhman 16', pos: [-1.008, -1.613, -0.587] },
    ];

    let nonSolClickedCount = 0;
    for (const cand of nonSolCandidates) {
      if (nonSolClickedCount >= 3) break;
      const pt = projectStarScreenPoint(cand.pos, posAfterPan, targetAfterPan, activeCanvasBox!);
      const isCanvasHit = await page.evaluate(
        ({ x, y }) => document.elementFromPoint(x, y)?.tagName.toLowerCase() === 'canvas',
        pt,
      );
      if (!isCanvasHit) continue;
      selectionSamples.push(
        await measureCanvasStarClick(page, {
          id: cand.id,
          label: `canvas -> ${cand.name}`,
          x: pt.x,
          y: pt.y,
        }),
      );
      nonSolClickedCount++;
    }

    expect(nonSolClickedCount).toBeGreaterThanOrEqual(2);

    // 3. Orbit drag frame-time comparison: unselected `/galaxy` vs focused `/galaxy?focus=sol` & `/galaxy?focus=tau-ceti`
    const dragUnselected = await measureFocusedOrbitDrag(page, '/galaxy');
    const dragFocusedSol = await measureFocusedOrbitDrag(page, '/galaxy?focus=sol');
    const dragFocusedTauCeti = await measureFocusedOrbitDrag(page, '/galaxy?focus=tau-ceti');

    const report = {
      selectionSamples,
      dragMetrics: {
        '/galaxy': dragUnselected,
        '/galaxy?focus=sol': dragFocusedSol,
        '/galaxy?focus=tau-ceti': dragFocusedTauCeti,
      },
    };

    const outDir = path.join(os.tmpdir(), 'starmap-test-results');
    fs.mkdirSync(outDir, { recursive: true });
    const outPath = path.join(outDir, 'selection-performance.json');
    fs.writeFileSync(outPath, `${JSON.stringify(report, null, 2)}\n`, 'utf-8');
    console.log(`[Selection Performance Telemetry]\n${JSON.stringify(report, null, 2)}`);

    const commitBudgetMs = process.env.CI ? 450 : 250;
    const selectionBudgetMs = process.env.CI ? 650 : 320;
    const dragFactor = process.env.CI ? 1.75 : 1.35;

    for (const sample of selectionSamples) {
      expect(
        sample.clickToCommitMs,
        `${sample.label} clickToCommitMs (${sample.clickToCommitMs}ms) exceeded ${commitBudgetMs}ms budget`,
      ).toBeLessThan(commitBudgetMs);
      expect(
        sample.clickToSettledPaintMs,
        `${sample.label} clickToSettledPaintMs (${sample.clickToSettledPaintMs}ms) exceeded ${selectionBudgetMs}ms budget`,
      ).toBeLessThan(selectionBudgetMs);
    }

    expect(dragFocusedSol.meanFrameTimeMs).toBeLessThanOrEqual(
      Math.max(dragUnselected.meanFrameTimeMs * dragFactor, 55),
    );
    expect(dragFocusedTauCeti.meanFrameTimeMs).toBeLessThanOrEqual(
      Math.max(dragUnselected.meanFrameTimeMs * dragFactor, 55),
    );
    expect(dragFocusedSol.p95FrameTimeMs).toBeLessThanOrEqual(
      Math.max(dragUnselected.p95FrameTimeMs * dragFactor, 105),
    );
    expect(dragFocusedTauCeti.p95FrameTimeMs).toBeLessThanOrEqual(
      Math.max(dragUnselected.p95FrameTimeMs * dragFactor, 105),
    );
  });
});
