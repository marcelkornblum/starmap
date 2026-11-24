import { describe, expect, it } from 'vitest';
import type { FocusedEntityDetailsBase } from './detailsEntityTypes';
import { buildFocusedPlanetDetails } from './focusedPlanetDetails';

describe('focusedPlanetDetails', () => {
  const base: FocusedEntityDetailsBase = {
    id: 'proxima-b',
    name: 'Proxima b',
    systemId: 'proxima',
    systemName: 'Proxima',
    reticleType: 'stellar-system',
    starCount: 0,
    planetCount: 0,
    planetCompositionBreakdown: [],
    planetCompositionSummary: '',
    hasHabitableCandidate: false,
    hazardCount: 0,
    hazards: [],
    hazardSummaryLabel: '0 hazards',
    systemSummary: '',
    systemSummarySegments: [],
    coordinatesPc: [0, 0, 0],
    sectorId: '',
    tags: [],
    directionsHref: '',
    stars: [],
    planets: [],
    canonAnnotations: [],
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

  it('propagates axialTiltDeg from matchedPlanetDetail or solarBodyRecord onto planetTelemetry', () => {
    const fromSolarBody = buildFocusedPlanetDetails(
      base,
      undefined,
      {
        id: 'uranus',
        name: 'Uranus',
        classification: 'Planet',
        parentBodyId: 'sol',
        meanRadiusKm: 25362,
        axialTiltDeg: 97.77,
      },
      undefined,
      undefined,
      'ice-giant',
      false,
      [],
      [],
    );
    expect(fromSolarBody.planetTelemetry.axialTiltDeg).toBe(97.77);

    const fromMatchedPlanet = buildFocusedPlanetDetails(
      base,
      {
        id: 'earth',
        name: 'Earth',
        composition: 'terrestrial',
        isHabitableCandidate: true,
        axialTiltDeg: 23.44,
      },
      undefined,
      undefined,
      undefined,
      'terrestrial',
      true,
      [],
      [],
    );
    expect(fromMatchedPlanet.planetTelemetry.axialTiltDeg).toBe(23.44);
  });
});
