import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import {
  getCorpusSystemFirstChildMap,
  resolveGalaxyCenterCoordinates,
  type ResolveGalaxyCenterCoordinatesParams,
} from './galaxyCenterResolution';
import type { SpatialEntityDefinition } from '../types/spatial';
import type { CompactSearchEntry } from '../utils/compactDataTypes';
import type { SystemSummaryNode } from '../types/astro';
import { mergeActiveStarsIntoCorpus } from '../services/details/activeStarsCorpus';

describe('galaxyCenterResolution (unit:node)', () => {
  describe('getCorpusSystemFirstChildMap', () => {
    it('builds and caches map from corpus entries with system property "s"', () => {
      const corpus: CompactSearchEntry[] = [
        { i: 'planet-1', n: 'Planet One', s: 'Tau Ceti', p: [1, 2, 3] },
        { i: 'planet-2', n: 'Planet Two', s: 'Tau Ceti', p: [1.1, 2.1, 3.1] },
        { i: 'star-1', n: 'Sol Star', p: [0, 0, 0] },
      ];

      const map1 = getCorpusSystemFirstChildMap(corpus);
      expect(map1.get('tau-ceti')?.i).toBe('planet-1');
      expect(map1.get('Tau Ceti')?.i).toBe('planet-1');
      expect(map1.get('sol-star')).toBeUndefined();

      // Verify WeakMap cache returns exact same map instance
      const map2 = getCorpusSystemFirstChildMap(corpus);
      expect(map2).toBe(map1);
    });
  });

  describe('resolveGalaxyCenterCoordinates', () => {
    const baseParams: ResolveGalaxyCenterCoordinatesParams = {
      cameraState: {},
      urlFocusSlug: null,
      canvasFocusedSlugs: new Set(),
      pendingCenterSlug: null,
      focusedEntity: null,
      centerEntity: null,
      selectedEntities: [],
      apertureCorpus: [],
    };

    it('returns cameraState x, y, z immediately if defined', () => {
      const result = resolveGalaxyCenterCoordinates({
        ...baseParams,
        cameraState: { x: 10, y: 20, z: 30 },
      });
      expect(result).toEqual([10, 20, 30]);
    });

    it('returns focusedEntity coords when matching center slug (Array coords)', () => {
      const focused: SpatialEntityDefinition = {
        id: 'sirius',
        name: 'Sirius',
        classification: 'star',
        position: [8.6, 1.2, -3.4],
      };
      const result = resolveGalaxyCenterCoordinates({
        ...baseParams,
        center: 'sirius',
        focusedEntity: focused,
      });
      expect(result).toEqual([8.6, 1.2, -3.4]);
    });

    it('returns focusedEntity coords when matching center slug (THREE.Vector3 coords)', () => {
      const focused: SpatialEntityDefinition = {
        id: 'sirius',
        name: 'Sirius',
        classification: 'star',
        position: new THREE.Vector3(8.6, 1.2, -3.4),
      };
      const result = resolveGalaxyCenterCoordinates({
        ...baseParams,
        center: 'sirius',
        focusedEntity: focused,
      });
      expect(result).toEqual([8.6, 1.2, -3.4]);
    });

    it('permits Sol reference target at [0, 0, 0] from focusedEntity', () => {
      const sol: SpatialEntityDefinition = {
        id: 'sol',
        name: 'Sol',
        classification: 'star',
        position: [0, 0, 0],
      };
      const result = resolveGalaxyCenterCoordinates({
        ...baseParams,
        center: 'sol',
        focusedEntity: sol,
      });
      expect(result).toEqual([0, 0, 0]);
    });

    it('ignores non-Sol [0, 0, 0] coordinates from focusedEntity and falls through', () => {
      const unplaced: SpatialEntityDefinition = {
        id: 'vega',
        name: 'Vega',
        classification: 'star',
        position: [0, 0, 0],
      };
      const result = resolveGalaxyCenterCoordinates({
        ...baseParams,
        center: 'vega',
        focusedEntity: unplaced,
      });
      expect(result).toBeUndefined();
    });

    it('returns centerEntity position if present and valid', () => {
      const centerEntity: SpatialEntityDefinition = {
        id: 'alpha-centauri',
        name: 'Alpha Centauri',
        classification: 'stellar-system',
        position: [1.3, 0.4, -0.2],
      };
      const result = resolveGalaxyCenterCoordinates({
        ...baseParams,
        centerEntity,
      });
      expect(result).toEqual([1.3, 0.4, -0.2]);
    });

    it('finds matching entity in selectedEntities', () => {
      const selected: SpatialEntityDefinition[] = [
        {
          id: 'betelgeuse',
          name: 'Betelgeuse',
          classification: 'star',
          position: [500, 100, -200],
        },
      ];
      const result = resolveGalaxyCenterCoordinates({
        ...baseParams,
        center: 'betelgeuse',
        selectedEntities: selected,
      });
      expect(result).toEqual([500, 100, -200]);
    });

    it('resolves directly from apertureCorpus entry with position', () => {
      const corpus: CompactSearchEntry[] = [
        { i: 'polaris', n: 'Polaris', p: [400, 20, 10] },
      ];
      const result = resolveGalaxyCenterCoordinates({
        ...baseParams,
        center: 'polaris',
        apertureCorpus: corpus,
      });
      expect(result).toEqual([400, 20, 10]);
    });

    it('resolves child from apertureCorpus through host system position', () => {
      const corpus: CompactSearchEntry[] = [
        { i: 'tau-ceti-host', n: 'Tau Ceti', p: [3.15, 1.54, -1.0] },
        { i: 'tau-ceti-e', n: 'Tau Ceti e', s: 'tau-ceti-host' },
      ];
      const result = resolveGalaxyCenterCoordinates({
        ...baseParams,
        center: 'tau-ceti-e',
        apertureCorpus: corpus,
      });
      expect(result).toEqual([3.15, 1.54, -1.0]);
    });

    it('resolves through getCorpusSystemFirstChildMap when centerSlug matches child system', () => {
      const corpus: CompactSearchEntry[] = [
        { i: 'host-star', n: 'Epsilon Eridani', p: [3.2, 0.5, -0.8] },
        { i: 'planet-b', n: 'AEgir', s: 'Epsilon Eridani' },
      ];
      const result = resolveGalaxyCenterCoordinates({
        ...baseParams,
        pendingCenterSlug: 'epsilon-eridani',
        apertureCorpus: corpus,
      });
      expect(result).toEqual([3.2, 0.5, -0.8]);
    });

    it('distinguishes canvas click focus from URL navigation focus', () => {
      const canvasFocused = new Set(['vega']);
      // Canvas click focus without explicit center should not default center to vega
      const result = resolveGalaxyCenterCoordinates({
        ...baseParams,
        urlFocusSlug: 'vega',
        canvasFocusedSlugs: canvasFocused,
        pendingCenterSlug: null,
      });
      expect(result).toBeUndefined();
    });

    it('returns undefined when applying ?focus= without ?center= and isColdLoadFocus is false', () => {
      const corpus: CompactSearchEntry[] = [
        { i: 'vega', n: 'Vega', p: [7.7, 1.1, 2.2] },
      ];
      const result = resolveGalaxyCenterCoordinates({
        ...baseParams,
        urlFocusSlug: 'vega',
        isColdLoadFocus: false,
        apertureCorpus: corpus,
      });
      expect(result).toBeUndefined();
    });

    it('parses x,y,z coordinate string in center query param per DEC-R014a', () => {
      const result = resolveGalaxyCenterCoordinates({
        ...baseParams,
        center: '12.5,42.0,-10.8',
      });
      expect(result).toEqual([12.5, 42.0, -10.8]);
    });

    it('returns undefined if no matching entity or coordinates are found', () => {
      const result = resolveGalaxyCenterCoordinates({
        ...baseParams,
        center: 'unknown-object',
      });
      expect(result).toBeUndefined();
    });

    it('reuses base getCorpusSystemFirstChildMap in O(1) when layered corpus extras have no parent system s', () => {
      const baseCorpus: CompactSearchEntry[] = [
        { i: 'tau-ceti', n: 'Tau Ceti', p: [3.15, 1.54, -1.0] },
        { i: 'tau-ceti-e', n: 'Tau Ceti e', s: 'tau-ceti' },
      ];
      const baseMap = getCorpusSystemFirstChildMap(baseCorpus);
      const extraStar: SystemSummaryNode = {
        id: 'new-star',
        name: 'New Star',
        x: 5,
        y: 5,
        z: 5,
        dist: 8.66,
        mag: 6,
        absmag: 6,
        spect: 'K0V',
        starCount: 1,
        planetCount: 0,
        hasHabitableCandidate: false,
        sectorId: 'sector_+000_+000_+000',
      };
      const layered = mergeActiveStarsIntoCorpus(baseCorpus, [extraStar]);
      expect(getCorpusSystemFirstChildMap(layered)).toBe(baseMap);
    });
  });
});
