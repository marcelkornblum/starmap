import { CARTO_LINE_CONSTANTS } from '../styles/tokens/cartography';
import { parseCssCubicBezier } from './easingMath';
import type { ThreeTheme, ThreeTokenSnapshot } from '../types/threeTokens';

/**
 * Creates a default token snapshot for a given theme baseline.
 */
export function createDefaultTokenSnapshot(theme: ThreeTheme = 'dark'): ThreeTokenSnapshot {
  const isLight = theme === 'light';
  const isAmoled = theme === 'amoled';

  const canvasBgHex = isAmoled ? '#000000' : isLight ? '#f2f7f7' : '#050b0d';
  const chromeToneHex = isLight ? '#586e75' : '#829fa6';
  const focusHex = isLight ? '#006843' : '#31d69c';
  const nominalHex = isLight ? '#006f49' : '#3bc994';
  const verdigrisMajorHex = isLight ? '#0c6348' : '#40c296';
  const verdigrisMinorHex = isLight ? '#226152' : '#4bae93';
  const datumFillHex = isLight ? '#18634d' : '#39aa86';
  const stalkSelectedHex = isLight ? '#2f504a' : '#9ed1c9';
  const footprintSelectedHex = isLight ? '#21483f' : '#a8dfd3';
  const stalkToneHex = isLight ? '#263339' : '#e0e7e7';
  const redHex = '#dc322f';

  return {
    canvasBg: canvasBgHex,
    canvasOpacity: 1.0,

    gridPrimaryColor: verdigrisMajorHex,
    gridPrimaryAlpha: isLight ? 0.36 : 0.42,
    gridPrimaryWidth: 2,
    gridSecondaryColor: verdigrisMinorHex,
    gridSecondaryAlpha: isLight ? 0.24 : 0.28,
    gridSecondaryWidth: 1,
    rangeRingColor: verdigrisMajorHex,
    rangeRingAlpha: isLight ? 0.32 : 0.38,
    rangeRingWidth: 1,
    rangeTickColor: verdigrisMajorHex,
    rangeTickAlpha: isLight ? 0.45 : 0.52,
    rangeTickWidth: 2,

    datumPlaneColor: verdigrisMajorHex,
    datumPlaneAlpha: isLight ? 0.45 : 0.52,
    datumPlaneWidth: 1,
    datumPlaneMajorColor: verdigrisMajorHex,
    datumPlaneMajorAlpha: isLight ? 0.45 : 0.52,
    datumPlaneMinorColor: verdigrisMinorHex,
    datumPlaneMinorAlpha: isLight ? 0.22 : 0.26,
    datumPlaneFillColor: datumFillHex,
    datumPlaneFillAlpha: isLight ? 0.12 : 0.22,
    datumPlaneFillGradientInner: 0.25,
    datumPlaneFillGradientExponent: 2.0,
    datumFootprintColor: verdigrisMajorHex,
    datumFootprintAlpha: isLight ? 0.42 : 0.50,
    datumFootprintWidth: 2,

    reticleBracketColor: chromeToneHex,
    reticleBracketAlpha: 0.4,
    boresightColor: verdigrisMajorHex,
    boresightAlpha: isLight ? 0.35 : 0.40,
    axisLineColor: verdigrisMinorHex,
    axisLineAlpha: isLight ? 0.22 : 0.24,
    axisLineWidth: 1,
    axisLineStyle: 'solid',
    bearingLineColor: focusHex,
    bearingLineAlpha: 0.38,
    bearingLineWidth: 2,
    bearingLineStyle: 'solid',
    bearingOrbitalColor: focusHex,
    bearingOrbitalAlpha: 0.42,
    bearingOrbitalWidth: 2,
    bearingOrbitalStyle: 'dashed',
    bearingCoreColor: '#b58900',
    bearingCoreAlpha: 0.35,
    bearingCoreWidth: 2,
    bearingCoreStyle: 'solid',
    headingIndicatorColor: chromeToneHex,
    headingIndicatorAlpha: 0.5,

    kinematicColor: focusHex,
    kinematicAlpha: 0.42,

    stalkSelectedColor: stalkSelectedHex,
    stalkSelectedAlpha: 0.72,
    stalkFocusedColor: focusHex,
    stalkFocusedAlpha: 0.88,
    stalkWidth: 1,
    stalkStyle: 'solid',

    footprintColor: verdigrisMajorHex,
    footprintAlpha: isLight ? 0.42 : 0.50,
    footprintSelectedColor: footprintSelectedHex,
    footprintSelectedAlpha: 0.85,
    footprintFocusedColor: focusHex,
    footprintFocusedAlpha: 0.92,

    orbitColor: verdigrisMinorHex,
    orbitAlpha: isLight ? 0.28 : 0.30,
    orbitWidth: 1,
    orbitStyle: 'dashed',
    orbitSelectedColor: focusHex,
    orbitSelectedAlpha: 0.52,
    orbitFocusedColor: focusHex,
    orbitFocusedAlpha: 0.52,

    routeColor: focusHex,
    routeAlpha: 0.90,
    routeWidth: 3,
    routeStyle: 'solid',

    stalkExtendDuration: 0.15,
    stalkExtendEase: parseCssCubicBezier('cubic-bezier(0.2, 0, 0, 1)'),
    stalkRetractDuration: 0.1,
    stalkRetractEase: parseCssCubicBezier('cubic-bezier(0.4, 0, 1, 1)'),
    footprintStampDuration: 0.075,

    ringMajorAlpha: isLight ? 0.50 : 0.55,
    ringMinorAlpha: isLight ? 0.24 : 0.28,
    finPerimeterAlpha: isLight ? 0.32 : 0.36,
    tickAlpha: isLight ? 0.45 : 0.52,
    reticleActiveAlpha: 0.6,
    reticleSelectedAlpha: 0.9,
    reticleFocusedAlpha: 1.0,
    instrumentFootprint: 16.47,
    cameraFovBase: 45,
    dashSize: CARTO_LINE_CONSTANTS.dashSize,
    dashGap: CARTO_LINE_CONSTANTS.gapSize,
    dotSize: CARTO_LINE_CONSTANTS.dotSize,
    dotGap: CARTO_LINE_CONSTANTS.dotGap,

    stateFocus: focusHex,
    stateSelected: stalkToneHex,
    stateSelectedBorder: focusHex,
    stateHoverOverlayAlpha: 0.04,

    categoryStar: '#cb4b16',
    categoryPlanet: '#2aa198',
    categoryOrbit: '#6c71c4',
    categoryHabitability: '#859900',

    statusNominal: nominalHex,
    statusCaution: '#b58900',
    statusCritical: redHex,
    confidenceConfirmed: '#859900',
    confidenceCandidate: '#b58900',
    confidenceTheoretical: '#6c71c4',

    theme,
  };
}

export const DEFAULT_DARK_TOKEN_SNAPSHOT = createDefaultTokenSnapshot('dark');
export const DEFAULT_LIGHT_TOKEN_SNAPSHOT = createDefaultTokenSnapshot('light');
export const DEFAULT_AMOLED_TOKEN_SNAPSHOT = createDefaultTokenSnapshot('amoled');
export const DEFAULT_THREE_TOKENS = DEFAULT_DARK_TOKEN_SNAPSHOT;
