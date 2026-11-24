import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as THREE from 'three';
import { useThree } from '@react-three/fiber';
import ReactThreeTest from '@react-three/test-renderer';
import { render } from '@testing-library/react';
import { ScreenEdgeCue } from './ScreenEdgeCue';
import { SpatialFrameProvider, GALACTIC_FRAME } from './index';
import { SafeHtmlPortalOutlet } from '../SafeHtml';
import { useUIStore } from '../../../stores/useUIStore';

function parseTranslate3d(transform: string): { x: number; y: number } {
  const match = /translate3d\(\s*([-\d.]+)px,\s*([-\d.]+)px,\s*0(?:px)?\s*\)/.exec(transform);
  if (!match) {
    throw new Error(`Unexpected transform string: "${transform}"`);
  }
  return { x: Number(match[1]), y: Number(match[2]) };
}

describe('ScreenEdgeCue safe-rect alignment', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    document.body.innerHTML = '';
    useUIStore.getState().resetUI();
  });

  it('clamps bearing indicator inside measured viewportSafeRect insets rather than overlapping HUD panels', async () => {
    const coreBearing = GALACTIC_FRAME.bearings[0];
    const orbitalBearing = GALACTIC_FRAME.bearings[1];

    useUIStore.getState().setViewportSafeRect({
      top: 64,
      right: 320,
      bottom: 120,
      left: 280,
      width: 840,
      height: 716,
      bypass: false,
    });

    const { unmount: unmountOutlet } = render(<SafeHtmlPortalOutlet />);
    const renderer = await ReactThreeTest.create(
      <SpatialFrameProvider frame={GALACTIC_FRAME}>
        <ScreenEdgeCue bearing={coreBearing} margin={28} />
        <ScreenEdgeCue bearing={orbitalBearing} margin={28} />
      </SpatialFrameProvider>,
      { width: 1440, height: 900 },
    );

    await renderer.advanceFrames(1, 0.016);

    const coreEl = document.querySelector<HTMLElement>('[data-name="bearing-indicator-core"]');
    const orbitalEl = document.querySelector<HTMLElement>('[data-name="bearing-indicator-orbital"]');
    expect(coreEl).not.toBeNull();
    expect(orbitalEl).not.toBeNull();

    const corePos = parseTranslate3d(coreEl!.style.transform);
    const orbitalPos = parseTranslate3d(orbitalEl!.style.transform);

    expect(corePos.x).toBeLessThanOrEqual(1440 - 320 - 28 + 0.1);
    expect(corePos.x).toBeGreaterThanOrEqual(280 + 28 - 0.1);
    expect(corePos.y).toBeGreaterThanOrEqual(64 + 28 - 0.1);
    expect(corePos.y).toBeLessThanOrEqual(900 - 120 - 28 + 0.1);

    expect(orbitalPos.y).toBeGreaterThanOrEqual(64 + 28 - 0.1);
    expect(orbitalPos.y).toBeLessThanOrEqual(900 - 120 - 28 + 0.1);
    expect(orbitalPos.x).toBeGreaterThanOrEqual(280 + 28 - 0.1);
    expect(orbitalPos.x).toBeLessThanOrEqual(1440 - 320 - 28 + 0.1);

    await renderer.unmount();
    unmountOutlet();
  });

  it('ignores safe-rect insets and uses full viewport margins when bypass is true', async () => {
    const coreBearing = GALACTIC_FRAME.bearings[0];

    useUIStore.getState().setViewportSafeRect({
      top: 64,
      right: 320,
      bottom: 120,
      left: 280,
      width: 840,
      height: 716,
      bypass: true,
    });

    const { unmount: unmountOutlet } = render(<SafeHtmlPortalOutlet />);
    const renderer = await ReactThreeTest.create(
      <SpatialFrameProvider frame={GALACTIC_FRAME}>
        <ScreenEdgeCue bearing={coreBearing} margin={28} />
      </SpatialFrameProvider>,
      { width: 1440, height: 900 },
    );

    await renderer.advanceFrames(1, 0.016);

    const coreEl = document.querySelector<HTMLElement>('[data-name="bearing-indicator-core"]');
    expect(coreEl).not.toBeNull();
    const corePos = parseTranslate3d(coreEl!.style.transform);

    expect(corePos.x).toBeCloseTo(1412, 0);

    await renderer.unmount();
    unmountOutlet();
  });

  it('remains visible when camera looks away from world [0, 0, 0] via frustumCulled={false}', async () => {
    const coreBearing = GALACTIC_FRAME.bearings[0];
    let activeCamera: THREE.Camera | null = null;
    const CameraCapturer: React.FC = () => {
      activeCamera = useThree((s) => s.camera);
      return null;
    };

    const { unmount: unmountOutlet } = render(<SafeHtmlPortalOutlet />);
    const renderer = await ReactThreeTest.create(
      <SpatialFrameProvider frame={GALACTIC_FRAME}>
        <CameraCapturer />
        <ScreenEdgeCue bearing={coreBearing} origin={[1000, 0, 0]} margin={28} />
      </SpatialFrameProvider>,
      { width: 1440, height: 900 },
    );

    expect(activeCamera).not.toBeNull();
    activeCamera!.position.set(0, 0, -10);
    activeCamera!.lookAt(0, 0, -20);
    activeCamera!.updateMatrixWorld(true);

    await renderer.advanceFrames(1, 0.016);

    const coreEl = document.querySelector<HTMLElement>('[data-name="bearing-indicator-core"]');
    expect(coreEl).not.toBeNull();
    const safeHtmlContainer = coreEl!.parentElement?.parentElement;
    expect(safeHtmlContainer).not.toBeNull();
    expect(safeHtmlContainer?.style.display).toBe('');
    expect(safeHtmlContainer?.style.transform).toMatch(/^translate3d\(0px,\s*0px,\s*0(?:px)?\)$/);
    expect(coreEl!.style.display).toBe('block');
    expect(coreEl!.style.opacity).toBe('');

    await renderer.unmount();
    unmountOutlet();
  });

  it('pins the full-viewport SafeHtml wrapper to (0, 0) without centering offset and defers visible opacity to CSS', async () => {
    const coreBearing = GALACTIC_FRAME.bearings[0];

    const { unmount: unmountOutlet } = render(<SafeHtmlPortalOutlet />);
    const renderer = await ReactThreeTest.create(
      <SpatialFrameProvider frame={GALACTIC_FRAME}>
        <ScreenEdgeCue bearing={coreBearing} margin={28} />
      </SpatialFrameProvider>,
      { width: 1440, height: 900 },
    );

    await renderer.advanceFrames(1, 0.016);

    const coreEl = document.querySelector<HTMLElement>('[data-name="bearing-indicator-core"]');
    expect(coreEl).not.toBeNull();
    const safeHtmlContainer = coreEl!.parentElement?.parentElement;
    expect(safeHtmlContainer).not.toBeNull();
    expect(safeHtmlContainer?.style.transform).toMatch(/^translate3d\(0px,\s*0px,\s*0(?:px)?\)$/);
    expect(coreEl!.style.opacity).toBe('');

    await renderer.unmount();
    unmountOutlet();
  });
});
