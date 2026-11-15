import type { ReferenceFrame } from '../../../types/spatial';

/**
 * Creates a custom reference frame by applying partial overrides to a base frame.
 */
export function createCustomReferenceFrame(
  base: ReferenceFrame,
  overrides: Partial<ReferenceFrame>,
): ReferenceFrame {
  return {
    ...base,
    ...overrides,
    camera: {
      ...base.camera,
      ...(overrides.camera ?? {}),
    },
    lighting: overrides.lighting
      ? { ...(base.lighting ?? { ambientIntensity: 0.6 }), ...overrides.lighting }
      : base.lighting,
    datumPlane: {
      ...base.datumPlane,
      ...(overrides.datumPlane ?? {}),
    },
    coordinateFins: {
      ...base.coordinateFins,
      ...(overrides.coordinateFins ?? {}),
    },
    rangeRings: {
      ...base.rangeRings,
      ...(overrides.rangeRings ?? {}),
    },
    bearings: overrides.bearings ?? [...base.bearings],
    centerDistance: overrides.centerDistance ?? base.centerDistance,
    extent: overrides.extent ?? base.extent,
    orientation: overrides.orientation ?? base.orientation,
  };
}
