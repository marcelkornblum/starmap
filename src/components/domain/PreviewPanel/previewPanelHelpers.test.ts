import { describe, expect, it } from 'vitest';
import type { FocusedPreviewSummary } from '../../../services/details/detailsNavigationTypes';
import { EARTH_OBLIQUITY_DEG } from '../../../utils/astroCoordinates';
import { buildCameraBasis } from '../../../utils/orientationProjectionMath';
import {
  OUTER_PREVIEW_BASIS,
  SVG_CX,
  SVG_CY,
  buildPreviewProjection,
  resolvePreviewPlane,
  resolvePrimarySymbolType,
} from './previewPanelHelpers';

const solSystemFixture: FocusedPreviewSummary = {
  targetId: 'sol',
  targetName: 'Sol System',
  systemId: 'sol',
  systemName: 'Sol',
  focusedKind: 'system',
  previewMode: 'system-orbits',
  detailsHref: '/system/sol',
  reticleType: 'stellar-system',
  primaryInclinationDeg: 60.19,
  orbitElements: [
    {
      id: 'mercury',
      name: 'Mercury',
      kind: 'planet',
      symbolType: 'terrestrial',
      orbitRank: 1,
      semiMajorAxisAu: 0.387,
      inHabitableZone: false,
    },
    {
      id: 'earth',
      name: 'Earth',
      kind: 'planet',
      symbolType: 'terrestrial',
      orbitRank: 2,
      semiMajorAxisAu: 1.0,
      inHabitableZone: true,
    },
    {
      id: 'jupiter',
      name: 'Jupiter',
      kind: 'planet',
      symbolType: 'gas-giant',
      orbitRank: 3,
      semiMajorAxisAu: 5.204,
      inHabitableZone: false,
    },
    {
      id: 'uranus',
      name: 'Uranus',
      kind: 'planet',
      symbolType: 'ice-giant',
      orbitRank: 4,
      semiMajorAxisAu: 19.218,
      inHabitableZone: false,
    },
  ],
};

const unmeasuredExoplanetFixture: FocusedPreviewSummary = {
  targetId: 'tau-ceti',
  targetName: 'Tau Ceti',
  systemId: 'tau-ceti',
  systemName: 'Tau Ceti',
  focusedKind: 'system',
  previewMode: 'system-orbits',
  detailsHref: '/system/tau-ceti',
  reticleType: 'stellar-system',
  primaryInclinationDeg: 0,
  orbitElements: [
    {
      id: 'tau-ceti-e',
      name: 'Tau Ceti e',
      kind: 'planet',
      symbolType: 'terrestrial',
      orbitRank: 1,
      semiMajorAxisAu: 0.538,
      inHabitableZone: true,
    },
  ],
};

const earthPlanetFixture: FocusedPreviewSummary = {
  targetId: 'earth',
  targetName: 'Earth',
  systemId: 'sol',
  systemName: 'Sol',
  focusedKind: 'planet',
  previewMode: 'planetary-system',
  detailsHref: '/planet/earth',
  reticleType: 'terrestrial',
  primaryInclinationDeg: 23.44,
  orbitElements: [
    {
      id: 'iss',
      name: 'ISS',
      kind: 'spacecraft',
      symbolType: 'spacecraft',
      orbitRank: 1,
      inHabitableZone: false,
    },
    {
      id: 'moon',
      name: 'Moon',
      kind: 'moon',
      symbolType: 'moon',
      orbitRank: 2,
      inHabitableZone: false,
    },
  ],
};

const uranusPlanetFixture: FocusedPreviewSummary = {
  targetId: 'uranus',
  targetName: 'Uranus',
  systemId: 'sol',
  systemName: 'Sol',
  focusedKind: 'planet',
  previewMode: 'planetary-system',
  detailsHref: '/planet/uranus',
  reticleType: 'ice-giant',
  primaryInclinationDeg: 97.77,
  orbitElements: [
    {
      id: 'titania',
      name: 'Titania',
      kind: 'moon',
      symbolType: 'moon',
      orbitRank: 1,
      inHabitableZone: false,
    },
  ],
};

describe('previewPanelHelpers', () => {
  describe('resolvePreviewPlane', () => {
    it('resolves Sol system inclination to 60.19° relative to Galactic Plane', () => {
      const plane = resolvePreviewPlane(solSystemFixture);
      expect(plane.parentLabel).toBe('Galactic Plane');
      expect(plane.targetLabel).toBe('System Plane');
      expect(plane.tiltDeg).toBeCloseTo(60.19, 4);
      expect(plane.nodeDeg).toBe(0);
    });

    it('resolves unmeasured exoplanet system inclination to neutral 0°', () => {
      const plane = resolvePreviewPlane(unmeasuredExoplanetFixture);
      expect(plane.parentLabel).toBe('Galactic Plane');
      expect(plane.targetLabel).toBe('System Plane');
      expect(plane.tiltDeg).toBe(0);
      expect(plane.nodeDeg).toBe(0);
    });

    it('preserves real planetary obliquity including sub-0.5° and 0° (e.g. Mercury 0.03°) and falls back to Earth obliquity only when undefined', () => {
      const earthPlane = resolvePreviewPlane(earthPlanetFixture);
      expect(earthPlane.parentLabel).toBe('System Plane');
      expect(earthPlane.targetLabel).toBe('Equatorial Plane');
      expect(earthPlane.tiltDeg).toBeCloseTo(23.44, 4);

      const mercuryPlane = resolvePreviewPlane({
        ...earthPlanetFixture,
        targetId: 'mercury',
        targetName: 'Mercury',
        primaryInclinationDeg: 0.03,
      });
      expect(mercuryPlane.tiltDeg).toBeCloseTo(0.03, 4);
      expect(mercuryPlane.nodeDeg).toBe(0);

      const zeroTiltPlane = resolvePreviewPlane({
        ...earthPlanetFixture,
        primaryInclinationDeg: 0,
      });
      expect(zeroTiltPlane.tiltDeg).toBe(0);
      expect(zeroTiltPlane.nodeDeg).toBe(0);

      const defaultEarthPlane = resolvePreviewPlane({
        ...earthPlanetFixture,
        primaryInclinationDeg: undefined,
      });
      expect(defaultEarthPlane.tiltDeg).toBeCloseTo(EARTH_OBLIQUITY_DEG, 4);
    });

    it('resolves Uranus axial tilt to 97.77°', () => {
      const uranusPlane = resolvePreviewPlane(uranusPlanetFixture);
      expect(uranusPlane.parentLabel).toBe('System Plane');
      expect(uranusPlane.targetLabel).toBe('Equatorial Plane');
      expect(uranusPlane.tiltDeg).toBeCloseTo(97.77, 4);
    });

    it('resolves object-orbit inclination directly or defaults to 0°', () => {
      const ceresPlane = resolvePreviewPlane({
        targetId: 'ceres',
        targetName: '1 Ceres',
        systemId: 'sol',
        systemName: 'Sol',
        focusedKind: 'minor-body',
        previewMode: 'object-orbit',
        primaryInclinationDeg: 10.59,
        orbitElements: [],
      });
      expect(ceresPlane).toEqual({
        parentLabel: 'Reference Plane',
        targetLabel: 'Orbital Plane',
        tiltDeg: 10.59,
        nodeDeg: 0,
      });

      const flatPlane = resolvePreviewPlane({
        targetId: 'orion-nebula',
        targetName: 'Orion Nebula',
        systemId: 'orion-nebula',
        systemName: 'Orion Nebula',
        focusedKind: 'structure',
        previewMode: 'object-orbit',
        orbitElements: [],
      });
      expect(flatPlane.tiltDeg).toBe(0);
    });
  });

  describe('resolvePrimarySymbolType', () => {
    it('prefers explicit reticleType when provided', () => {
      expect(resolvePrimarySymbolType(solSystemFixture)).toBe('stellar-system');
      expect(resolvePrimarySymbolType(earthPlanetFixture)).toBe('terrestrial');
      expect(resolvePrimarySymbolType(uranusPlanetFixture)).toBe('ice-giant');
    });

    it('falls back to terrestrial for planetary-system and star for system-orbits/object-orbit', () => {
      expect(
        resolvePrimarySymbolType({
          ...earthPlanetFixture,
          reticleType: undefined,
        }),
      ).toBe('terrestrial');
      expect(
        resolvePrimarySymbolType({
          ...solSystemFixture,
          reticleType: undefined,
        }),
      ).toBe('star');
      expect(
        resolvePrimarySymbolType({
          targetId: 'ceres',
          targetName: '1 Ceres',
          systemId: 'sol',
          systemName: 'Sol',
          focusedKind: 'minor-body',
          previewMode: 'object-orbit',
          orbitElements: [],
        }),
      ).toBe('star');
    });
  });

  describe('buildPreviewProjection', () => {
    it('projects fixed outer basis with origin at SVG centre and two concentric rings on tilted plane', () => {
      const projection = buildPreviewProjection(solSystemFixture);

      expect(projection.origin.x).toBeCloseTo(SVG_CX, 6);
      expect(projection.origin.y).toBeCloseTo(SVG_CY, 6);
      expect(projection.primarySymbolType).toBe('stellar-system');
      expect(projection.concentricRings).toHaveLength(2);
      expect(projection.parentRing.polygonPoints.split(' ').length).toBe(64);
      expect(projection.targetRing.polygonPoints.split(' ').length).toBe(64);
      expect(projection.targetRing.polygonPoints).not.toBe(projection.parentRing.polygonPoints);
      expect(projection.concentricRings[0].polygonPoints.split(' ').length).toBe(56);
      expect(projection.concentricRings[1].polygonPoints.split(' ').length).toBe(56);
      expect(projection.concentricRings[0].polygonPoints).not.toBe(
        projection.concentricRings[1].polygonPoints,
      );
    });

    it('uses OUTER_PREVIEW_BASIS by default and supports custom camera basis override', () => {
      const defaultProj = buildPreviewProjection(solSystemFixture);
      const explicitDefaultProj = buildPreviewProjection(solSystemFixture, OUTER_PREVIEW_BASIS);
      expect(defaultProj.targetRing.polygonPoints).toBe(explicitDefaultProj.targetRing.polygonPoints);

      const customBasis = buildCameraBasis([0, -25, 18], [0, 0, 0], [0, 0, 1]);
      const customProj = buildPreviewProjection(solSystemFixture, customBasis);
      expect(customProj.targetRing.polygonPoints).not.toBe(defaultProj.targetRing.polygonPoints);
    });

    it('projects child bodies with resolved symbol types sorted ascending by camera depth', () => {
      const projection = buildPreviewProjection(solSystemFixture);

      expect(projection.bodies).toHaveLength(4);
      expect(projection.bodies.map((b) => b.symbolType).sort()).toEqual([
        'gas-giant',
        'ice-giant',
        'terrestrial',
        'terrestrial',
      ]);

      for (let i = 1; i < projection.bodies.length; i++) {
        expect(projection.bodies[i].point.depth).toBeGreaterThanOrEqual(
          projection.bodies[i - 1].point.depth,
        );
      }

      const earthBody = projection.bodies.find((b) => b.id === 'earth');
      expect(earthBody?.inHabitableZone).toBe(true);
    });

    it('resolves fallback symbol types when orbitElements omit symbolType', () => {
      const projection = buildPreviewProjection({
        ...earthPlanetFixture,
        orbitElements: [
          { id: 's1', name: 'Star', kind: 'star', orbitRank: 1, inHabitableZone: false },
          { id: 'p1', name: 'Planet', kind: 'planet', orbitRank: 2, inHabitableZone: false },
          { id: 'd1', name: 'Dwarf', kind: 'dwarf-planet', orbitRank: 3, inHabitableZone: false },
          { id: 'm1', name: 'Moon', kind: 'moon', orbitRank: 4, inHabitableZone: false },
          { id: 'b1', name: 'Belt', kind: 'belt', orbitRank: 5, inHabitableZone: false },
          { id: 'sc1', name: 'Probe', kind: 'spacecraft', orbitRank: 6, inHabitableZone: false },
          { id: 'mb1', name: 'Asteroid', kind: 'minor-body', orbitRank: 7, inHabitableZone: false },
        ],
      });

      const byId = new Map(projection.bodies.map((b) => [b.id, b.symbolType]));
      expect(byId.get('s1')).toBe('star');
      expect(byId.get('p1')).toBe('terrestrial');
      expect(byId.get('d1')).toBe('dwarf-planet');
      expect(byId.get('m1')).toBe('moon');
      expect(byId.get('b1')).toBe('belt');
      expect(byId.get('sc1')).toBe('spacecraft');
      expect(byId.get('mb1')).toBe('asteroid');
    });
  });
});
