import * as THREE from 'three';
import { create } from 'zustand';

export interface ParsedColorResult {
  color: THREE.Color;
  alpha: number;
}

export interface ThreeTokenSnapshot {
  // Surface & Canvas Environment
  canvasBg: THREE.Color;
  canvasOpacity: number;

  // Cartographic Graticules & Range Rings
  gridPrimaryColor: THREE.Color;
  gridPrimaryAlpha: number;
  gridPrimaryWidth: number;
  gridSecondaryColor: THREE.Color;
  gridSecondaryAlpha: number;
  gridSecondaryWidth: number;
  rangeRingColor: THREE.Color;
  rangeRingAlpha: number;
  rangeRingWidth: number;
  rangeTickColor: THREE.Color;
  rangeTickAlpha: number;
  rangeTickWidth: number;

  // Cartographic Datum Plane (Galactic Equator / Invariant Plane at Z=0)
  datumPlaneColor: THREE.Color;
  datumPlaneAlpha: number;
  datumPlaneWidth: number;
  datumPlaneMajorColor: THREE.Color;
  datumPlaneMajorAlpha: number;
  datumPlaneMinorColor: THREE.Color;
  datumPlaneMinorAlpha: number;
  datumPlaneFillColor: THREE.Color;
  datumPlaneFillAlpha: number;
  datumPlaneFillGradientInner: number;
  datumPlaneFillGradientExponent: number;
  datumFootprintColor: THREE.Color;
  datumFootprintAlpha: number;
  datumFootprintWidth: number;

  // Tactical Reticles & Bearings
  reticleBracketColor: THREE.Color;
  reticleBracketAlpha: number;
  boresightColor: THREE.Color;
  boresightAlpha: number;
  axisLineColor: THREE.Color;
  axisLineAlpha: number;
  axisLineWidth: number;
  axisLineStyle: 'solid' | 'dashed' | 'dotted';
  bearingLineColor: THREE.Color;
  bearingLineAlpha: number;
  bearingLineWidth: number;
  bearingLineStyle: 'solid' | 'dashed' | 'dotted';
  bearingOrbitalColor: THREE.Color;
  bearingOrbitalAlpha: number;
  bearingOrbitalWidth: number;
  bearingOrbitalStyle: 'solid' | 'dashed' | 'dotted';
  bearingCoreColor: THREE.Color;
  bearingCoreAlpha: number;
  bearingCoreWidth: number;
  bearingCoreStyle: 'solid' | 'dashed' | 'dotted';
  headingIndicatorColor: THREE.Color;
  headingIndicatorAlpha: number;

  // Kinematic Chrome
  kinematicColor: THREE.Color;
  kinematicAlpha: number;

  // Drop Stalks (Monochrome, State-Driven)
  stalkSelectedColor: THREE.Color;
  stalkSelectedAlpha: number;
  stalkFocusedColor: THREE.Color;
  stalkFocusedAlpha: number;
  stalkWidth: number;
  stalkStyle: 'solid' | 'dashed' | 'dotted';

  // Datum Footprints (Decoupled, Monochrome Baseline)
  footprintColor: THREE.Color;
  footprintAlpha: number;
  footprintSelectedColor: THREE.Color;
  footprintSelectedAlpha: number;
  footprintFocusedColor: THREE.Color;
  footprintFocusedAlpha: number;

  // Orbits (Hairline, State-Driven)
  orbitColor: THREE.Color;
  orbitAlpha: number;
  orbitWidth: number;
  orbitStyle: 'solid' | 'dashed' | 'dotted';
  orbitSelectedColor: THREE.Color;
  orbitSelectedAlpha: number;
  orbitFocusedColor: THREE.Color;
  orbitFocusedAlpha: number;

  // Routes (Kinematic Vector Chords)
  routeColor: THREE.Color;
  routeAlpha: number;
  routeWidth: number;
  routeStyle: 'solid' | 'dashed' | 'dotted';

  // Motion (Durations in seconds & Easing evaluators)
  stalkExtendDuration: number;
  stalkExtendEase: (t: number) => number;
  stalkRetractDuration: number;
  stalkRetractEase: (t: number) => number;
  footprintStampDuration: number;

  // Instrument Alphas & Dash Metrics
  ringMajorAlpha: number;
  ringMinorAlpha: number;
  finPerimeterAlpha: number;
  tickAlpha: number;
  reticleActiveAlpha: number;
  reticleSelectedAlpha: number;
  reticleFocusedAlpha: number;
  instrumentFootprint: number;
  cameraFovBase: number;
  dashSize: number;
  dashGap: number;
  dotSize: number;
  dotGap: number;

  // Interactive & State Cues
  stateFocus: THREE.Color;
  stateSelected: THREE.Color;
  stateSelectedBorder: THREE.Color;
  stateHoverOverlayAlpha: number;

  // Domain Categories (Analytical Layers)
  categoryStar: THREE.Color;
  categoryPlanet: THREE.Color;
  categoryOrbit: THREE.Color;
  categoryHabitability: THREE.Color;

  // Telemetry & Confidence Status
  statusNominal: THREE.Color;
  statusCaution: THREE.Color;
  statusCritical: THREE.Color;
  confidenceConfirmed: THREE.Color;
  confidenceCandidate: THREE.Color;
  confidenceTheoretical: THREE.Color;

  // Active Theme Identifier
  theme: 'dark' | 'light' | 'amoled';
}

/**
 * Converts OKLCH parameters to linear sRGB colour scalars.
 */
function oklchToLinearRgb(L: number, C: number, H: number): [number, number, number] {
  const rad = (H * Math.PI) / 180;
  const a = C * Math.cos(rad);
  const b = C * Math.sin(rad);

  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.2914855480 * b;

  const l = l_ ** 3;
  const m = m_ ** 3;
  const s = s_ ** 3;

  const r = Math.max(0, Math.min(1, +4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s));
  const g = Math.max(0, Math.min(1, -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s));
  const bl = Math.max(0, Math.min(1, -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s));

  return [r, g, bl];
}

/**
 * Parses any browser-computed or CSS string (hex, rgb, rgba, oklch)
 * into a linear THREE.Color and an alpha scalar.
 */
export function parseCssColor(cssColorString: string): ParsedColorResult {
  const trimmed = cssColorString.trim();
  if (!trimmed) {
    return { color: new THREE.Color(0, 0, 0), alpha: 1 };
  }

  // 1. Match oklch(L C H [/ A])
  const oklchMatch = trimmed.match(
    /^oklch\(\s*([\d.]+%?)\s+([\d.]+)\s+([\d.]+)(?:\s*\/\s*([\d.]+%?))?\s*\)$/i,
  );
  if (oklchMatch) {
    const [, rawL, rawC, rawH, rawA] = oklchMatch;
    const L = rawL.endsWith('%') ? Number.parseFloat(rawL) / 100 : Number.parseFloat(rawL);
    const C = Number.parseFloat(rawC);
    const H = Number.parseFloat(rawH);
    const [r, g, b] = oklchToLinearRgb(L, C, H);
    let alpha = 1;
    if (rawA !== undefined) {
      alpha = rawA.endsWith('%') ? Number.parseFloat(rawA) / 100 : Number.parseFloat(rawA);
    }
    return { color: new THREE.Color(r, g, b), alpha };
  }

  // 2. Match rgb/rgba format: rgba(r, g, b, a) or rgb(r g b / a)
  const rgbaMatch = trimmed.match(
    /^rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:[,\s/]+([\d.]+%?))?\s*\)$/i,
  );
  if (rgbaMatch) {
    const [, r, g, b, rawAlpha] = rgbaMatch;
    const color = new THREE.Color(
      Number.parseFloat(r) / 255,
      Number.parseFloat(g) / 255,
      Number.parseFloat(b) / 255,
    );
    color.convertSRGBToLinear();

    let alpha = 1;
    if (rawAlpha !== undefined) {
      alpha = rawAlpha.endsWith('%')
        ? Number.parseFloat(rawAlpha.slice(0, -1)) / 100
        : Number.parseFloat(rawAlpha);
    }
    return { color, alpha };
  }

  // 3. Fallback: standard THREE.Color parser (hex, named colors)
  // Note: Three.js ColorManagement automatically converts hex/named string from sRGB to linear.
  try {
    const color = new THREE.Color(trimmed);
    return { color, alpha: 1 };
  } catch {
    return { color: new THREE.Color(0, 0, 0), alpha: 1 };
  }
}

/**
 * Creates a cubic bezier solver for the given control points (x1, y1, x2, y2).
 * Maps progress x in [0, 1] to output y in [0, 1].
 */
export function createCubicBezierSolver(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
): (x: number) => number {
  return function solve(x: number): number {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    let t = x;
    for (let i = 0; i < 8; i++) {
      const oneMinusT = 1 - t;
      const bx = 3 * oneMinusT * oneMinusT * t * x1 + 3 * oneMinusT * t * t * x2 + t * t * t;
      const diff = bx - x;
      if (Math.abs(diff) < 1e-4) break;
      const dxdt = 3 * oneMinusT * oneMinusT * x1 + 6 * oneMinusT * t * (x2 - x1) + 3 * t * t * (1 - x2);
      if (Math.abs(dxdt) < 1e-6) break;
      t -= diff / dxdt;
      t = Math.max(0, Math.min(1, t));
    }
    const oneMinusT = 1 - t;
    return 3 * oneMinusT * oneMinusT * t * y1 + 3 * oneMinusT * t * t * y2 + t * t * t;
  };
}

/**
 * Parses CSS easing string (cubic-bezier or linear) into an evaluation function.
 */
export function parseCssCubicBezier(cssEasing: string): (t: number) => number {
  const trimmed = cssEasing.trim().toLowerCase();
  if (!trimmed || trimmed === 'linear') return (t) => t;
  const match = trimmed.match(
    /^cubic-bezier\(\s*([\d.-]+)\s*,\s*([\d.-]+)\s*,\s*([\d.-]+)\s*,\s*([\d.-]+)\s*\)$/,
  );
  if (match) {
    const [, x1, y1, x2, y2] = match;
    return createCubicBezierSolver(
      Number.parseFloat(x1),
      Number.parseFloat(y1),
      Number.parseFloat(x2),
      Number.parseFloat(y2),
    );
  }
  return (t) => t;
}

/**
 * Parses CSS duration string ('150ms', '0.2s', '0') into seconds.
 */
export function parseCssDuration(cssDuration: string, defaultSeconds = 0): number {
  const trimmed = cssDuration.trim().toLowerCase();
  if (!trimmed) return defaultSeconds;
  if (trimmed.endsWith('ms')) {
    const val = Number.parseFloat(trimmed.slice(0, -2));
    return Number.isFinite(val) ? val / 1000 : defaultSeconds;
  }
  if (trimmed.endsWith('s')) {
    const val = Number.parseFloat(trimmed.slice(0, -1));
    return Number.isFinite(val) ? val : defaultSeconds;
  }
  const val = Number.parseFloat(trimmed);
  return Number.isFinite(val) ? val : defaultSeconds;
}

/**
 * Parses CSS px / numeric scalar ('6px', '16.47') into number.
 */
export function parseCssPx(cssPx: string, defaultVal = 0): number {
  const trimmed = cssPx.trim().toLowerCase();
  if (!trimmed) return defaultVal;
  if (trimmed.endsWith('px')) {
    const val = Number.parseFloat(trimmed.slice(0, -2));
    return Number.isFinite(val) ? val : defaultVal;
  }
  const val = Number.parseFloat(trimmed);
  return Number.isFinite(val) ? val : defaultVal;
}

/**
 * Creates a default token snapshot for a given theme baseline.
 */
export function createDefaultTokenSnapshot(theme: 'dark' | 'light' | 'amoled' = 'dark'): ThreeTokenSnapshot {
  const isLight = theme === 'light';
  const isAmoled = theme === 'amoled';

  const makeLinearColor = (hex: string) => new THREE.Color(hex);

  const canvasBgHex = isAmoled ? '#000000' : isLight ? '#fdf6e3' : '#002b36';
  const chromeToneHex = isLight ? '#586e75' : '#829fa6';
  const focusHex = isLight ? '#007840' : '#00d078';
  const stalkToneHex = isLight ? '#263339' : '#e0e7e7';
  const redHex = '#dc322f';

  return {
    canvasBg: makeLinearColor(canvasBgHex),
    canvasOpacity: 1.0,

    gridPrimaryColor: makeLinearColor(chromeToneHex),
    gridPrimaryAlpha: 0.30,
    gridPrimaryWidth: 2,
    gridSecondaryColor: makeLinearColor(chromeToneHex),
    gridSecondaryAlpha: 0.16,
    gridSecondaryWidth: 1,
    rangeRingColor: makeLinearColor(chromeToneHex),
    rangeRingAlpha: 0.24,
    rangeRingWidth: 1,
    rangeTickColor: makeLinearColor(chromeToneHex),
    rangeTickAlpha: 0.40,
    rangeTickWidth: 2,

    datumPlaneColor: makeLinearColor(theme === 'light' ? '#073642' : '#8cb8cc'),
    datumPlaneAlpha: 0.35,
    datumPlaneWidth: 1,
    datumPlaneMajorColor: makeLinearColor(theme === 'light' ? '#073642' : '#8cb8cc'),
    datumPlaneMajorAlpha: 0.35,
    datumPlaneMinorColor: makeLinearColor(theme === 'light' ? '#586e75' : '#8cb8cc'),
    datumPlaneMinorAlpha: 0.18,
    datumPlaneFillColor: makeLinearColor(theme === 'light' ? '#073642' : '#8cb8cc'),
    datumPlaneFillAlpha: theme === 'light' ? 0.08 : 0.16,
    datumPlaneFillGradientInner: 0.25,
    datumPlaneFillGradientExponent: 2.0,
    datumFootprintColor: makeLinearColor(theme === 'light' ? '#586e75' : '#93a1a1'),
    datumFootprintAlpha: 0.25,
    datumFootprintWidth: 2,

    reticleBracketColor: makeLinearColor(chromeToneHex),
    reticleBracketAlpha: 0.40,
    boresightColor: makeLinearColor(chromeToneHex),
    boresightAlpha: 0.30,
    axisLineColor: makeLinearColor(chromeToneHex),
    axisLineAlpha: 0.16,
    axisLineWidth: 1,
    axisLineStyle: 'solid',
    bearingLineColor: makeLinearColor(redHex),
    bearingLineAlpha: 0.35,
    bearingLineWidth: 2,
    bearingLineStyle: 'solid',
    bearingOrbitalColor: makeLinearColor(redHex),
    bearingOrbitalAlpha: 0.35,
    bearingOrbitalWidth: 2,
    bearingOrbitalStyle: 'dashed',
    bearingCoreColor: makeLinearColor('#b58900'),
    bearingCoreAlpha: 0.35,
    bearingCoreWidth: 2,
    bearingCoreStyle: 'solid',
    headingIndicatorColor: makeLinearColor(chromeToneHex),
    headingIndicatorAlpha: 0.50,

    // Kinematic Chrome
    kinematicColor: makeLinearColor(redHex),
    kinematicAlpha: 0.35,

    // Drop Stalks (Monochrome, State-Driven)
    stalkSelectedColor: makeLinearColor(stalkToneHex),
    stalkSelectedAlpha: 0.70,
    stalkFocusedColor: makeLinearColor(stalkToneHex),
    stalkFocusedAlpha: 0.85,
    stalkWidth: 1,
    stalkStyle: 'solid',

    // Datum Footprints (Decoupled, Monochrome Baseline)
    footprintColor: makeLinearColor(theme === 'light' ? '#586e75' : '#93a1a1'),
    footprintAlpha: 0.35,
    footprintSelectedColor: makeLinearColor(focusHex),
    footprintSelectedAlpha: 0.85,
    footprintFocusedColor: makeLinearColor(focusHex),
    footprintFocusedAlpha: 0.85,

    // Orbits (Hairline, State-Driven)
    orbitColor: makeLinearColor(theme === 'light' ? '#586e75' : '#93a1a1'),
    orbitAlpha: 0.24,
    orbitWidth: 1,
    orbitStyle: 'dashed',
    orbitSelectedColor: makeLinearColor(redHex),
    orbitSelectedAlpha: 0.35,
    orbitFocusedColor: makeLinearColor(redHex),
    orbitFocusedAlpha: 0.35,

    // Routes (Kinematic Vector Chords)
    routeColor: makeLinearColor(redHex),
    routeAlpha: 0.90,
    routeWidth: 3,
    routeStyle: 'solid',

    // Motion
    stalkExtendDuration: 0.15,
    stalkExtendEase: parseCssCubicBezier('cubic-bezier(0.2, 0, 0, 1)'),
    stalkRetractDuration: 0.1,
    stalkRetractEase: parseCssCubicBezier('cubic-bezier(0.4, 0, 1, 1)'),
    footprintStampDuration: 0.075,

    // Instrument Alphas & Dash Metrics
    ringMajorAlpha: 0.45,
    ringMinorAlpha: 0.20,
    finPerimeterAlpha: 0.25,
    tickAlpha: 0.40,
    reticleActiveAlpha: 0.60,
    reticleSelectedAlpha: 0.90,
    reticleFocusedAlpha: 1.0,
    instrumentFootprint: 16.47,
    cameraFovBase: 45,
    dashSize: 6,
    dashGap: 4,
    dotSize: 2,
    dotGap: 4,

    stateFocus: makeLinearColor(focusHex),
    stateSelected: makeLinearColor(focusHex),
    stateSelectedBorder: makeLinearColor(focusHex),
    stateHoverOverlayAlpha: 0.04,

    categoryStar: makeLinearColor('#cb4b16'),
    categoryPlanet: makeLinearColor('#2aa198'),
    categoryOrbit: makeLinearColor('#6c71c4'),
    categoryHabitability: makeLinearColor('#859900'),

    statusNominal: makeLinearColor('#859900'),
    statusCaution: makeLinearColor('#b58900'),
    statusCritical: makeLinearColor(redHex),
    confidenceConfirmed: makeLinearColor('#859900'),
    confidenceCandidate: makeLinearColor('#b58900'),
    confidenceTheoretical: makeLinearColor('#6c71c4'),

    theme,
  };
}

export const DEFAULT_DARK_TOKEN_SNAPSHOT = createDefaultTokenSnapshot('dark');
export const DEFAULT_LIGHT_TOKEN_SNAPSHOT = createDefaultTokenSnapshot('light');
export const DEFAULT_AMOLED_TOKEN_SNAPSHOT = createDefaultTokenSnapshot('amoled');

/**
 * Extracts Three.js token snapshot from computed styles in a single pass.
 */
export function extractThreeTokens(
  computed: CSSStyleDeclaration,
  theme: 'dark' | 'light' | 'amoled',
): ThreeTokenSnapshot {
  const fallback = createDefaultTokenSnapshot(theme);

  const resolveVar = (value: string): string => {
    let current = value.trim();
    let depth = 0;
    while (current.startsWith('var(') && depth < 10) {
      depth++;
      const match = current.match(/^var\(\s*(--[a-zA-Z0-9_-]+)/);
      if (!match) break;
      const resolved = computed.getPropertyValue(match[1]).trim();
      if (!resolved) break;
      current = resolved;
    }
    return current;
  };

  const readColor = (varName: string, defaultColor: THREE.Color, defaultAlpha: number): ParsedColorResult => {
    const raw = resolveVar(computed.getPropertyValue(varName));
    if (!raw) return { color: defaultColor.clone(), alpha: defaultAlpha };
    const parsed = parseCssColor(raw);
    return parsed;
  };

  const readOpacity = (varName: string, defaultVal: number): number => {
    const raw = resolveVar(computed.getPropertyValue(varName));
    if (!raw) return defaultVal;
    const val = Number.parseFloat(raw);
    return Number.isFinite(val) ? val : defaultVal;
  };

  const readWidth = (varName: string, defaultVal: number): number => {
    const raw = resolveVar(computed.getPropertyValue(varName));
    if (!raw) return defaultVal;
    const val = Number.parseFloat(raw);
    return Number.isFinite(val) ? val : defaultVal;
  };

  const readStyle = (
    varName: string,
    defaultVal: 'solid' | 'dashed' | 'dotted',
  ): 'solid' | 'dashed' | 'dotted' => {
    const raw = resolveVar(computed.getPropertyValue(varName)).toLowerCase();
    if (raw === 'dashed' || raw === 'dotted' || raw === 'solid') {
      return raw;
    }
    return defaultVal;
  };

  const readDuration = (varName: string, defaultVal: number): number => {
    const raw = resolveVar(computed.getPropertyValue(varName));
    return parseCssDuration(raw, defaultVal);
  };

  const readEasing = (varName: string, defaultVal: (t: number) => number): ((t: number) => number) => {
    const raw = resolveVar(computed.getPropertyValue(varName));
    if (!raw) return defaultVal;
    return parseCssCubicBezier(raw);
  };

  const readPx = (varName: string, defaultVal: number): number => {
    const raw = resolveVar(computed.getPropertyValue(varName));
    return parseCssPx(raw, defaultVal);
  };

  const canvasParsed = readColor('--surface-canvas-bg', fallback.canvasBg, 1.0);
  const gridPrimary = readColor('--chrome-grid-primary-color', fallback.gridPrimaryColor, fallback.gridPrimaryAlpha);
  const gridPrimaryWidth = readWidth('--chrome-grid-primary-width', fallback.gridPrimaryWidth);
  const gridSecondary = readColor('--chrome-grid-secondary-color', fallback.gridSecondaryColor, fallback.gridSecondaryAlpha);
  const gridSecondaryWidth = readWidth('--chrome-grid-secondary-width', fallback.gridSecondaryWidth);
  const rangeRing = readColor('--chrome-range-ring-color', fallback.rangeRingColor, fallback.rangeRingAlpha);
  const rangeRingWidth = readWidth('--chrome-range-ring-width', fallback.rangeRingWidth);
  const rangeTick = readColor('--chrome-range-tick-color', fallback.rangeTickColor, fallback.rangeTickAlpha);
  const rangeTickWidth = readWidth('--chrome-range-tick-width', fallback.rangeTickWidth);
  const datumPlane = readColor('--chrome-datum-plane-color', fallback.datumPlaneColor, fallback.datumPlaneAlpha);
  const datumPlaneAlpha = readOpacity('--chrome-datum-plane-alpha', datumPlane.alpha);
  const datumPlaneWidth = readWidth('--chrome-datum-plane-width', fallback.datumPlaneWidth);
  const datumPlaneMajor = readColor('--chrome-datum-plane-major-color', fallback.datumPlaneMajorColor, fallback.datumPlaneMajorAlpha);
  const datumPlaneMajorAlpha = readOpacity('--chrome-datum-plane-major-alpha', datumPlaneMajor.alpha);
  const datumPlaneMinor = readColor('--chrome-datum-plane-minor-color', fallback.datumPlaneMinorColor, fallback.datumPlaneMinorAlpha);
  const datumPlaneMinorAlpha = readOpacity('--chrome-datum-plane-minor-alpha', datumPlaneMinor.alpha);
  const datumPlaneFill = readColor('--chrome-datum-plane-fill-color', fallback.datumPlaneFillColor, fallback.datumPlaneFillAlpha);
  const datumPlaneFillAlpha = readOpacity('--chrome-datum-plane-fill-alpha', datumPlaneFill.alpha);
  const datumPlaneFillGradientInner = readOpacity('--chrome-datum-plane-fill-gradient-inner', fallback.datumPlaneFillGradientInner);
  const datumPlaneFillGradientExponent = readOpacity('--chrome-datum-plane-fill-gradient-exponent', fallback.datumPlaneFillGradientExponent);
  const datumFootprint = readColor('--chrome-datum-footprint-color', fallback.datumFootprintColor, fallback.datumFootprintAlpha);
  const datumFootprintAlpha = readOpacity('--chrome-datum-footprint-alpha', datumFootprint.alpha);
  const datumFootprintWidth = readWidth('--chrome-datum-footprint-width', fallback.datumFootprintWidth);
  const reticleBracket = readColor('--chrome-reticle-bracket-color', fallback.reticleBracketColor, fallback.reticleBracketAlpha);
  const boresight = readColor('--chrome-boresight-color', fallback.boresightColor, fallback.boresightAlpha);
  const axisLine = readColor('--chrome-axis-line-color', fallback.axisLineColor, fallback.axisLineAlpha);
  const axisLineWidth = readWidth('--chrome-axis-line-width', fallback.axisLineWidth);
  const axisLineStyle = readStyle('--chrome-axis-line-style', fallback.axisLineStyle);
  const bearingLine = readColor('--chrome-bearing-line-color', fallback.bearingLineColor, fallback.bearingLineAlpha);
  const bearingLineWidth = readWidth('--chrome-bearing-line-width', fallback.bearingLineWidth);
  const bearingLineStyle = readStyle('--chrome-bearing-line-style', fallback.bearingLineStyle);
  const bearingOrbital = readColor('--chrome-bearing-orbital-color', fallback.bearingOrbitalColor, fallback.bearingOrbitalAlpha);
  const bearingOrbitalAlpha = readOpacity('--chrome-bearing-orbital-alpha', bearingOrbital.alpha !== 1 ? bearingOrbital.alpha : fallback.bearingOrbitalAlpha);
  const bearingOrbitalWidth = readWidth('--chrome-bearing-orbital-width', fallback.bearingOrbitalWidth);
  const bearingOrbitalStyle = readStyle('--chrome-bearing-orbital-style', fallback.bearingOrbitalStyle);
  const bearingCore = readColor('--chrome-bearing-core-color', fallback.bearingCoreColor, fallback.bearingCoreAlpha);
  const bearingCoreWidth = readWidth('--chrome-bearing-core-width', fallback.bearingCoreWidth);
  const bearingCoreStyle = readStyle('--chrome-bearing-core-style', fallback.bearingCoreStyle);
  const heading = readColor('--chrome-heading-indicator-color', fallback.headingIndicatorColor, fallback.headingIndicatorAlpha);

  // Kinematic Chrome
  const kinematic = readColor('--chrome-kinematic-color', fallback.kinematicColor, fallback.kinematicAlpha);

  // Drop Stalks
  const stalkSelected = readColor('--chrome-stalk-selected-color', fallback.stalkSelectedColor, fallback.stalkSelectedAlpha);
  const stalkFocused = readColor('--chrome-stalk-focused-color', fallback.stalkFocusedColor, fallback.stalkFocusedAlpha);
  const stalkWidth = readWidth('--chrome-stalk-width', fallback.stalkWidth);
  const stalkStyle = readStyle('--chrome-stalk-style', fallback.stalkStyle);

  // Datum Footprints
  const footprint = readColor('--chrome-footprint-color', fallback.footprintColor, fallback.footprintAlpha);
  const footprintSelected = readColor('--chrome-footprint-selected-color', fallback.footprintSelectedColor, fallback.footprintSelectedAlpha);
  const footprintFocused = readColor('--chrome-footprint-focused-color', fallback.footprintFocusedColor, fallback.footprintFocusedAlpha);

  // Orbits
  const orbit = readColor('--chrome-orbit-color', fallback.orbitColor, fallback.orbitAlpha);
  const orbitWidth = readWidth('--chrome-orbit-width', fallback.orbitWidth);
  const orbitStyle = readStyle('--chrome-orbit-style', fallback.orbitStyle);
  const orbitSelected = readColor('--chrome-orbit-selected-color', fallback.orbitSelectedColor, fallback.orbitSelectedAlpha);
  const orbitFocused = readColor('--chrome-orbit-focused-color', fallback.orbitFocusedColor, fallback.orbitFocusedAlpha);

  // Routes
  const route = readColor('--chrome-route-color', fallback.routeColor, fallback.routeAlpha);
  const routeWidth = readWidth('--chrome-route-width', fallback.routeWidth);
  const routeStyle = readStyle('--chrome-route-style', fallback.routeStyle);

  // Motion
  const stalkExtendDuration = readDuration('--chrome-stalk-extend-duration', fallback.stalkExtendDuration);
  const stalkExtendEase = readEasing('--chrome-stalk-extend-ease', fallback.stalkExtendEase);
  const stalkRetractDuration = readDuration('--chrome-stalk-retract-duration', fallback.stalkRetractDuration);
  const stalkRetractEase = readEasing('--chrome-stalk-retract-ease', fallback.stalkRetractEase);
  const footprintStampDuration = readDuration('--chrome-footprint-stamp-duration', fallback.footprintStampDuration);

  // Instrument Alphas & Metrics
  const ringMajorAlpha = readOpacity('--chrome-ring-major-alpha', fallback.ringMajorAlpha);
  const ringMinorAlpha = readOpacity('--chrome-ring-minor-alpha', fallback.ringMinorAlpha);
  const finPerimeterAlpha = readOpacity('--chrome-fin-perimeter-alpha', fallback.finPerimeterAlpha);
  const tickAlpha = readOpacity('--chrome-tick-alpha', fallback.tickAlpha);
  const reticleActiveAlpha = readOpacity('--chrome-reticle-alpha-active', fallback.reticleActiveAlpha);
  const reticleSelectedAlpha = readOpacity('--chrome-reticle-alpha-selected', fallback.reticleSelectedAlpha);
  const reticleFocusedAlpha = readOpacity('--chrome-reticle-alpha-focused', fallback.reticleFocusedAlpha);
  const instrumentFootprint = readPx('--chrome-instrument-footprint', fallback.instrumentFootprint);
  const cameraFovBase = readPx('--camera-fov-base', fallback.cameraFovBase);
  const dashSize = readPx('--chrome-dash-size', fallback.dashSize);
  const dashGap = readPx('--chrome-dash-gap', fallback.dashGap);
  const dotSize = readPx('--chrome-dot-size', fallback.dotSize);
  const dotGap = readPx('--chrome-dot-gap', fallback.dotGap);

  const stateFocus = readColor('--state-focus', fallback.stateFocus, 1.0);
  const stateSelected = readColor('--state-selected', fallback.stateSelected, 1.0);
  const stateSelectedBorder = readColor('--state-selected-border', fallback.stateSelectedBorder, 1.0);

  const catStar = readColor('--category-star', fallback.categoryStar, 1.0);
  const catPlanet = readColor('--category-planet', fallback.categoryPlanet, 1.0);
  const catOrbit = readColor('--category-orbit', fallback.categoryOrbit, 1.0);
  const catHab = readColor('--category-habitability', fallback.categoryHabitability, 1.0);

  const statNominal = readColor('--status-nominal', fallback.statusNominal, 1.0);
  const statCaution = readColor('--status-caution', fallback.statusCaution, 1.0);
  const statCritical = readColor('--status-critical', fallback.statusCritical, 1.0);

  const confConfirmed = readColor('--confidence-confirmed', fallback.confidenceConfirmed, 1.0);
  const confCandidate = readColor('--confidence-candidate', fallback.confidenceCandidate, 1.0);
  const confTheoretical = readColor('--confidence-theoretical', fallback.confidenceTheoretical, 1.0);

  return {
    canvasBg: canvasParsed.color,
    canvasOpacity: readOpacity('--surface-canvas-opacity', fallback.canvasOpacity),

    gridPrimaryColor: gridPrimary.color,
    gridPrimaryAlpha: gridPrimary.alpha,
    gridPrimaryWidth,
    gridSecondaryColor: gridSecondary.color,
    gridSecondaryAlpha: gridSecondary.alpha,
    gridSecondaryWidth,
    rangeRingColor: rangeRing.color,
    rangeRingAlpha: rangeRing.alpha,
    rangeRingWidth,
    rangeTickColor: rangeTick.color,
    rangeTickAlpha: rangeTick.alpha,
    rangeTickWidth,

    datumPlaneColor: datumPlane.color,
    datumPlaneAlpha,
    datumPlaneWidth,
    datumPlaneMajorColor: datumPlaneMajor.color,
    datumPlaneMajorAlpha,
    datumPlaneMinorColor: datumPlaneMinor.color,
    datumPlaneMinorAlpha,
    datumPlaneFillColor: datumPlaneFill.color,
    datumPlaneFillAlpha,
    datumPlaneFillGradientInner,
    datumPlaneFillGradientExponent,
    datumFootprintColor: datumFootprint.color,
    datumFootprintAlpha,
    datumFootprintWidth,

    reticleBracketColor: reticleBracket.color,
    reticleBracketAlpha: reticleBracket.alpha,
    boresightColor: boresight.color,
    boresightAlpha: boresight.alpha,
    axisLineColor: axisLine.color,
    axisLineAlpha: axisLine.alpha,
    axisLineWidth,
    axisLineStyle,
    bearingLineColor: bearingLine.color,
    bearingLineAlpha: bearingLine.alpha,
    bearingLineWidth,
    bearingLineStyle,
    bearingOrbitalColor: bearingOrbital.color,
    bearingOrbitalAlpha,
    bearingOrbitalWidth,
    bearingOrbitalStyle,
    bearingCoreColor: bearingCore.color,
    bearingCoreAlpha: bearingCore.alpha,
    bearingCoreWidth,
    bearingCoreStyle,
    headingIndicatorColor: heading.color,
    headingIndicatorAlpha: heading.alpha,

    kinematicColor: kinematic.color,
    kinematicAlpha: kinematic.alpha,

    stalkSelectedColor: stalkSelected.color,
    stalkSelectedAlpha: stalkSelected.alpha,
    stalkFocusedColor: stalkFocused.color,
    stalkFocusedAlpha: stalkFocused.alpha,
    stalkWidth,
    stalkStyle,

    footprintColor: footprint.color,
    footprintAlpha: footprint.alpha,
    footprintSelectedColor: footprintSelected.color,
    footprintSelectedAlpha: footprintSelected.alpha,
    footprintFocusedColor: footprintFocused.color,
    footprintFocusedAlpha: footprintFocused.alpha,

    orbitColor: orbit.color,
    orbitAlpha: orbit.alpha,
    orbitWidth,
    orbitStyle,
    orbitSelectedColor: orbitSelected.color,
    orbitSelectedAlpha: orbitSelected.alpha,
    orbitFocusedColor: orbitFocused.color,
    orbitFocusedAlpha: orbitFocused.alpha,

    routeColor: route.color,
    routeAlpha: route.alpha,
    routeWidth,
    routeStyle,

    stalkExtendDuration,
    stalkExtendEase,
    stalkRetractDuration,
    stalkRetractEase,
    footprintStampDuration,

    ringMajorAlpha,
    ringMinorAlpha,
    finPerimeterAlpha,
    tickAlpha,
    reticleActiveAlpha,
    reticleSelectedAlpha,
    reticleFocusedAlpha,
    instrumentFootprint,
    cameraFovBase,
    dashSize,
    dashGap,
    dotSize,
    dotGap,

    stateFocus: stateFocus.color,
    stateSelected: stateSelected.color,
    stateSelectedBorder: stateSelectedBorder.color,
    stateHoverOverlayAlpha: readOpacity('--ui-hover-overlay-opacity', fallback.stateHoverOverlayAlpha),

    categoryStar: catStar.color,
    categoryPlanet: catPlanet.color,
    categoryOrbit: catOrbit.color,
    categoryHabitability: catHab.color,

    statusNominal: statNominal.color,
    statusCaution: statCaution.color,
    statusCritical: statCritical.color,
    confidenceConfirmed: confConfirmed.color,
    confidenceCandidate: confCandidate.color,
    confidenceTheoretical: confTheoretical.color,

    theme,
  };
}

export interface ThreeTokenState {
  tokens: ThreeTokenSnapshot;
  setTokens: (tokens: ThreeTokenSnapshot) => void;
  resetTokens: () => void;
}

export const useThreeTokenStore = create<ThreeTokenState>((set) => ({
  tokens: DEFAULT_DARK_TOKEN_SNAPSHOT,
  setTokens: (tokens) => set({ tokens }),
  resetTokens: () => set({ tokens: DEFAULT_DARK_TOKEN_SNAPSHOT }),
}));
