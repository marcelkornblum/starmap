import { describe, expect, it } from 'vitest';
import {
  resolveGalacticInstrumentAperture,
  mergeActiveStarsIntoCorpus,
} from './galacticAperture';
import type { CompactSearchEntry } from '../../utils/compactDataCodec';
import type { SystemSummaryNode } from '../../types/astro';

const SAMPLE_GALAXY_CORPUS: readonly CompactSearchEntry[] = [
  {
    i: 'sol',
    n: 'Sol',
    p: [0, 0, 0],
    m: [-26.74, 'G2V', 8, 1],
    h: 1,
    c: 'stars',
  },
  {
    i: 'alpha-centauri',
    n: 'Alpha Centauri',
    p: [-0.47, 1.32, -0.33],
    m: [-0.27, 'G2V', 1, 1],
    c: 'stars',
  },
  {
    i: 'barnard-star',
    n: "Barnard's Star",
    p: [-0.05, 1.81, 0.49],
    m: [9.54, 'M4V', 0],
    c: 'stars',
  },
  {
    i: 'tau-ceti',
    n: 'Tau Ceti',
    p: [-3.1, -0.4, -2.0],
    m: [3.5, 'G8V', 4, 1],
    c: 'stars',
  },
  {
    i: 'distant-star',
    n: 'Distant Star',
    p: [50, 0, 0],
    m: [6.0, 'K0V', 0],
    c: 'stars',
  },
];

describe('galacticAperture', () => {
  describe('resolveGalacticInstrumentAperture', () => {
    it('computes apertureRadiusPc and apertureRadiusLy from cameraState dist and zoom', () => {
      const defaultAperture = resolveGalacticInstrumentAperture({
        corpus: SAMPLE_GALAXY_CORPUS,
      });
      expect(defaultAperture.centerId).toBe('sol');
      expect(defaultAperture.centerName).toBe('Sol');
      expect(defaultAperture.centerCoordinatesPc).toEqual([0, 0, 0]);
      expect(defaultAperture.apertureRadiusPc).toBe(10);
      expect(defaultAperture.apertureRadiusLy).toBe(32.62);

      const zoomedAperture = resolveGalacticInstrumentAperture({
        cameraState: { dist: 17.45, zoom: 1 },
        corpus: SAMPLE_GALAXY_CORPUS,
      });
      expect(zoomedAperture.apertureRadiusPc).toBe(5);

      const customOriginAperture = resolveGalacticInstrumentAperture({
        cameraState: { x: 10, y: 20, z: -5, center: 'Sector Hub' },
        corpus: SAMPLE_GALAXY_CORPUS,
      });
      expect(customOriginAperture.centerCoordinatesPc).toEqual([10, 20, -5]);
      expect(customOriginAperture.centerId).toBe('sector-hub');
      expect(customOriginAperture.centerName).toBe('Sector Hub');
    });

    it('identifies systems inside 3D instrument aperture sphere and excludes outer systems', () => {
      const aperture = resolveGalacticInstrumentAperture({
        corpus: SAMPLE_GALAXY_CORPUS,
      });
      expect(aperture.apertureIds.has('sol')).toBe(true);
      expect(aperture.apertureIds.has('alpha-centauri')).toBe(true);
      expect(aperture.apertureIds.has('barnard-star')).toBe(true);
      expect(aperture.apertureIds.has('tau-ceti')).toBe(true);
      expect(aperture.apertureIds.has('distant-star')).toBe(false);
    });

    it('respects live aperture center and radius overrides', () => {
      const aperture = resolveGalacticInstrumentAperture({
        corpus: SAMPLE_GALAXY_CORPUS,
        liveApertureCenterPc: [5, 15, 25],
        liveApertureRadiusPc: 42.18,
      });

      expect(aperture.centerCoordinatesPc).toEqual([5, 15, 25]);
      expect(aperture.apertureRadiusPc).toBe(42.18);
    });
  });

  describe('mergeActiveStarsIntoCorpus', () => {
    it('merges active stars with corpus deduplicating by ID', () => {
      const activeStars: SystemSummaryNode[] = [
        {
          id: 'alpha-centauri',
          name: 'Alpha Centauri',
          x: -0.47,
          y: 1.32,
          z: -0.33,
          dist: 1.3,
          mag: -0.27,
          absmag: 4.38,
          spect: 'G2V',
          starCount: 3,
          planetCount: 1,
          hasHabitableCandidate: false,
          sectorId: 'sector_-000_+001_-000',
        },
        {
          id: 'new-star',
          name: 'New Star',
          x: 2,
          y: 3,
          z: 4,
          dist: 5.38,
          mag: 5.0,
          absmag: 6.0,
          spect: 'K0V',
          starCount: 1,
          planetCount: 0,
          hasHabitableCandidate: false,
          sectorId: 'sector_+002_+003_+004',
        },
      ];

      const merged = mergeActiveStarsIntoCorpus(SAMPLE_GALAXY_CORPUS, activeStars);
      expect(merged.length).toBe(SAMPLE_GALAXY_CORPUS.length + 1);
      expect(merged.some((e) => e.i === 'new-star')).toBe(true);
    });
  });
});
