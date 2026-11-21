import { parseCssColor, parseCssFloat } from './cssTokenParsers';
import type { ParsedColorResult, ThreeTokenSnapshot } from '../types/threeTokens';

/**
 * Resolves CSS variables recursively up to depth 10.
 */
export function resolveCssVar(computed: CSSStyleDeclaration, value: string): string {
  let current = value.trim();
  let depth = 0;
  while (current.startsWith('var(') && depth < 10) {
    depth++;
    const match = current.match(/^var\(\s*(--[a-zA-Z0-9_-]+)/);
    const propName = match?.[1];
    if (!propName) break;
    const resolved = computed.getPropertyValue(propName).trim();
    if (!resolved) break;
    current = resolved;
  }
  return current;
}

/**
 * Reads and parses a CSS color custom property.
 */
export function readCssColor(
  computed: CSSStyleDeclaration,
  varName: string,
  defaultColorHex: string,
  defaultAlpha: number,
): ParsedColorResult {
  const raw = resolveCssVar(computed, computed.getPropertyValue(varName));
  if (!raw) return { colorHex: defaultColorHex, alpha: defaultAlpha };
  return parseCssColor(raw);
}

/**
 * Reads and parses a CSS opacity or scalar custom property.
 */
export function readCssOpacity(
  computed: CSSStyleDeclaration,
  varName: string,
  defaultVal: number,
): number {
  const raw = resolveCssVar(computed, computed.getPropertyValue(varName));
  return parseCssFloat(raw, defaultVal);
}

export type ExtractedColorTokens = Pick<
  ThreeTokenSnapshot,
  | 'canvasBg'
  | 'gridPrimaryColor'
  | 'gridPrimaryAlpha'
  | 'gridSecondaryColor'
  | 'gridSecondaryAlpha'
  | 'rangeRingColor'
  | 'rangeRingAlpha'
  | 'rangeTickColor'
  | 'rangeTickAlpha'
  | 'datumPlaneColor'
  | 'datumPlaneAlpha'
  | 'datumPlaneMajorColor'
  | 'datumPlaneMajorAlpha'
  | 'datumPlaneMinorColor'
  | 'datumPlaneMinorAlpha'
  | 'datumPlaneFillColor'
  | 'datumPlaneFillAlpha'
  | 'datumPlaneFillGradientInner'
  | 'datumPlaneFillGradientExponent'
  | 'datumFootprintColor'
  | 'datumFootprintAlpha'
  | 'reticleBracketColor'
  | 'reticleBracketAlpha'
  | 'boresightColor'
  | 'boresightAlpha'
  | 'axisLineColor'
  | 'axisLineAlpha'
  | 'bearingLineColor'
  | 'bearingLineAlpha'
  | 'bearingOrbitalColor'
  | 'bearingOrbitalAlpha'
  | 'bearingCoreColor'
  | 'bearingCoreAlpha'
  | 'headingIndicatorColor'
  | 'headingIndicatorAlpha'
  | 'kinematicColor'
  | 'kinematicAlpha'
  | 'stalkSelectedColor'
  | 'stalkSelectedAlpha'
  | 'stalkFocusedColor'
  | 'stalkFocusedAlpha'
  | 'footprintColor'
  | 'footprintAlpha'
  | 'footprintSelectedColor'
  | 'footprintSelectedAlpha'
  | 'footprintFocusedColor'
  | 'footprintFocusedAlpha'
  | 'orbitColor'
  | 'orbitAlpha'
  | 'orbitSelectedColor'
  | 'orbitSelectedAlpha'
  | 'orbitFocusedColor'
  | 'orbitFocusedAlpha'
  | 'routeColor'
  | 'routeAlpha'
  | 'stateFocus'
  | 'stateSelected'
  | 'stateSelectedBorder'
  | 'stateHoverOverlayAlpha'
  | 'categoryStar'
  | 'categoryPlanet'
  | 'categoryOrbit'
  | 'categoryHabitability'
  | 'statusNominal'
  | 'statusCaution'
  | 'statusCritical'
  | 'confidenceConfirmed'
  | 'confidenceCandidate'
  | 'confidenceTheoretical'
>;

/**
 * Extracts all color and opacity tokens from computed CSS styles.
 */
export function extractThreeColorTokens(
  computed: CSSStyleDeclaration,
  fallback: ThreeTokenSnapshot,
): ExtractedColorTokens {
  const canvasParsed = readCssColor(computed, '--surface-canvas-bg', fallback.canvasBg, 1.0);
  const gridPrimary = readCssColor(computed, '--chrome-grid-primary-color', fallback.gridPrimaryColor, fallback.gridPrimaryAlpha);
  const gridSecondary = readCssColor(computed, '--chrome-grid-secondary-color', fallback.gridSecondaryColor, fallback.gridSecondaryAlpha);
  const rangeRing = readCssColor(computed, '--chrome-range-ring-color', fallback.rangeRingColor, fallback.rangeRingAlpha);
  const rangeTick = readCssColor(computed, '--chrome-range-tick-color', fallback.rangeTickColor, fallback.rangeTickAlpha);
  const datumPlane = readCssColor(computed, '--chrome-datum-plane-color', fallback.datumPlaneColor, fallback.datumPlaneAlpha);
  const datumPlaneMajor = readCssColor(computed, '--chrome-datum-plane-major-color', fallback.datumPlaneMajorColor, fallback.datumPlaneMajorAlpha);
  const datumPlaneMinor = readCssColor(computed, '--chrome-datum-plane-minor-color', fallback.datumPlaneMinorColor, fallback.datumPlaneMinorAlpha);
  const datumPlaneFill = readCssColor(computed, '--chrome-datum-plane-fill-color', fallback.datumPlaneFillColor, fallback.datumPlaneFillAlpha);
  const datumFootprint = readCssColor(computed, '--chrome-datum-footprint-color', fallback.datumFootprintColor, fallback.datumFootprintAlpha);
  const reticleBracket = readCssColor(computed, '--chrome-reticle-bracket-color', fallback.reticleBracketColor, fallback.reticleBracketAlpha);
  const boresight = readCssColor(computed, '--chrome-boresight-color', fallback.boresightColor, fallback.boresightAlpha);
  const axisLine = readCssColor(computed, '--chrome-axis-line-color', fallback.axisLineColor, fallback.axisLineAlpha);
  const bearingLine = readCssColor(computed, '--chrome-bearing-line-color', fallback.bearingLineColor, fallback.bearingLineAlpha);
  const bearingOrbital = readCssColor(computed, '--chrome-bearing-orbital-color', fallback.bearingOrbitalColor, fallback.bearingOrbitalAlpha);
  const bearingCore = readCssColor(computed, '--chrome-bearing-core-color', fallback.bearingCoreColor, fallback.bearingCoreAlpha);
  const heading = readCssColor(computed, '--chrome-heading-indicator-color', fallback.headingIndicatorColor, fallback.headingIndicatorAlpha);
  const kinematic = readCssColor(computed, '--chrome-kinematic-color', fallback.kinematicColor, fallback.kinematicAlpha);
  const stalkSelected = readCssColor(computed, '--chrome-stalk-selected-color', fallback.stalkSelectedColor, fallback.stalkSelectedAlpha);
  const stalkFocused = readCssColor(computed, '--chrome-stalk-focused-color', fallback.stalkFocusedColor, fallback.stalkFocusedAlpha);
  const footprint = readCssColor(computed, '--chrome-footprint-color', fallback.footprintColor, fallback.footprintAlpha);
  const footprintSelected = readCssColor(computed, '--chrome-footprint-selected-color', fallback.footprintSelectedColor, fallback.footprintSelectedAlpha);
  const footprintFocused = readCssColor(computed, '--chrome-footprint-focused-color', fallback.footprintFocusedColor, fallback.footprintFocusedAlpha);
  const orbit = readCssColor(computed, '--chrome-orbit-color', fallback.orbitColor, fallback.orbitAlpha);
  const orbitSelected = readCssColor(computed, '--chrome-orbit-selected-color', fallback.orbitSelectedColor, fallback.orbitSelectedAlpha);
  const orbitFocused = readCssColor(computed, '--chrome-orbit-focused-color', fallback.orbitFocusedColor, fallback.orbitFocusedAlpha);
  const route = readCssColor(computed, '--chrome-route-color', fallback.routeColor, fallback.routeAlpha);

  const stateFocus = readCssColor(computed, '--state-focus', fallback.stateFocus, 1.0);
  const stateSelected = readCssColor(computed, '--state-selected', fallback.stateSelected, 1.0);
  const stateSelectedBorder = readCssColor(computed, '--state-selected-border', fallback.stateSelectedBorder, 1.0);

  const catStar = readCssColor(computed, '--category-star', fallback.categoryStar, 1.0);
  const catPlanet = readCssColor(computed, '--category-planet', fallback.categoryPlanet, 1.0);
  const catOrbit = readCssColor(computed, '--category-orbit', fallback.categoryOrbit, 1.0);
  const catHab = readCssColor(computed, '--category-habitability', fallback.categoryHabitability, 1.0);

  const statNominal = readCssColor(computed, '--status-nominal', fallback.statusNominal, 1.0);
  const statCaution = readCssColor(computed, '--status-caution', fallback.statusCaution, 1.0);
  const statCritical = readCssColor(computed, '--status-critical', fallback.statusCritical, 1.0);

  const confConfirmed = readCssColor(computed, '--confidence-confirmed', fallback.confidenceConfirmed, 1.0);
  const confCandidate = readCssColor(computed, '--confidence-candidate', fallback.confidenceCandidate, 1.0);
  const confTheoretical = readCssColor(computed, '--confidence-theoretical', fallback.confidenceTheoretical, 1.0);

  return {
    canvasBg: canvasParsed.colorHex,
    gridPrimaryColor: gridPrimary.colorHex,
    gridPrimaryAlpha: gridPrimary.alpha,
    gridSecondaryColor: gridSecondary.colorHex,
    gridSecondaryAlpha: gridSecondary.alpha,
    rangeRingColor: rangeRing.colorHex,
    rangeRingAlpha: rangeRing.alpha,
    rangeTickColor: rangeTick.colorHex,
    rangeTickAlpha: rangeTick.alpha,
    datumPlaneColor: datumPlane.colorHex,
    datumPlaneAlpha: readCssOpacity(computed, '--chrome-datum-plane-alpha', datumPlane.alpha),
    datumPlaneMajorColor: datumPlaneMajor.colorHex,
    datumPlaneMajorAlpha: readCssOpacity(computed, '--chrome-datum-plane-major-alpha', datumPlaneMajor.alpha),
    datumPlaneMinorColor: datumPlaneMinor.colorHex,
    datumPlaneMinorAlpha: readCssOpacity(computed, '--chrome-datum-plane-minor-alpha', datumPlaneMinor.alpha),
    datumPlaneFillColor: datumPlaneFill.colorHex,
    datumPlaneFillAlpha: readCssOpacity(computed, '--chrome-datum-plane-fill-alpha', datumPlaneFill.alpha),
    datumPlaneFillGradientInner: readCssOpacity(computed, '--chrome-datum-plane-fill-gradient-inner', fallback.datumPlaneFillGradientInner),
    datumPlaneFillGradientExponent: readCssOpacity(computed, '--chrome-datum-plane-fill-gradient-exponent', fallback.datumPlaneFillGradientExponent),
    datumFootprintColor: datumFootprint.colorHex,
    datumFootprintAlpha: readCssOpacity(computed, '--chrome-datum-footprint-alpha', datumFootprint.alpha),
    reticleBracketColor: reticleBracket.colorHex,
    reticleBracketAlpha: reticleBracket.alpha,
    boresightColor: boresight.colorHex,
    boresightAlpha: boresight.alpha,
    axisLineColor: axisLine.colorHex,
    axisLineAlpha: axisLine.alpha,
    bearingLineColor: bearingLine.colorHex,
    bearingLineAlpha: bearingLine.alpha,
    bearingOrbitalColor: bearingOrbital.colorHex,
    bearingOrbitalAlpha: readCssOpacity(
      computed,
      '--chrome-bearing-orbital-alpha',
      bearingOrbital.alpha !== 1 ? bearingOrbital.alpha : fallback.bearingOrbitalAlpha,
    ),
    bearingCoreColor: bearingCore.colorHex,
    bearingCoreAlpha: bearingCore.alpha,
    headingIndicatorColor: heading.colorHex,
    headingIndicatorAlpha: heading.alpha,
    kinematicColor: kinematic.colorHex,
    kinematicAlpha: kinematic.alpha,
    stalkSelectedColor: stalkSelected.colorHex,
    stalkSelectedAlpha: stalkSelected.alpha,
    stalkFocusedColor: stalkFocused.colorHex,
    stalkFocusedAlpha: stalkFocused.alpha,
    footprintColor: footprint.colorHex,
    footprintAlpha: footprint.alpha,
    footprintSelectedColor: footprintSelected.colorHex,
    footprintSelectedAlpha: footprintSelected.alpha,
    footprintFocusedColor: footprintFocused.colorHex,
    footprintFocusedAlpha: footprintFocused.alpha,
    orbitColor: orbit.colorHex,
    orbitAlpha: orbit.alpha,
    orbitSelectedColor: orbitSelected.colorHex,
    orbitSelectedAlpha: orbitSelected.alpha,
    orbitFocusedColor: orbitFocused.colorHex,
    orbitFocusedAlpha: orbitFocused.alpha,
    routeColor: route.colorHex,
    routeAlpha: route.alpha,
    stateFocus: stateFocus.colorHex,
    stateSelected: stateSelected.colorHex,
    stateSelectedBorder: stateSelectedBorder.colorHex,
    stateHoverOverlayAlpha: readCssOpacity(computed, '--ui-hover-overlay-opacity', fallback.stateHoverOverlayAlpha),
    categoryStar: catStar.colorHex,
    categoryPlanet: catPlanet.colorHex,
    categoryOrbit: catOrbit.colorHex,
    categoryHabitability: catHab.colorHex,
    statusNominal: statNominal.colorHex,
    statusCaution: statCaution.colorHex,
    statusCritical: statCritical.colorHex,
    confidenceConfirmed: confConfirmed.colorHex,
    confidenceCandidate: confCandidate.colorHex,
    confidenceTheoretical: confTheoretical.colorHex,
  };
}
