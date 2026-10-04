import { describe, it, expect, beforeEach } from 'vitest';
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import * as THREE from 'three';
import {
  parseCssColor,
  createDefaultTokenSnapshot,
  extractThreeTokens,
  useThreeTokenStore,
} from '../src/stores/useThreeTokenStore';
import { useSettingsStore } from '../src/stores/useSettingsStore';
import { ThemeTokenBridge } from '../src/components/canvas/ThemeTokenBridge';

describe('useThreeTokenStore & parseCssColor', () => {
  beforeEach(() => {
    useThreeTokenStore.getState().resetTokens();
    useSettingsStore.getState().resetSettings();
  });

  it('parses hex colors into linear THREE.Color', () => {
    const res = parseCssColor('#002b36');
    expect(res.alpha).toBe(1);
    expect(res.color).toBeInstanceOf(THREE.Color);

    // Verify linear conversion matches new THREE.Color('#002b36')
    const expected = new THREE.Color('#002b36');
    expect(res.color.r).toBeCloseTo(expected.r, 3);
    expect(res.color.g).toBeCloseTo(expected.g, 3);
    expect(res.color.b).toBeCloseTo(expected.b, 3);
  });

  it('parses rgba and rgb color strings with alpha', () => {
    const resRgb = parseCssColor('rgb(255, 128, 0)');
    expect(resRgb.alpha).toBe(1);
    expect(resRgb.color.r).toBeCloseTo(1.0, 3);

    const resRgba = parseCssColor('rgba(100, 150, 200, 0.4)');
    expect(resRgba.alpha).toBe(0.4);

    const resRgbaPercent = parseCssColor('rgba(100, 150, 200, 50%)');
    expect(resRgbaPercent.alpha).toBe(0.5);
  });

  it('parses oklch color strings into linear THREE.Color', () => {
    // Solarized base03: oklch(26.73% 0.0486 219.82) -> #002b36
    const resOklch = parseCssColor('oklch(26.73% 0.0486 219.82 / 0.16)');
    expect(resOklch.alpha).toBe(0.16);

    const expected = new THREE.Color('#002b36');
    expect(resOklch.color.r).toBeCloseTo(expected.r, 2);
    expect(resOklch.color.g).toBeCloseTo(expected.g, 2);
    expect(resOklch.color.b).toBeCloseTo(expected.b, 2);
  });


  it('falls back gracefully on empty or invalid color strings', () => {
    const emptyRes = parseCssColor('');
    expect(emptyRes.alpha).toBe(1);
    expect(emptyRes.color.r).toBe(0);

    const invalidRes = parseCssColor('invalid-color-value-1234');
    expect(invalidRes.alpha).toBe(1);
  });

  it('creates distinct default token snapshots for dark, light, and amoled', () => {
    const dark = createDefaultTokenSnapshot('dark');
    const light = createDefaultTokenSnapshot('light');
    const amoled = createDefaultTokenSnapshot('amoled');

    expect(dark.theme).toBe('dark');
    expect(light.theme).toBe('light');
    expect(amoled.theme).toBe('amoled');

    // Canvas background differs
    expect(amoled.canvasBg.r).toBe(0);
    expect(amoled.canvasBg.g).toBe(0);
    expect(amoled.canvasBg.b).toBe(0);

    // Light canvas background is light base3
    expect(light.canvasBg.r).toBeGreaterThan(0.8);
    // Dark canvas background is dark base03
    expect(dark.canvasBg.r).toBeLessThan(0.1);

    // Focus color differs between dark and light
    expect(dark.stateFocus.getHexString()).not.toEqual(light.stateFocus.getHexString());
  });

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
    expect(snapshot.gridPrimaryAlpha).toBe(0.2);
    expect(snapshot.bearingLineAlpha).toBe(0.35);
    expect(snapshot.axisLineAlpha).toBe(0.35);
    expect(snapshot.axisLineWidth).toBe(2);
    expect(snapshot.axisLineStyle).toBe('solid');
    expect(snapshot.gridPrimaryWidth).toBe(2);
    expect(snapshot.rangeTickWidth).toBe(2);
    expect(snapshot.datumPlaneColor).toBeDefined();
    expect(snapshot.datumPlaneAlpha).toBe(0.24);
    expect(snapshot.datumPlaneWidth).toBe(1);
    expect(snapshot.datumPlaneMajorColor).toBeDefined();
    expect(snapshot.datumPlaneMajorAlpha).toBe(0.35);
    expect(snapshot.datumPlaneMinorColor).toBeDefined();
    expect(snapshot.datumPlaneMinorAlpha).toBe(0.16);
    expect(snapshot.datumPlaneFillColor).toBeDefined();
    expect(snapshot.datumPlaneFillAlpha).toBe(0.04);
    expect(snapshot.datumPlaneFillGradientInner).toBe(0.55);
    expect(snapshot.datumPlaneFillGradientExponent).toBe(2.0);
    expect(snapshot.datumFootprintColor).toBeDefined();
    expect(snapshot.datumFootprintAlpha).toBe(0.85);
    expect(snapshot.datumFootprintWidth).toBe(2);
    expect(snapshot.bearingLineWidth).toBe(2);
    expect(snapshot.bearingLineStyle).toBe('dashed');
    expect(snapshot.bearingOrbitalColor).toBeDefined();
    expect(snapshot.bearingOrbitalAlpha).toBe(0.35);
    expect(snapshot.bearingOrbitalWidth).toBe(2);
    expect(snapshot.bearingOrbitalStyle).toBe('dashed');
    expect(snapshot.bearingCoreColor).toBeDefined();
    expect(snapshot.bearingCoreWidth).toBe(2);
    expect(snapshot.bearingCoreStyle).toBe('solid');
    // Fallback token retained when CSS variable is blank
    expect(snapshot.categoryStar).toBeDefined();
  });

  it('updates store tokens via setTokens and resets via resetTokens', () => {
    const customSnapshot = createDefaultTokenSnapshot('light');
    useThreeTokenStore.getState().setTokens(customSnapshot);
    expect(useThreeTokenStore.getState().tokens.theme).toBe('light');

    useThreeTokenStore.getState().resetTokens();
    expect(useThreeTokenStore.getState().tokens.theme).toBe('dark');
  });

  it('mounts ThemeTokenBridge cleanly in SSR without errors', () => {
    expect(() => renderToString(createElement(ThemeTokenBridge))).not.toThrow();
  });
});
