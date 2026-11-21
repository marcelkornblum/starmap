import { describe, expect, it } from 'vitest';
import { buildFocusedPlanetDetails } from './focusedPlanetDetails';

describe('focusedPlanetDetails', () => {
  const base: any = {
    id: 'proxima-b',
    name: 'Proxima b',
    systemId: 'proxima',
    systemName: 'Proxima',
    stars: [],
    planets: [],
    hazards: [],
  };

  it('reads precalculated planet telemetry cleanly', () => {
    const details = buildFocusedPlanetDetails(
      base,
      {
        id: 'proxima-b',
        name: 'Proxima b',
        composition: 'terrestrial',
        massMearth: 1.07,
        radiusRearth: 1.03,
        equilibriumTempK: 234,
        surfaceGravityG: 1.01,
        esi: 0.87,
        isTidallyLocked: true,
        isHabitableCandidate: true,
      },
      undefined,
      undefined,
      undefined,
      'terrestrial',
      true,
      [],
      [],
    );

    expect(details.focusedKind).toBe('planet');
    expect(details.planetTelemetry.composition).toBe('terrestrial');
    expect(details.planetTelemetry.surfaceGravityG).toBeCloseTo(1.01, 2);
    expect(details.planetTelemetry.esi).toBe(0.87);
    expect(details.planetTelemetry.isTidallyLocked).toBe(true);
  });
});
