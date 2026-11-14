import { describe, expect, it } from 'vitest';
import {
  buildSystemOrbitalSchematic,
  buildSystemBodiesSummary,
  buildPlanetaryBodiesSummary,
} from './bodiesAndSchematics';
import { extractGalaxyBodies, resolveGalacticInstrumentAperture } from './galacticAperture';
import type { CompactSearchEntry } from '../../utils/compactDataCodec';

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
  {
    i: 'tau-ceti-e',
    k: 2,
    n: 'Tau Ceti e',
    s: 'tau-ceti',
    p: [-3.1, -0.4, -2.0],
    z: 1,
  },
];

describe('bodiesAndSchematics', () => {
  describe('extractGalaxyBodies', () => {
    it('filters strictly to non-passive systems (focused, selected, active) and excludes passive background stars', () => {
      const summary = extractGalaxyBodies({
        corpus: SAMPLE_GALAXY_CORPUS,
        focusedEntity: {
          id: 'sol',
          name: 'Sol',
          position: [0, 0, 0],
          classification: 'stellar-system',
        },
      });

      expect(summary.scope).toBe('galaxy');
      expect(summary.focusedSystemId).toBe('sol');
      expect(summary.focusedSystemName).toBe('Sol');
      const systemIds = summary.systems.map((s) => s.id);
      expect(systemIds).toContain('sol');
      expect(systemIds).toContain('alpha-centauri');
      expect(systemIds).toContain('barnard-star');
      expect(systemIds).toContain('tau-ceti');
      expect(systemIds).not.toContain('distant-star');
      expect(summary.systems.every((s) => s.tier === 'focused' || s.tier === 'selected' || s.tier === 'active')).toBe(true);
    });

    it('promotes systems in selectedEntities to selected tier when inside aperture and excludes off-aperture selections', () => {
      const summary = extractGalaxyBodies({
        corpus: SAMPLE_GALAXY_CORPUS,
        selectedEntities: [
          {
            id: 'alpha-centauri',
            name: 'Alpha Centauri',
            position: [-0.47, 1.32, -0.33],
            classification: 'stellar-system',
          },
          {
            id: 'distant-star',
            name: 'Distant Star',
            position: [50, 0, 0],
            classification: 'stellar-system',
          },
        ],
      });

      const alpha = summary.systems.find((s) => s.id === 'alpha-centauri');
      expect(alpha).toBeDefined();
      expect(alpha?.tier).toBe('selected');

      const distant = summary.systems.find((s) => s.id === 'distant-star');
      expect(distant).toBeUndefined();
    });

    it('sorts systems ascending by distance from focused system and populates focus-relative distances', () => {
      const summary = extractGalaxyBodies({
        corpus: SAMPLE_GALAXY_CORPUS,
        focusedEntity: {
          id: 'sol',
          name: 'Sol',
          position: [0, 0, 0],
          classification: 'stellar-system',
        },
      });

      expect(summary.systems[0].id).toBe('sol');
      expect(summary.systems[0].distanceFromFocusPc).toBe(0);
      expect(summary.systems[0].distanceFromFocusLy).toBe(0);

      expect(summary.systems[1].id).toBe('alpha-centauri');
      expect(summary.systems[1].distanceFromFocusPc).toBe(1.44);
      expect(summary.systems[1].distanceFromFocusLy).toBe(4.7);
      expect(summary.systems[1].distanceGuideHref).toBe('/guide/metrics/distance?focus=alpha-centauri');

      expect(summary.systems[2].id).toBe('barnard-star');
      expect(summary.systems[2].distanceFromFocusPc).toBe(1.88);

      expect(summary.systems[3].id).toBe('tau-ceti');
      expect(summary.systems[3].distanceFromFocusPc).toBe(3.71);
    });

    it('resolves parent system slug when child planet/star is focused on GalaxyView', () => {
      const summary = extractGalaxyBodies({
        corpus: SAMPLE_GALAXY_CORPUS,
        focusedEntity: {
          id: 'tau-ceti-e',
          name: 'Tau Ceti e',
          position: [-3.1, -0.4, -2.0],
          classification: 'terrestrial',
        },
      });

      expect(summary.focusedSystemId).toBe('tau-ceti');
      expect(summary.focusedSystemName).toBe('Tau Ceti');
      const tauCetiItem = summary.systems.find((s) => s.id === 'tau-ceti');
      expect(tauCetiItem?.tier).toBe('focused');
      expect(tauCetiItem?.distanceFromFocusPc).toBe(0);
    });

    it('omits distances when no system is focused and sorts ascending from aperture center', () => {
      const summary = extractGalaxyBodies({
        corpus: SAMPLE_GALAXY_CORPUS,
      });

      expect(summary.focusedSystemId).toBeUndefined();
      expect(summary.focusedSystemName).toBeUndefined();
      for (const sys of summary.systems) {
        expect(sys.distanceFromFocusPc).toBeUndefined();
        expect(sys.distanceFromFocusLy).toBeUndefined();
        expect(sys.distanceGuideHref).toBeUndefined();
      }
      expect(summary.systems[0].id).toBe('sol');
    });

    it('preserves query parameters like select, center, dist on system navigation href', () => {
      const summary = extractGalaxyBodies({
        corpus: SAMPLE_GALAXY_CORPUS,
        currentSearch: '?select=layer:halo&center=sol&dist=20',
      });

      const alpha = summary.systems.find((s) => s.id === 'alpha-centauri');
      expect(alpha?.href).toBe('/galaxy?focus=alpha-centauri&select=layer:halo&center=sol&dist=20');
    });

    it('extractGalaxyBodies reuses precomputed aperture directly', () => {
      const liveAperture = resolveGalacticInstrumentAperture({
        cameraState: { dist: 100, zoom: 2 },
        corpus: SAMPLE_GALAXY_CORPUS,
      });

      const summary = extractGalaxyBodies({
        corpus: SAMPLE_GALAXY_CORPUS,
        aperture: liveAperture,
      });

      expect(summary.apertureRadiusPc).toBe(liveAperture.apertureRadiusPc);
      expect(summary.centerCoordinatesPc).toEqual(liveAperture.centerCoordinatesPc);
    });
  });

  describe('buildSystemOrbitalSchematic', () => {
    it('interleaves stars, planets, and disks sorted by orbital radius', () => {
      const schematic = buildSystemOrbitalSchematic(
        {
          systemId: 'sol',
          systemName: 'Sol',
          stars: [
            {
              id: 'sol-star',
              name: 'Sol',
              componentDesignation: 'A',
              spectralType: 'G2V',
              mag: -26.74,
              absmag: 4.83,
            },
          ],
          planets: [
            {
              id: 'earth',
              name: 'Earth',
              letter: 'd',
              composition: 'terrestrial',
              isHabitableCandidate: true,
              semiMajorAxisAu: 1.0,
              periodDays: 365.25,
            },
            {
              id: 'jupiter',
              name: 'Jupiter',
              letter: 'e',
              composition: 'gas-giant',
              isHabitableCandidate: false,
              semiMajorAxisAu: 5.2,
              periodDays: 4333,
            },
          ],
          disks: [
            {
              id: 'asteroid-belt',
              name: 'Main Asteroid Belt',
              kind: 'asteroid-belt',
              kindLabel: 'Asteroid Belt',
              href: '/system/sol?focus=asteroid-belt',
              semiMajorAxisAu: 2.7,
              composition: 'Rocky & metallic planetesimals',
              innerRadiusAu: 2.1,
              outerRadiusAu: 3.3,
            },
          ],
        },
        [],
      );

      expect(schematic).not.toBeNull();
      expect(schematic!.items.length).toBe(4);
      // Order: Sol (star at 0 AU), Earth (1.0 AU), Asteroid Belt (2.7 AU), Jupiter (5.2 AU)
      expect(schematic!.items[0].id).toBe('sol-star');
      expect(schematic!.items[1].id).toBe('earth');
      expect(schematic!.items[2].id).toBe('asteroid-belt');
      expect(schematic!.items[3].id).toBe('jupiter');
    });
  });

  describe('buildSystemBodiesSummary & buildPlanetaryBodiesSummary', () => {
    it('returns null when details is not provided', () => {
      expect(buildSystemBodiesSummary({ details: null })).toBeNull();
      expect(buildPlanetaryBodiesSummary({ details: null })).toBeNull();
    });
  });
});
