import { describe, expect, it } from 'vitest';
import {
  extractGalaxyBodies,
  extractUrlSceneCameraState,
  mergeActiveStarsIntoCorpus,
  resolveGalacticInstrumentAperture,
} from '../src/services/detailsService';
import type { SystemSummaryNode } from '../src/types/astro';
import type { CompactSearchEntry } from '../src/utils/compactDataCodec';

const makeStar = (id: string, x: number, overrides: Partial<SystemSummaryNode> = {}): SystemSummaryNode => ({
  id,
  name: id.toUpperCase(),
  x,
  y: 0,
  z: 0,
  dist: Math.abs(x),
  mag: 5,
  absmag: 4,
  spect: 'K2V',
  starCount: 1,
  planetCount: 0,
  hasHabitableCandidate: false,
  sectorId: 'sector_+000_+000_+000',
  ...overrides,
});

const CORPUS: readonly CompactSearchEntry[] = [
  { i: 'sol', n: 'Sol', p: [0, 0, 0], m: [-26.74, 'G2V', 8, 1], c: 'stars' },
];

describe('mergeActiveStarsIntoCorpus', () => {
  it('returns the original corpus when there are no streamed active stars', () => {
    expect(mergeActiveStarsIntoCorpus(CORPUS, [])).toBe(CORPUS);
  });

  it('appends streamed stars as star entries and keeps corpus entries on id clashes', () => {
    const merged = mergeActiveStarsIntoCorpus(CORPUS, [
      makeStar('gaia-1', 3, { planetCount: 2, hasHabitableCandidate: true }),
      makeStar('sol', 0, { name: 'Duplicate Sol' }),
    ]);

    expect(merged.map((e) => e.i)).toEqual(['sol', 'gaia-1']);
    expect(merged[0]?.n).toBe('Sol');
    expect(merged[1]).toMatchObject({
      i: 'gaia-1',
      p: [3, 0, 0],
      m: [5, 'K2V', 2, 1],
      c: 'stars',
    });
  });
});

describe('streamed active stars drive aperture membership and the objects list', () => {
  it('marks every streamed star inside the aperture active and lists it; excludes stars outside', () => {
    const inside = makeStar('gaia-inside', 3);
    const alsoInside = makeStar('gaia-also-inside', 6);
    const outside = makeStar('gaia-outside', 30);
    const corpus = mergeActiveStarsIntoCorpus(CORPUS, [inside, alsoInside, outside]);

    const aperture = resolveGalacticInstrumentAperture({
      cameraState: extractUrlSceneCameraState(''),
      corpus,
      liveApertureCenterPc: [0, 0, 0],
      liveApertureRadiusPc: 10,
    });

    expect(aperture.apertureIds.has('gaia-inside')).toBe(true);
    expect(aperture.apertureIds.has('gaia-also-inside')).toBe(true);
    expect(aperture.apertureIds.has('gaia-outside')).toBe(false);

    const bodies = extractGalaxyBodies({ corpus, aperture });
    const listedIds = bodies.systems.map((s) => s.id);
    expect(listedIds).toEqual(expect.arrayContaining(['sol', 'gaia-inside', 'gaia-also-inside']));
    expect(listedIds).not.toContain('gaia-outside');
  });

  it('activates more stars as the aperture grows when zooming out', () => {
    const stars = [makeStar('gaia-a', 3), makeStar('gaia-b', 12), makeStar('gaia-c', 25)];
    const corpus = mergeActiveStarsIntoCorpus(CORPUS, stars);

    const countActive = (radius: number): number =>
      resolveGalacticInstrumentAperture({
        cameraState: extractUrlSceneCameraState(''),
        corpus,
        liveApertureCenterPc: [0, 0, 0],
        liveApertureRadiusPc: radius,
      }).apertureIds.size;

    expect(countActive(5)).toBeLessThan(countActive(15));
    expect(countActive(15)).toBeLessThan(countActive(30));
  });

  it('enforces all-or-nothing active cutoff at maxActiveEntities and computes ceilingApertureRadiusPc', () => {
    const starA = makeStar('gaia-1', 2);
    const starB = makeStar('gaia-2', 4);
    const starC = makeStar('gaia-3', 6);
    // Sol is at 0 pc, gaia-1 at 2 pc, gaia-2 at 4 pc, gaia-3 at 6 pc (4 total inside 10 pc)
    const corpus = mergeActiveStarsIntoCorpus(CORPUS, [starA, starB, starC]);

    // When candidates (4) exceed maxActiveEntities (2): zero stars become active, but ceiling radius is populated
    const overCutoff = resolveGalacticInstrumentAperture({
      corpus,
      liveApertureCenterPc: [0, 0, 0],
      liveApertureRadiusPc: 10,
      maxActiveEntities: 2,
    });

    expect(overCutoff.apertureIds.size).toBe(0);
    expect(overCutoff.ceilingApertureRadiusPc).toBe(2);

    // When candidates (4) are within maxActiveEntities (4): all candidates become active
    const exactCutoff = resolveGalacticInstrumentAperture({
      corpus,
      liveApertureCenterPc: [0, 0, 0],
      liveApertureRadiusPc: 10,
      maxActiveEntities: 4,
    });

    expect(exactCutoff.apertureIds.has('sol')).toBe(true);
    expect(exactCutoff.apertureIds.has('gaia-1')).toBe(true);
    expect(exactCutoff.apertureIds.has('gaia-2')).toBe(true);
    expect(exactCutoff.apertureIds.has('gaia-3')).toBe(true);
    expect(exactCutoff.ceilingApertureRadiusPc).toBe(6);

    // If maxActiveEntities exceeds count, ceilingApertureRadiusPc is null
    const uncapped = resolveGalacticInstrumentAperture({
      corpus,
      liveApertureCenterPc: [0, 0, 0],
      liveApertureRadiusPc: 10,
      maxActiveEntities: 10,
    });
    expect(uncapped.apertureIds.size).toBeGreaterThan(0);
    expect(uncapped.ceilingApertureRadiusPc).toBeNull();
  });

  describe('viewport-aware active cutoff (96 desktop / 60 tablet / 40 mobile)', () => {
    it('activates all stars when within desktop cutoff (96) and zero when exceeding 96', () => {
      // 96 stars at x=1..96, plus Sol at x=0 => 97 stars
      const stars96 = Array.from({ length: 96 }, (_, i) => makeStar(`gaia-${i + 1}`, (i + 1) * 0.1));
      const corpus96 = mergeActiveStarsIntoCorpus(CORPUS, stars96); // 97 stars total

      // Within cutoff: exactly 96 candidates inside radius
      const maxDistanceFor96 = 95 * 0.1 + 0.001; // covers Sol + gaia-1..gaia-95 = 96 stars
      const withinDesktop = resolveGalacticInstrumentAperture({
        corpus: corpus96,
        liveApertureCenterPc: [0, 0, 0],
        liveApertureRadiusPc: maxDistanceFor96,
        viewportWidthPx: 1440,
      });
      expect(withinDesktop.apertureIds.size).toBeGreaterThan(0);

      // Exceeds cutoff: all 97 candidates inside 10 pc
      const exceedsDesktop = resolveGalacticInstrumentAperture({
        corpus: corpus96,
        liveApertureCenterPc: [0, 0, 0],
        liveApertureRadiusPc: 10,
        viewportWidthPx: 1440,
      });
      expect(exceedsDesktop.apertureIds.size).toBe(0);
      expect(exceedsDesktop.ceilingApertureRadiusPc).not.toBeNull();
    });

    it('activates all stars when within mobile cutoff (40) and zero when exceeding 40', () => {
      // 40 stars at x=1..40, plus Sol at x=0 => 41 stars
      const stars40 = Array.from({ length: 40 }, (_, i) => makeStar(`gaia-m-${i + 1}`, (i + 1) * 0.1));
      const corpus40 = mergeActiveStarsIntoCorpus(CORPUS, stars40); // 41 stars total

      // Within cutoff: 40 candidates
      const maxDistanceFor40 = 39 * 0.1 + 0.001; // covers Sol + gaia-m-1..gaia-m-39 = 40 stars
      const withinMobile = resolveGalacticInstrumentAperture({
        corpus: corpus40,
        liveApertureCenterPc: [0, 0, 0],
        liveApertureRadiusPc: maxDistanceFor40,
        viewportWidthPx: 390,
      });
      expect(withinMobile.apertureIds.size).toBeGreaterThan(0);

      // Exceeds cutoff: 41 candidates
      const exceedsMobile = resolveGalacticInstrumentAperture({
        corpus: corpus40,
        liveApertureCenterPc: [0, 0, 0],
        liveApertureRadiusPc: 10,
        viewportWidthPx: 390,
      });
      expect(exceedsMobile.apertureIds.size).toBe(0);
      expect(exceedsMobile.ceilingApertureRadiusPc).not.toBeNull();
    });
  });

  it('strictly excludes off-aperture systems in extractGalaxyBodies even if focused or selected', () => {
    const inside = makeStar('gaia-inside', 3);
    const outside = makeStar('gaia-outside', 50);
    const corpus = mergeActiveStarsIntoCorpus(CORPUS, [inside, outside]);

    const aperture = resolveGalacticInstrumentAperture({
      corpus,
      liveApertureCenterPc: [0, 0, 0],
      liveApertureRadiusPc: 10,
    });

    const bodies = extractGalaxyBodies({
      corpus,
      aperture,
      focusedEntity: {
        id: 'gaia-outside',
        name: 'GAIA-OUTSIDE',
        position: [50, 0, 0],
        classification: 'star',
      },
      selectedEntities: [
        {
          id: 'gaia-inside',
          name: 'GAIA-INSIDE',
          position: [3, 0, 0],
          classification: 'star',
        },
        {
          id: 'gaia-outside',
          name: 'GAIA-OUTSIDE',
          position: [50, 0, 0],
          classification: 'star',
        },
      ],
    });

    const ids = bodies.systems.map((s) => s.id);
    expect(ids).toContain('sol');
    expect(ids).toContain('gaia-inside');
    expect(ids).not.toContain('gaia-outside');

    const insideItem = bodies.systems.find((s) => s.id === 'gaia-inside');
    expect(insideItem?.tier).toBe('selected');
  });
});
