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
  gridSecondaryColor: THREE.Color;
  gridSecondaryAlpha: number;
  rangeRingColor: THREE.Color;
  rangeRingAlpha: number;
  rangeTickColor: THREE.Color;
  rangeTickAlpha: number;

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
  headingIndicatorColor: THREE.Color;
  headingIndicatorAlpha: number;

  // Interactive & State Cues
  stateFocus: THREE.Color;
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
 * Creates a default token snapshot for a given theme baseline.
 */
export function createDefaultTokenSnapshot(theme: 'dark' | 'light' | 'amoled' = 'dark'): ThreeTokenSnapshot {
  const isLight = theme === 'light';
  const isAmoled = theme === 'amoled';

  const makeLinearColor = (hex: string) => new THREE.Color(hex);


  const canvasBgHex = isAmoled ? '#000000' : isLight ? '#fdf6e3' : '#002b36';
  const chromeToneHex = isLight ? '#586e75' : '#93a1a1';
  const focusHex = isLight ? '#268bd2' : '#2aa198';

  return {
    canvasBg: makeLinearColor(canvasBgHex),
    canvasOpacity: 1.0,

    gridPrimaryColor: makeLinearColor(chromeToneHex),
    gridPrimaryAlpha: 0.16,
    gridSecondaryColor: makeLinearColor(chromeToneHex),
    gridSecondaryAlpha: 0.08,
    rangeRingColor: makeLinearColor(chromeToneHex),
    rangeRingAlpha: 0.12,
    rangeTickColor: makeLinearColor(chromeToneHex),
    rangeTickAlpha: 0.24,

    reticleBracketColor: makeLinearColor(chromeToneHex),
    reticleBracketAlpha: 0.40,
    boresightColor: makeLinearColor(chromeToneHex),
    boresightAlpha: 0.30,
    axisLineColor: makeLinearColor(chromeToneHex),
    axisLineAlpha: 0.20,
    axisLineWidth: 1,
    axisLineStyle: 'solid',
    bearingLineColor: makeLinearColor(chromeToneHex),
    bearingLineAlpha: 0.50,
    bearingLineWidth: 2,
    bearingLineStyle: 'solid',
    headingIndicatorColor: makeLinearColor(chromeToneHex),
    headingIndicatorAlpha: 0.50,

    stateFocus: makeLinearColor(focusHex),
    stateSelectedBorder: makeLinearColor(focusHex),
    stateHoverOverlayAlpha: 0.04,

    categoryStar: makeLinearColor('#cb4b16'),
    categoryPlanet: makeLinearColor('#2aa198'),
    categoryOrbit: makeLinearColor('#6c71c4'),
    categoryHabitability: makeLinearColor('#859900'),

    statusNominal: makeLinearColor('#859900'),
    statusCaution: makeLinearColor('#b58900'),
    statusCritical: makeLinearColor('#dc322f'),
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

  const readColor = (varName: string, defaultColor: THREE.Color, defaultAlpha: number): ParsedColorResult => {
    const raw = computed.getPropertyValue(varName).trim();
    if (!raw) return { color: defaultColor.clone(), alpha: defaultAlpha };
    const parsed = parseCssColor(raw);
    return parsed;
  };

  const readOpacity = (varName: string, defaultVal: number): number => {
    const raw = computed.getPropertyValue(varName).trim();
    if (!raw) return defaultVal;
    const val = Number.parseFloat(raw);
    return Number.isFinite(val) ? val : defaultVal;
  };

  const readWidth = (varName: string, defaultVal: number): number => {
    const raw = computed.getPropertyValue(varName).trim();
    if (!raw) return defaultVal;
    const val = Number.parseFloat(raw);
    return Number.isFinite(val) ? val : defaultVal;
  };

  const readStyle = (
    varName: string,
    defaultVal: 'solid' | 'dashed' | 'dotted',
  ): 'solid' | 'dashed' | 'dotted' => {
    const raw = computed.getPropertyValue(varName).trim().toLowerCase();
    if (raw === 'dashed' || raw === 'dotted' || raw === 'solid') {
      return raw;
    }
    return defaultVal;
  };

  const canvasParsed = readColor('--surface-canvas-bg', fallback.canvasBg, 1.0);
  const gridPrimary = readColor('--chrome-grid-primary-color', fallback.gridPrimaryColor, fallback.gridPrimaryAlpha);
  const gridSecondary = readColor('--chrome-grid-secondary-color', fallback.gridSecondaryColor, fallback.gridSecondaryAlpha);
  const rangeRing = readColor('--chrome-range-ring-color', fallback.rangeRingColor, fallback.rangeRingAlpha);
  const rangeTick = readColor('--chrome-range-tick-color', fallback.rangeTickColor, fallback.rangeTickAlpha);
  const reticleBracket = readColor('--chrome-reticle-bracket-color', fallback.reticleBracketColor, fallback.reticleBracketAlpha);
  const boresight = readColor('--chrome-boresight-color', fallback.boresightColor, fallback.boresightAlpha);
  const axisLine = readColor('--chrome-axis-line-color', fallback.axisLineColor, fallback.axisLineAlpha);
  const axisLineWidth = readWidth('--chrome-axis-line-width', fallback.axisLineWidth);
  const axisLineStyle = readStyle('--chrome-axis-line-style', fallback.axisLineStyle);
  const bearingLine = readColor('--chrome-bearing-line-color', fallback.bearingLineColor, fallback.bearingLineAlpha);
  const bearingLineWidth = readWidth('--chrome-bearing-line-width', fallback.bearingLineWidth);
  const bearingLineStyle = readStyle('--chrome-bearing-line-style', fallback.bearingLineStyle);
  const heading = readColor('--chrome-heading-indicator-color', fallback.headingIndicatorColor, fallback.headingIndicatorAlpha);

  const stateFocus = readColor('--state-focus', fallback.stateFocus, 1.0);
  const stateSelected = readColor('--state-selected-border', fallback.stateSelectedBorder, 1.0);

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
    gridSecondaryColor: gridSecondary.color,
    gridSecondaryAlpha: gridSecondary.alpha,
    rangeRingColor: rangeRing.color,
    rangeRingAlpha: rangeRing.alpha,
    rangeTickColor: rangeTick.color,
    rangeTickAlpha: rangeTick.alpha,

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
    headingIndicatorColor: heading.color,
    headingIndicatorAlpha: heading.alpha,

    stateFocus: stateFocus.color,
    stateSelectedBorder: stateSelected.color,
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
