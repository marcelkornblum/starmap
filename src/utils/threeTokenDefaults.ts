import { CARTO_LINE_CONSTANTS } from '../styles/tokens/cartography';
import { parseCssCubicBezier } from './easingMath';
import type { ThreeTheme, ThreeTokenSnapshot } from '../types/threeTokens';

/**
 * Creates a default token snapshot for a given theme baseline.
 */
export function createDefaultTokenSnapshot(theme: ThreeTheme = 'dark'): ThreeTokenSnapshot {
  const isLight = theme === 'light';
  const isAmoled = theme === 'amoled';

  const canvasBgHex = isAmoled ? '#000000' : isLight ? '#fdf6e3' : '#002b36';
  const chromeToneHex = isLight ? '#586e75' : '#829fa6';
  const focusHex = isLight ? '#007840' : '#00d078';
  const stalkToneHex = isLight ? '#263339' : '#e0e7e7';
  const redHex = '#dc322f';

  return {
    canvasBg: canvasBgHex,
    canvasOpacity: 1.0,

    gridPrimaryColor: chromeToneHex,
    gridPrimaryAlpha: 0.3,
    gridPrimaryWidth: 2,
    gridSecondaryColor: chromeToneHex,
    gridSecondaryAlpha: 0.16,
    gridSecondaryWidth: 1,
    rangeRingColor: chromeToneHex,
    rangeRingAlpha: 0.24,
    rangeRingWidth: 1,
    rangeTickColor: chromeToneHex,
    rangeTickAlpha: 0.4,
    rangeTickWidth: 2,

    datumPlaneColor: theme === 'light' ? '#073642' : '#8cb8cc',
    datumPlaneAlpha: 0.35,
    datumPlaneWidth: 1,
    datumPlaneMajorColor: theme === 'light' ? '#073642' : '#8cb8cc',
    datumPlaneMajorAlpha: 0.35,
    datumPlaneMinorColor: theme === 'light' ? '#586e75' : '#8cb8cc',
    datumPlaneMinorAlpha: 0.18,
    datumPlaneFillColor: theme === 'light' ? '#073642' : '#8cb8cc',
    datumPlaneFillAlpha: theme === 'light' ? 0.08 : 0.16,
    datumPlaneFillGradientInner: 0.25,
    datumPlaneFillGradientExponent: 2.0,
    datumFootprintColor: theme === 'light' ? '#586e75' : '#93a1a1',
    datumFootprintAlpha: 0.25,
    datumFootprintWidth: 2,

    reticleBracketColor: chromeToneHex,
    reticleBracketAlpha: 0.4,
    boresightColor: chromeToneHex,
    boresightAlpha: 0.3,
    axisLineColor: chromeToneHex,
    axisLineAlpha: 0.16,
    axisLineWidth: 1,
    axisLineStyle: 'solid',
    bearingLineColor: redHex,
    bearingLineAlpha: 0.35,
    bearingLineWidth: 2,
    bearingLineStyle: 'solid',
    bearingOrbitalColor: redHex,
    bearingOrbitalAlpha: 0.35,
    bearingOrbitalWidth: 2,
    bearingOrbitalStyle: 'dashed',
    bearingCoreColor: '#b58900',
    bearingCoreAlpha: 0.35,
    bearingCoreWidth: 2,
    bearingCoreStyle: 'solid',
    headingIndicatorColor: chromeToneHex,
    headingIndicatorAlpha: 0.5,

    kinematicColor: redHex,
    kinematicAlpha: 0.35,

    stalkSelectedColor: stalkToneHex,
    stalkSelectedAlpha: 0.7,
    stalkFocusedColor: stalkToneHex,
    stalkFocusedAlpha: 0.85,
    stalkWidth: 1,
    stalkStyle: 'solid',

    footprintColor: theme === 'light' ? '#586e75' : '#93a1a1',
    footprintAlpha: 0.35,
    footprintSelectedColor: stalkToneHex,
    footprintSelectedAlpha: 0.85,
    footprintFocusedColor: focusHex,
    footprintFocusedAlpha: 0.85,

    orbitColor: theme === 'light' ? '#586e75' : '#93a1a1',
    orbitAlpha: 0.24,
    orbitWidth: 1,
    orbitStyle: 'dashed',
    orbitSelectedColor: redHex,
    orbitSelectedAlpha: 0.35,
    orbitFocusedColor: redHex,
    orbitFocusedAlpha: 0.35,

    routeColor: redHex,
    routeAlpha: 0.9,
    routeWidth: 3,
    routeStyle: 'solid',

    stalkExtendDuration: 0.15,
    stalkExtendEase: parseCssCubicBezier('cubic-bezier(0.2, 0, 0, 1)'),
    stalkRetractDuration: 0.1,
    stalkRetractEase: parseCssCubicBezier('cubic-bezier(0.4, 0, 1, 1)'),
    footprintStampDuration: 0.075,

    ringMajorAlpha: 0.45,
    ringMinorAlpha: 0.2,
    finPerimeterAlpha: 0.25,
    tickAlpha: 0.4,
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
    stateSelectedBorder: stalkToneHex,
    stateHoverOverlayAlpha: 0.04,

    categoryStar: '#cb4b16',
    categoryPlanet: '#2aa198',
    categoryOrbit: '#6c71c4',
    categoryHabitability: '#859900',

    statusNominal: '#859900',
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
