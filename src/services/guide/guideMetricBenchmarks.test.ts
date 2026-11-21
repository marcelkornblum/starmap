import { describe, expect, it } from 'vitest';
import type { ReferenceBaselinesDataset } from '../../types/guideData';
import {
  evaluateMetricForTarget,
  getMetricBaseline,
} from './guideMetricBenchmarks';

const CUSTOM_BASELINES: ReferenceBaselinesDataset = {
  version: 1,
  generatedAt: '2026-01-01T00:00:00.000Z',
  targets: {
    sol: {
      id: 'sol',
      name: 'Sol (Seed)',
      systemId: 'sol',
      href: '/system/sol',
      spectralType: 'G2V',
      coordinatesPc: [0, 0, 0],
      massMsun: { value: 1.0, unit: 'M☉' },
      radiusRsun: { value: 1.0, unit: 'R☉' },
      luminosityLsun: { value: 1.0, unit: 'L☉' },
      effectiveTempK: { value: 6000, unit: 'K' },
      visualMagnitude: { value: -26.0, unit: 'V' },
      absoluteMagnitude: { value: 4.83, unit: 'M_V' },
      reticleType: 'stellar-system',
    },
    earth: {
      id: 'earth',
      name: 'Terra (Seed)',
      systemId: 'sol',
      systemName: 'Sol (Seed)',
      href: '/planet/earth',
      coordinatesPc: [0, 0, 0],
      massMearth: { value: 1.0, unit: 'M⊕' },
      radiusRearth: { value: 1.0, unit: 'R⊕' },
      semiMajorAxisAu: { value: 1.0, unit: 'AU' },
      periodDays: { value: 400.0, unit: 'd' },
      inclinationDeg: { value: 0, unit: '°' },
      equilibriumTempK: { value: 249, unit: 'K' },
      surfaceGravityG: { value: 1.0, unit: 'g' },
      reticleType: 'terrestrial',
    },
    stellarBenchmark: {
      id: 'tau-ceti',
      systemId: 'tau-ceti',
      name: 'Tau Ceti',
      href: '/system/tau-ceti',
      coordinatesPc: [0, 0, 0],
      reticleType: 'stellar-system',
    },
    orbitalBenchmark: {
      id: 'tau-ceti-e',
      systemId: 'tau-ceti',
      systemName: 'Tau Ceti',
      name: 'Tau Ceti e',
      href: '/system/tau-ceti?focus=tau-ceti-e',
      reticleType: 'super-earth',
    },
  },
  metrics: {
    'stellar-mass': {
      baselineId: 'sol',
      baselineName: 'Sol (Seed)',
      baselineHref: '/system/sol',
      baselineReticleType: 'stellar-system',
      value: '1.00 M☉',
      familiar: '332,950 M⊕',
      numericValue: 1,
      unit: 'M☉',
    },
  },
};

describe('guideMetricBenchmarks', () => {
  it('returns placeholder strings when baselines dataset is uncached', () => {
    expect(getMetricBaseline('stellar-mass', undefined)).toEqual({
      baselineValue: '—',
      baselineFamiliar: '—',
    });
  });

  it('derives comparative ratios from resolved ReferenceBaselinesDataset rather than hardcoded entity constants', () => {
    const tempComp = evaluateMetricForTarget(
      'effective-temperature',
      {
        targetId: 'test-star',
        targetName: 'Test Star',
        targetHref: '/system/test-star',
        manifest: null,
        targetStar: {
          id: 'test-star-A',
          name: 'Test Star',
          componentDesignation: 'A',
          spectralType: 'G0V',
          mag: 5.0,
          absmag: 4.5,
          effectiveTempK: 3000,
        },
      },
      CUSTOM_BASELINES,
    );
    expect(tempComp.relativeRatioLabel).toBe('0.50× Solar temperature');

    const magComp = evaluateMetricForTarget(
      'stellar-magnitude',
      {
        targetId: 'test-star',
        targetName: 'Test Star',
        targetHref: '/system/test-star',
        manifest: null,
        targetStar: {
          id: 'test-star-A',
          name: 'Test Star',
          componentDesignation: 'A',
          spectralType: 'G0V',
          mag: 0,
          absmag: 0,
        },
      },
      CUSTOM_BASELINES,
    );
    expect(magComp.relativeRatioLabel).toBe('Δ26.0 mag relative to Sol (Seed)');

    const periodComp = evaluateMetricForTarget(
      'orbital-period',
      {
        targetId: 'test-planet',
        targetName: 'Test Planet',
        targetHref: '/system/test-star?focus=test-planet',
        manifest: null,
        targetPlanet: {
          id: 'test-planet',
          name: 'Test Planet',
          letter: 'b',
          orbit: {
            semiMajorAxis: 1,
            eccentricity: 0,
            inclination: 0,
            ascendingNode: 0,
            argumentOfPeriapsis: 0,
            meanAnomaly: 0,
            periodDays: 200,
          },
        },
      },
      CUSTOM_BASELINES,
    );
    expect(periodComp.relativeRatioLabel).toBe('0.50× Terra (Seed) year');
  });
});
