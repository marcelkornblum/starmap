import { describe, it, expect, beforeEach } from 'vitest';
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import * as THREE from 'three';
import {
  parseCssColor,
  parseCssDuration,
  parseCssPx,
  parseCssCubicBezier,
  createDefaultTokenSnapshot,
  extractThreeTokens,
  useThreeTokenStore,
  getThreeColor,
} from '../src/stores/useThreeTokenStore';
import { CARTO_LINE_CONSTANTS } from '../src/components/canvas/materials/CartoLineMaterial';
import { useSettingsStore } from '../src/stores/useSettingsStore';
import { ThemeTokenBridge } from '../src/components/canvas/ThemeTokenBridge';

describe('useThreeTokenStore & parseCssColor', () => {
  beforeEach(() => {
    useThreeTokenStore.getState().resetTokens();
    useSettingsStore.getState().resetSettings();
  });

  it('parses hex colors into colorHex string and alpha (AUD-111)', () => {
    const res = parseCssColor('#002b36');
    expect(res.alpha).toBe(1);
    expect(res.colorHex).toBe('#002b36');
  });

  it('parses rgba and rgb color strings with alpha (AUD-111)', () => {
    const resRgb = parseCssColor('rgb(255, 128, 0)');
    expect(resRgb.alpha).toBe(1);
    expect(resRgb.colorHex).toBe('#ff8000');

    const resRgba = parseCssColor('rgba(100, 150, 200, 0.4)');
    expect(resRgba.alpha).toBe(0.4);
    expect(resRgba.colorHex).toBe('#6496c8');

    const resRgbaPercent = parseCssColor('rgba(100, 150, 200, 50%)');
    expect(resRgbaPercent.alpha).toBe(0.5);
    expect(resRgbaPercent.colorHex).toBe('#6496c8');
  });

  it('parses oklch color strings into colorHex and alpha (AUD-111)', () => {
    // Solarized base03: oklch(26.73% 0.0486 219.82) -> #002b36
    const resOklch = parseCssColor('oklch(26.73% 0.0486 219.82 / 0.16)');
    expect(resOklch.alpha).toBe(0.16);
    expect(resOklch.colorHex).toBe('#002b36');
  });

  it('falls back gracefully on empty or invalid color strings', () => {
    const emptyRes = parseCssColor('');
    expect(emptyRes.alpha).toBe(1);
    expect(emptyRes.colorHex).toBe('#000000');

    const invalidRes = parseCssColor('invalid-color-value-1234');
    expect(invalidRes.alpha).toBe(1);
    expect(invalidRes.colorHex).toBe('#000000');
  });

  it('creates distinct default token snapshots with immutable primitive hex colors and unified dash metrics (AUD-111, AUD-112)', () => {
    const dark = createDefaultTokenSnapshot('dark');
    const light = createDefaultTokenSnapshot('light');
    const amoled = createDefaultTokenSnapshot('amoled');

    expect(dark.theme).toBe('dark');
    expect(light.theme).toBe('light');
    expect(amoled.theme).toBe('amoled');

    // Immutable primitive strings
    expect(typeof dark.canvasBg).toBe('string');
    expect(typeof dark.gridPrimaryColor).toBe('string');
    expect(typeof dark.stateFocus).toBe('string');

    // Canvas background differs
    expect(amoled.canvasBg).toBe('#000000');
    expect(light.canvasBg).toBe('#fdf6e3');
    expect(dark.canvasBg).toBe('#002b36');

    // Unified dash metrics referencing CARTO_LINE_CONSTANTS
    expect(dark.dashSize).toBe(CARTO_LINE_CONSTANTS.dashSize);
    expect(dark.dashGap).toBe(CARTO_LINE_CONSTANTS.gapSize);
    expect(dark.dotSize).toBe(CARTO_LINE_CONSTANTS.dotSize);
    expect(dark.dotGap).toBe(CARTO_LINE_CONSTANTS.dotGap);

    // Focus color differs between dark and light
    expect(dark.stateFocus).not.toBe(light.stateFocus);
  });

  it('converts hex string to THREE.Color via getThreeColor with cached instance reuse', () => {
    const c1 = getThreeColor('#002b36');
    const c2 = getThreeColor('#002b36');
    expect(c1).toBeInstanceOf(THREE.Color);
    expect(c1).toBe(c2);
    expect(c1.getHexString()).toBe('002b36');
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

    // New semantic tokens
    expect(snapshot.kinematicColor).toBeDefined();
    expect(snapshot.kinematicAlpha).toBe(0.35);
    expect(snapshot.stalkSelectedAlpha).toBe(0.70);
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

describe('CSS parsers (duration, cubic-bezier, px)', () => {
  it('parses CSS duration strings into seconds', () => {
    expect(parseCssDuration('150ms')).toBeCloseTo(0.15, 4);
    expect(parseCssDuration('400ms')).toBeCloseTo(0.40, 4);
    expect(parseCssDuration('0ms')).toBe(0);
    expect(parseCssDuration('1.5s')).toBe(1.5);
    expect(parseCssDuration('invalid', 0.25)).toBe(0.25);
    expect(parseCssDuration('', 0.1)).toBe(0.1);
  });

  it('parses CSS px strings into numbers', () => {
    expect(parseCssPx('16.47px')).toBe(16.47);
    expect(parseCssPx('2px')).toBe(2);
    expect(parseCssPx('45')).toBe(45);
    expect(parseCssPx('', 10)).toBe(10);
  });

  it('parses cubic-bezier easing and solves progress smoothly', () => {
    const linear = parseCssCubicBezier('linear');
    expect(linear(0)).toBe(0);
    expect(linear(0.5)).toBe(0.5);
    expect(linear(1)).toBe(1);

    const snappy = parseCssCubicBezier('cubic-bezier(0.2, 0, 0, 1)');
    expect(snappy(0)).toBe(0);
    expect(snappy(1)).toBe(1);
    // At t=0.5, snappy curve is already high
    expect(snappy(0.5)).toBeGreaterThan(0.7);

    const invalid = parseCssCubicBezier('not-a-curve');
    expect(invalid(0.5)).toBe(0.5);
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
});
