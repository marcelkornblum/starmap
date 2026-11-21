import { describe, it, expect } from 'vitest';
import { extractThreeTokens, readThreeTokensFromDom } from './extractThreeTokens';
import { getThreeColor } from '../utils/threeColorCache';

describe('extractThreeTokens & readThreeTokensFromDom', () => {
  it('extracts tokens from computed styles with fallback preservation', () => {
    const mockComputed = {
      getPropertyValue: (prop: string) => {
        if (prop === '--surface-canvas-bg') return 'oklch(26.73% 0.0486 219.82)';
        if (prop === '--chrome-grid-primary-color') return 'rgba(200, 200, 200, 0.2)';
        if (prop === '--surface-canvas-opacity') return '0.9';
        return '';
      },
    } as unknown as CSSStyleDeclaration;

    const snapshot = extractThreeTokens(mockComputed, 'dark');
    expect(snapshot.theme).toBe('dark');
    expect(snapshot.canvasOpacity).toBe(0.9);
    expect(typeof snapshot.canvasBg).toBe('string');
    expect(typeof snapshot.gridPrimaryColor).toBe('string');
    expect(snapshot.gridPrimaryAlpha).toBe(0.2);
    expect(snapshot.bearingLineAlpha).toBe(0.35);
    expect(snapshot.axisLineAlpha).toBe(0.16);
    expect(snapshot.axisLineWidth).toBe(1);
    expect(snapshot.axisLineStyle).toBe('solid');
    expect(snapshot.gridPrimaryWidth).toBe(2);
    expect(snapshot.rangeTickWidth).toBe(2);
    expect(snapshot.datumPlaneColor).toBeDefined();
    expect(snapshot.datumPlaneAlpha).toBe(0.35);
    expect(snapshot.datumPlaneWidth).toBe(1);
    expect(snapshot.datumPlaneMajorColor).toBeDefined();
    expect(snapshot.datumPlaneMajorAlpha).toBe(0.35);
    expect(snapshot.datumPlaneMinorColor).toBeDefined();
    expect(snapshot.datumPlaneMinorAlpha).toBe(0.18);
    expect(snapshot.datumPlaneFillColor).toBeDefined();
    expect(snapshot.datumPlaneFillAlpha).toBe(0.16);
    expect(snapshot.datumPlaneFillGradientInner).toBe(0.25);
    expect(snapshot.datumPlaneFillGradientExponent).toBe(2.0);
    expect(snapshot.datumFootprintColor).toBeDefined();
    expect(snapshot.datumFootprintAlpha).toBe(0.25);
    expect(snapshot.datumFootprintWidth).toBe(2);
    expect(snapshot.bearingLineWidth).toBe(2);
    expect(snapshot.bearingLineStyle).toBe('solid');
    expect(snapshot.bearingOrbitalColor).toBeDefined();
    expect(snapshot.bearingOrbitalAlpha).toBe(0.35);
    expect(snapshot.bearingOrbitalWidth).toBe(2);
    expect(snapshot.bearingOrbitalStyle).toBe('dashed');
    expect(snapshot.bearingCoreColor).toBeDefined();
    expect(snapshot.bearingCoreWidth).toBe(2);
    expect(snapshot.bearingCoreStyle).toBe('solid');

    expect(snapshot.kinematicColor).toBeDefined();
    expect(snapshot.kinematicAlpha).toBe(0.35);
    expect(snapshot.stalkSelectedAlpha).toBe(0.7);
    expect(snapshot.stalkFocusedAlpha).toBe(0.85);
    expect(snapshot.footprintAlpha).toBe(0.35);
    expect(snapshot.orbitAlpha).toBe(0.24);
    expect(snapshot.orbitStyle).toBe('dashed');
    expect(snapshot.routeWidth).toBe(3);
    expect(snapshot.routeStyle).toBe('solid');
    expect(snapshot.stalkExtendDuration).toBe(0.15);
    expect(snapshot.stalkRetractDuration).toBe(0.1);
    expect(snapshot.instrumentFootprint).toBe(16.47);
    expect(snapshot.cameraFovBase).toBe(45);

    expect(snapshot.categoryStar).toBeDefined();
  });

  it('dereferences nested var() tokens down to literal values', () => {
    const mockComputed = {
      getPropertyValue: (prop: string) => {
        if (prop === '--state-focus') return 'var(--palette-accent-focus)';
        if (prop === '--palette-accent-focus') return 'oklch(75.0% 0.190 156)';
        if (prop === '--chrome-reticle-alpha-focused') return 'var(--opacity-100)';
        if (prop === '--opacity-100') return '1.0';
        return '';
      },
    } as unknown as CSSStyleDeclaration;

    const snapshot = extractThreeTokens(mockComputed, 'dark');
    const focusColor = getThreeColor(snapshot.stateFocus);
    expect(focusColor.r).toBeCloseTo(0, 2);
    expect(focusColor.g).toBeGreaterThan(0.6);
    expect(snapshot.reticleFocusedAlpha).toBe(1.0);
  });

  it('reads tokens from DOM or falls back cleanly in non-DOM environments', () => {
    const snapshot = readThreeTokensFromDom(undefined, 'light');
    expect(snapshot.theme).toBe('light');
    expect(snapshot.canvasBg).toBe('#fdf6e3');

    // Test with mock window and document
    const mockElement = {} as Element;
    const mockComputed = {
      getPropertyValue: (prop: string) => {
        if (prop === '--surface-canvas-bg') return '#123456';
        return '';
      },
    } as unknown as CSSStyleDeclaration;

    const originalWindow = globalThis.window;
    const originalDocument = globalThis.document;
    try {
      (globalThis as unknown as { window: unknown }).window = {
        getComputedStyle: () => mockComputed,
      };
      (globalThis as unknown as { document: unknown }).document = {
        documentElement: mockElement,
      };

      const extracted = readThreeTokensFromDom(mockElement, 'dark');
      expect(extracted.canvasBg).toBe('#123456');
    } finally {
      (globalThis as unknown as { window: unknown }).window = originalWindow;
      (globalThis as unknown as { document: unknown }).document = originalDocument;
    }
  });
});
