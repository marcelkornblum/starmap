import { parseCssPx, parseCssDuration, parseCssFloat } from './cssTokenParsers';
import { parseCssCubicBezier } from './easingMath';
import type { ThreeTheme, ThreeLineStyle, ThreeTokenSnapshot, EasingFunction } from '../types/threeTokens';
import { createDefaultTokenSnapshot } from './threeTokenDefaults';
import { extractThreeColorTokens, resolveCssVar, readCssOpacity } from './extractThreeColorTokens';

function readWidth(computed: CSSStyleDeclaration, varName: string, defaultVal: number): number {
  const raw = resolveCssVar(computed, computed.getPropertyValue(varName));
  return parseCssFloat(raw, defaultVal);
}

function readStyle(
  computed: CSSStyleDeclaration,
  varName: string,
  defaultVal: ThreeLineStyle,
): ThreeLineStyle {
  const raw = resolveCssVar(computed, computed.getPropertyValue(varName)).toLowerCase();
  if (raw === 'dashed' || raw === 'dotted' || raw === 'solid') {
    return raw;
  }
  return defaultVal;
}

function readDuration(computed: CSSStyleDeclaration, varName: string, defaultVal: number): number {
  const raw = resolveCssVar(computed, computed.getPropertyValue(varName));
  return parseCssDuration(raw, defaultVal);
}

function readEasing(
  computed: CSSStyleDeclaration,
  varName: string,
  defaultVal: EasingFunction,
): EasingFunction {
  const raw = resolveCssVar(computed, computed.getPropertyValue(varName));
  if (!raw) return defaultVal;
  return parseCssCubicBezier(raw);
}

function readPx(computed: CSSStyleDeclaration, varName: string, defaultVal: number): number {
  const raw = resolveCssVar(computed, computed.getPropertyValue(varName));
  return parseCssPx(raw, defaultVal);
}

/**
 * Extracts Three.js token snapshot from computed styles in a single pass.
 */
export function extractThreeTokens(
  computed: CSSStyleDeclaration,
  theme: ThreeTheme,
): ThreeTokenSnapshot {
  const fallback = createDefaultTokenSnapshot(theme);
  const colors = extractThreeColorTokens(computed, fallback);

  return {
    ...fallback,
    ...colors,
    canvasOpacity: readCssOpacity(computed, '--surface-canvas-opacity', fallback.canvasOpacity),
    gridPrimaryWidth: readWidth(computed, '--chrome-grid-primary-width', fallback.gridPrimaryWidth),
    gridSecondaryWidth: readWidth(computed, '--chrome-grid-secondary-width', fallback.gridSecondaryWidth),
    rangeRingWidth: readWidth(computed, '--chrome-range-ring-width', fallback.rangeRingWidth),
    rangeTickWidth: readWidth(computed, '--chrome-range-tick-width', fallback.rangeTickWidth),
    datumPlaneWidth: readWidth(computed, '--chrome-datum-plane-width', fallback.datumPlaneWidth),
    datumFootprintWidth: readWidth(computed, '--chrome-datum-footprint-width', fallback.datumFootprintWidth),
    axisLineWidth: readWidth(computed, '--chrome-axis-line-width', fallback.axisLineWidth),
    axisLineStyle: readStyle(computed, '--chrome-axis-line-style', fallback.axisLineStyle),
    bearingLineWidth: readWidth(computed, '--chrome-bearing-line-width', fallback.bearingLineWidth),
    bearingLineStyle: readStyle(computed, '--chrome-bearing-line-style', fallback.bearingLineStyle),
    bearingOrbitalWidth: readWidth(computed, '--chrome-bearing-orbital-width', fallback.bearingOrbitalWidth),
    bearingOrbitalStyle: readStyle(computed, '--chrome-bearing-orbital-style', fallback.bearingOrbitalStyle),
    bearingCoreWidth: readWidth(computed, '--chrome-bearing-core-width', fallback.bearingCoreWidth),
    bearingCoreStyle: readStyle(computed, '--chrome-bearing-core-style', fallback.bearingCoreStyle),
    stalkWidth: readWidth(computed, '--chrome-stalk-width', fallback.stalkWidth),
    stalkStyle: readStyle(computed, '--chrome-stalk-style', fallback.stalkStyle),
    orbitWidth: readWidth(computed, '--chrome-orbit-width', fallback.orbitWidth),
    orbitStyle: readStyle(computed, '--chrome-orbit-style', fallback.orbitStyle),
    routeWidth: readWidth(computed, '--chrome-route-width', fallback.routeWidth),
    routeStyle: readStyle(computed, '--chrome-route-style', fallback.routeStyle),
    stalkExtendDuration: readDuration(computed, '--chrome-stalk-extend-duration', fallback.stalkExtendDuration),
    stalkExtendEase: readEasing(computed, '--chrome-stalk-extend-ease', fallback.stalkExtendEase),
    stalkRetractDuration: readDuration(computed, '--chrome-stalk-retract-duration', fallback.stalkRetractDuration),
    stalkRetractEase: readEasing(computed, '--chrome-stalk-retract-ease', fallback.stalkRetractEase),
    footprintStampDuration: readDuration(computed, '--chrome-footprint-stamp-duration', fallback.footprintStampDuration),
    ringMajorAlpha: readCssOpacity(computed, '--chrome-ring-major-alpha', fallback.ringMajorAlpha),
    ringMinorAlpha: readCssOpacity(computed, '--chrome-ring-minor-alpha', fallback.ringMinorAlpha),
    finPerimeterAlpha: readCssOpacity(computed, '--chrome-fin-perimeter-alpha', fallback.finPerimeterAlpha),
    tickAlpha: readCssOpacity(computed, '--chrome-tick-alpha', fallback.tickAlpha),
    reticleActiveAlpha: readCssOpacity(computed, '--chrome-reticle-alpha-active', fallback.reticleActiveAlpha),
    reticleSelectedAlpha: readCssOpacity(computed, '--chrome-reticle-alpha-selected', fallback.reticleSelectedAlpha),
    reticleFocusedAlpha: readCssOpacity(computed, '--chrome-reticle-alpha-focused', fallback.reticleFocusedAlpha),
    instrumentFootprint: readPx(computed, '--chrome-instrument-footprint', fallback.instrumentFootprint),
    cameraFovBase: readPx(computed, '--camera-fov-base', fallback.cameraFovBase),
    dashSize: readPx(computed, '--chrome-dash-size', fallback.dashSize),
    dashGap: readPx(computed, '--chrome-dash-gap', fallback.dashGap),
    dotSize: readPx(computed, '--chrome-dot-size', fallback.dotSize),
    dotGap: readPx(computed, '--chrome-dot-gap', fallback.dotGap),
    theme,
  };
}

/**
 * Reads computed CSS styles from a DOM element (defaults to documentElement) and extracts tokens.
 */
export function readThreeTokensFromDom(
  element?: Element,
  theme: ThreeTheme = 'dark',
): ThreeTokenSnapshot {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return createDefaultTokenSnapshot(theme);
  }
  const target = element ?? document.documentElement;
  const computed = window.getComputedStyle(target);
  return extractThreeTokens(computed, theme);
}
