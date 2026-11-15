export type ThreeTheme = 'dark' | 'light' | 'amoled';
export type ThreeLineStyle = 'solid' | 'dashed' | 'dotted';
export type EasingFunction = (t: number) => number;

export interface ParsedColorResult {
  colorHex: string;
  alpha: number;
}

export interface CanvasEnvironmentTokens {
  canvasBg: string;
  canvasOpacity: number;
}

export interface GraticuleTokens {
  gridPrimaryColor: string;
  gridPrimaryAlpha: number;
  gridPrimaryWidth: number;
  gridSecondaryColor: string;
  gridSecondaryAlpha: number;
  gridSecondaryWidth: number;
  rangeRingColor: string;
  rangeRingAlpha: number;
  rangeRingWidth: number;
  rangeTickColor: string;
  rangeTickAlpha: number;
  rangeTickWidth: number;
}

export interface DatumPlaneTokens {
  datumPlaneColor: string;
  datumPlaneAlpha: number;
  datumPlaneWidth: number;
  datumPlaneMajorColor: string;
  datumPlaneMajorAlpha: number;
  datumPlaneMinorColor: string;
  datumPlaneMinorAlpha: number;
  datumPlaneFillColor: string;
  datumPlaneFillAlpha: number;
  datumPlaneFillGradientInner: number;
  datumPlaneFillGradientExponent: number;
  datumFootprintColor: string;
  datumFootprintAlpha: number;
  datumFootprintWidth: number;
}

export interface ReticleAndBearingTokens {
  reticleBracketColor: string;
  reticleBracketAlpha: number;
  boresightColor: string;
  boresightAlpha: number;
  axisLineColor: string;
  axisLineAlpha: number;
  axisLineWidth: number;
  axisLineStyle: ThreeLineStyle;
  bearingLineColor: string;
  bearingLineAlpha: number;
  bearingLineWidth: number;
  bearingLineStyle: ThreeLineStyle;
  bearingOrbitalColor: string;
  bearingOrbitalAlpha: number;
  bearingOrbitalWidth: number;
  bearingOrbitalStyle: ThreeLineStyle;
  bearingCoreColor: string;
  bearingCoreAlpha: number;
  bearingCoreWidth: number;
  bearingCoreStyle: ThreeLineStyle;
  headingIndicatorColor: string;
  headingIndicatorAlpha: number;
}

export interface KinematicTokens {
  kinematicColor: string;
  kinematicAlpha: number;
}

export interface DropStalkTokens {
  stalkSelectedColor: string;
  stalkSelectedAlpha: number;
  stalkFocusedColor: string;
  stalkFocusedAlpha: number;
  stalkWidth: number;
  stalkStyle: ThreeLineStyle;
}

export interface FootprintTokens {
  footprintColor: string;
  footprintAlpha: number;
  footprintSelectedColor: string;
  footprintSelectedAlpha: number;
  footprintFocusedColor: string;
  footprintFocusedAlpha: number;
}

export interface OrbitTokens {
  orbitColor: string;
  orbitAlpha: number;
  orbitWidth: number;
  orbitStyle: ThreeLineStyle;
  orbitSelectedColor: string;
  orbitSelectedAlpha: number;
  orbitFocusedColor: string;
  orbitFocusedAlpha: number;
}

export interface RouteTokens {
  routeColor: string;
  routeAlpha: number;
  routeWidth: number;
  routeStyle: ThreeLineStyle;
}

export interface MotionTokens {
  stalkExtendDuration: number;
  stalkExtendEase: EasingFunction;
  stalkRetractDuration: number;
  stalkRetractEase: EasingFunction;
  footprintStampDuration: number;
}

export interface InstrumentAlphaAndMetricTokens {
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
}

export interface InteractiveStateTokens {
  stateFocus: string;
  stateSelected: string;
  stateSelectedBorder: string;
  stateHoverOverlayAlpha: number;
}

export interface DomainCategoryTokens {
  categoryStar: string;
  categoryPlanet: string;
  categoryOrbit: string;
  categoryHabitability: string;
}

export interface TelemetryStatusTokens {
  statusNominal: string;
  statusCaution: string;
  statusCritical: string;
  confidenceConfirmed: string;
  confidenceCandidate: string;
  confidenceTheoretical: string;
}

export interface ThreeTokenMap
  extends CanvasEnvironmentTokens,
    GraticuleTokens,
    DatumPlaneTokens,
    ReticleAndBearingTokens,
    KinematicTokens,
    DropStalkTokens,
    FootprintTokens,
    OrbitTokens,
    RouteTokens,
    MotionTokens,
    InstrumentAlphaAndMetricTokens,
    InteractiveStateTokens,
    DomainCategoryTokens,
    TelemetryStatusTokens {
  theme: ThreeTheme;
}

export type ThreeTokenSnapshot = ThreeTokenMap;
