import { describe, it, expect } from 'vitest';
import {
  PARSEC_TO_LY,
  AU_TO_KM,
  AU_TO_LIGHT_MINUTES,
  STANDARD_G_MPS2,
  computeEuclideanDistance3D,
  computeInterstellarRelativisticTransit,
  computeInterstellarConstantBetaTransit,
  computeIntraSystemBrachistochroneTransit,
  computeHohmannTransferOrbit,
} from '../utils/astroMath';
import {
  extractUrlRouteStops,
  extractUrlJourneyOptionId,
  buildDirectionsTriggerHref,
  buildJourneyPlan,
} from './journeyService';
import type { CompactSearchEntry } from '../utils/compactDataCodec';

const SAMPLE_BENCHMARK_CORPUS: readonly CompactSearchEntry[] = [
  {
    i: 'sol',
    n: 'Sol',
    h: 1,
    p: [0, 0, 0],
    m: [-26.74, 'G2V', 8, 1],
  },
  {
    i: 'proxima-centauri',
    n: 'Proxima Centauri',
    p: [-0.963, -0.669, -0.589],
    m: [11.13, 'M5.5V', 2, 1],
    g: 1,
  },
  {
    i: 'tau-ceti',
    n: 'Tau Ceti',
    p: [-2.61, 1.83, -1.72],
    m: [3.5, 'G8V', 4, 1],
    g: 1,
  },
  {
    i: 'sirius',
    n: 'Sirius',
    p: [-1.61, 2.07, -0.63],
    m: [-1.46, 'A1V', 0],
  },
  {
    i: 'earth',
    n: 'Earth',
    k: 2,
    s: 'sol',
    p: [0, 0, 0],
    r: 3,
    A: 1.0,
    P: 365.256,
    u: 'terrestrial',
    z: 1,
  },
  {
    i: 'mars',
    n: 'Mars',
    k: 2,
    s: 'sol',
    p: [0, 0, 0],
    r: 4,
    A: 1.524,
    P: 686.98,
    u: 'terrestrial',
  },
];

describe('journeyService & transit mathematics (DEC-033)', () => {
  describe('Transit Mathematics & Constants', () => {
    it('verifies fundamental astronomical and physical constants', () => {
      expect(PARSEC_TO_LY).toBeCloseTo(3.26156, 4);
      expect(AU_TO_KM).toBeCloseTo(149597870.7, 1);
      expect(AU_TO_LIGHT_MINUTES).toBeCloseTo(8.3167, 3);
      expect(STANDARD_G_MPS2).toBeCloseTo(9.80665, 4);
    });

    it('computes 3D Euclidean distances accurately in parsecs and light years', () => {
      const { distance: distPc } = computeEuclideanDistance3D([0, 0, 0], [-0.963, -0.669, -0.589]);
      expect(distPc).toBeCloseTo(1.309, 2);
      const distLy = distPc * PARSEC_TO_LY;
      expect(distLy).toBeCloseTo(4.27, 1);
    });

    it('computes interstellar continuous-acceleration relativistic transit for 1g continuous burn', () => {
      const result = computeInterstellarRelativisticTransit(11.90, 1.0);
      expect(result.shipProperTimeYears).toBeGreaterThan(4.5);
      expect(result.shipProperTimeYears).toBeCloseTo(5.14, 1);
      expect(result.coordinateTimeYears).toBeGreaterThan(13.5);
      expect(result.coordinateTimeYears).toBeLessThan(14.0);
      expect(result.peakBetaC).toBeGreaterThan(0.98);
      expect(result.peakBetaC).toBeLessThan(1.0);
      expect(result.peakLorentzGamma).toBeGreaterThan(5.0);
      expect(result.turnaroundDistanceLy).toBeCloseTo(5.95, 2);
    });

    it('computes interstellar constant-beta sublight transit', () => {
      const result = computeInterstellarConstantBetaTransit(11.90, 0.1);
      expect(result.coordinateTimeYears).toBeCloseTo(119.0, 1);
      expect(result.shipProperTimeYears).toBeCloseTo(118.4, 1);
      expect(result.cruiseBetaC).toBe(0.1);
      expect(result.lorentzGamma).toBeGreaterThan(1.0);
      expect(result.lorentzGamma).toBeLessThan(1.01);
    });

    it('computes intra-system continuous-thrust brachistochrone transit', () => {
      const result = computeIntraSystemBrachistochroneTransit(0.524, 1.0);
      expect(result.transitDays).toBeGreaterThan(2.0);
      expect(result.transitDays).toBeLessThan(3.0);
      expect(result.peakVelocityKms).toBeGreaterThan(700);
      expect(result.peakVelocityKms).toBeLessThan(1100);
    });

    it('computes intra-system Hohmann minimum-energy orbital transfer', () => {
      const result = computeHohmannTransferOrbit(1.0, 1.524, 1.0);
      expect(result.transitDays).toBeGreaterThan(250);
      expect(result.transitDays).toBeLessThan(265);
      expect(result.totalDeltaVKms).toBeGreaterThan(5.0);
      expect(result.totalDeltaVKms).toBeLessThan(6.5);
      expect(result.synodicPeriodDays).toBeGreaterThan(770);
      expect(result.synodicPeriodDays).toBeLessThan(790);
    });
  });

  describe('Route Stop Parsing & Trigger Generation', () => {
    it('extracts route stops from URL query search strings', () => {
      expect(extractUrlRouteStops('?route=sol,tau-ceti')).toEqual(['sol', 'tau-ceti']);
      expect(extractUrlRouteStops('?route=sol%2Cproxima-centauri%2Csirius')).toEqual([
        'sol',
        'proxima-centauri',
        'sirius',
      ]);
      expect(extractUrlRouteStops('?route=')).toBeNull();
      expect(extractUrlRouteStops('')).toBeNull();
      expect(extractUrlRouteStops('?focus=sol')).toBeNull();
    });

    it('extracts journeyOption ID from URL query search strings', () => {
      expect(extractUrlJourneyOptionId('?route=sol,tau-ceti&journeyOption=fusion-01c')).toBe(
        'fusion-01c',
      );
      expect(extractUrlJourneyOptionId('?route=sol,tau-ceti')).toBeNull();
    });

    it('builds directions trigger href with default origins and preserves current search', () => {
      expect(
        buildDirectionsTriggerHref({
          focusedId: 'tau-ceti',
          viewScope: 'galaxy',
        }),
      ).toBe('/galaxy?focus=tau-ceti&route=sol,tau-ceti');

      expect(
        buildDirectionsTriggerHref({
          focusedId: 'sol',
          viewScope: 'galaxy',
        }),
      ).toBe('/galaxy?focus=sol&route=sol,sol');

      expect(
        buildDirectionsTriggerHref({
          focusedId: 'tau-ceti',
          viewScope: 'galaxy',
          currentPathname: '/galaxy',
          currentSearch: '?q=tau&focus=tau-ceti',
        }),
      ).toBe('/galaxy?q=tau&focus=tau-ceti&route=sol,tau-ceti');

      expect(
        buildDirectionsTriggerHref({
          focusedId: 'mars',
          systemId: 'sol',
          viewScope: 'system',
        }),
      ).toBe('/system/sol?route=earth,mars');
    });
  });

  describe('buildJourneyPlan', () => {
    it('builds comprehensive interstellar JourneyPlan with relativistic options', () => {
      const plan = buildJourneyPlan({
        stops: ['sol', 'tau-ceti'],
        corpus: SAMPLE_BENCHMARK_CORPUS,
      });

      expect(plan).not.toBeNull();
      if (!plan) return;

      expect(plan.title).toBe('Sol → Tau Ceti');
      expect(plan.domain).toBe('interstellar');
      expect(plan.totalDistance?.unit).toBe('ly');
      expect(plan.totalDistance?.value).toBe(11.8);
      expect(plan.totalCommsOneWay?.unit).toBe('yr');
      expect(plan.totalCommsRoundTrip?.unit).toBe('yr');
      expect(plan.options.length).toBeGreaterThanOrEqual(3);
      expect(plan.options.map((o) => o.id)).toContain('torchship-1g');
      expect(plan.options.map((o) => o.id)).toContain('antimatter-0.1c');
      expect(plan.chordLegs).toHaveLength(1);
      expect(plan.steps[0].secondaryGeometry).toEqual({
        kind: 'elevation',
        deltaZ: {
          value: expect.any(Number),
          unit: 'pc',
          secondaryValue: expect.any(Number),
          secondaryUnit: 'ly',
        },
      });
      expect((plan.steps[0] as any).secondaryGeometryLabel).toBeUndefined();
      expect(plan.options[0].stats.elevationOrRange).toEqual({
        kind: 'single-leg',
        geometry: plan.steps[0].secondaryGeometry,
      });
      expect((plan.options[0].stats as any).elevationOrRangeLabel).toBeUndefined();
    });

    it('builds comprehensive intra-system JourneyPlan with brachistochrone and Hohmann options', () => {
      const plan = buildJourneyPlan({
        stops: ['earth', 'mars'],
        corpus: SAMPLE_BENCHMARK_CORPUS,
      });
      expect(plan).not.toBeNull();
      if (!plan) return;

      expect(plan.title).toBe('Earth → Mars');
      expect(plan.domain).toBe('intra-system');
      expect(plan.totalDistance?.unit).toBe('AU');
      expect(plan.totalDistance?.value).toBe(1.82);
      expect(plan.totalCommsOneWay?.unit).toBe('min');
      expect(plan.options.map((o) => o.id)).toContain('torchship-1g');
      expect(plan.options.map((o) => o.id)).toContain('hohmann-transfer');
      expect(plan.steps[0].secondaryGeometry).toEqual({
        kind: 'orbital-range',
        min: {
          value: expect.any(Number),
          unit: 'AU',
          secondaryValue: expect.any(Number),
          secondaryUnit: 'M km',
        },
        max: {
          value: expect.any(Number),
          unit: 'AU',
          secondaryValue: expect.any(Number),
          secondaryUnit: 'M km',
        },
      });
      expect((plan.steps[0] as any).secondaryGeometryLabel).toBeUndefined();
      expect(plan.options[0].stats.elevationOrRange).toEqual({
        kind: 'single-leg',
        geometry: plan.steps[0].secondaryGeometry,
      });
      expect((plan.options[0].stats as any).elevationOrRangeLabel).toBeUndefined();
    });

    it('supports multi-stop routes with cumulative distance and multiple chord legs', () => {
      const plan = buildJourneyPlan({
        stops: ['sol', 'proxima-centauri', 'sirius'],
        corpus: SAMPLE_BENCHMARK_CORPUS,
      });
      expect(plan).not.toBeNull();
      if (!plan) return;

      expect(plan.title).toBe('Sol → Proxima Centauri → Sirius');
      expect(plan.steps).toHaveLength(2);
      expect(plan.chordLegs).toHaveLength(2);
      expect(plan.focusedStopIds).toEqual(['sol', 'proxima-centauri', 'sirius']);
      expect(plan.options[0].stats.elevationOrRange).toEqual({
        kind: 'multi-leg',
        legCount: 2,
        domain: 'interstellar',
      });
    });
  });
});
