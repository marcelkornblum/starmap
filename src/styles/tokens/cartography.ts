/**
 * Screen-space cartographic line metric constants (in CSS screen pixels).
 * Centralised for shader materials (CartoLineMaterial, CartoHairlineMaterial) and Three token bridge.
 */
export const CARTO_LINE_CONSTANTS = {
  /** Screen-space dash length in pixels */
  dashSize: 14.0,
  /** Screen-space gap length in pixels */
  gapSize: 8.0,
  /** Screen-space dot length in pixels for stipple dotted lines */
  dotSize: 2.0,
  /** Screen-space gap length in pixels for stipple dotted lines */
  dotGap: 4.0,
  /** Baseline hairline width */
  hairlineWidth: 1.0,
} as const;
