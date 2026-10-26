import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { CONSTELLATION_LAYER_MANIFESTS } from '../content/layers/overlay-constellations';
import { LAYER_MANIFESTS } from '../content/layers';
import { collectUnresolvedLayerTargets } from '../src/utils/datasetLayerCodec';
import { resolveSelectedSystemsFromLayer } from '../src/services/searchService';
import { resolveActiveLayerCard } from '../src/services/layerCardService';

describe('Scientific Overlay Constellation Layers', () => {
  it('exports at least 20-25 constellation layer manifests with kind: scientific-overlay', () => {
    expect(CONSTELLATION_LAYER_MANIFESTS.length).toBeGreaterThanOrEqual(20);
    expect(CONSTELLATION_LAYER_MANIFESTS.length).toBe(25);

    for (const manifest of CONSTELLATION_LAYER_MANIFESTS) {
      expect(manifest.layerId).toMatch(/^overlay-constellation-[a-z0-9-]+$/);
      expect(manifest.kind).toBe('scientific-overlay');
      expect(manifest.version).toBe(1);
      expect(manifest.title).toBeTruthy();
      expect(manifest.subtitle).toBeTruthy();
      expect(manifest.description).toBeTruthy();
      expect(manifest.aliases).toBeTruthy();
      expect(manifest.source).toBeDefined();
      expect(Object.keys(manifest.entries).length).toBeGreaterThanOrEqual(3);

      for (const [key, entry] of Object.entries(manifest.entries)) {
        expect(entry.targetId).toBe(key);
        expect(entry.targetType).toBeDefined();
        expect(entry.systemId).toBeDefined();
        expect(entry.text).toBeTruthy();
        expect(entry.confidence).toBe('confirmed');
      }
    }
  });

  it('spreads all constellation layers into root LAYER_MANIFESTS', () => {
    for (const conLayer of CONSTELLATION_LAYER_MANIFESTS) {
      expect(LAYER_MANIFESTS.some((l) => l.layerId === conLayer.layerId)).toBe(true);
    }
  });

  it('guarantees zero unresolved targets for all constellation layers against core/stars search indices', () => {
    const rawCore = fs.readFileSync(path.resolve('public/data/search/core.json'), 'utf-8');
    const rawStars = fs.readFileSync(path.resolve('public/data/search/stars.json'), 'utf-8');
    const rawStructures = fs.readFileSync(path.resolve('public/data/search/structures.json'), 'utf-8');
    const core = JSON.parse(rawCore).d as Array<{ i: string; n: string }>;
    const stars = JSON.parse(rawStars).d as Array<{ i: string; n: string }>;
    const structures = JSON.parse(rawStructures).d as Array<{ i: string; n: string }>;

    const realNames = new Map<string, string>();
    for (const e of core) realNames.set(e.i, e.n);
    for (const e of stars) realNames.set(e.i, e.n);
    for (const e of structures) realNames.set(e.i, e.n);

    const unresolved = collectUnresolvedLayerTargets(CONSTELLATION_LAYER_MANIFESTS, realNames);
    expect(unresolved).toEqual([]);
  });

  it('resolves member systems via resolveSelectedSystemsFromLayer for Orion, Ursa Major, and Centaurus', () => {
    const orionSystems = resolveSelectedSystemsFromLayer('overlay-constellation-orion', [], LAYER_MANIFESTS);
    expect(orionSystems.length).toBeGreaterThanOrEqual(9);
    expect(orionSystems.some((s) => s.id === 'hip-27989')).toBe(true); // Betelgeuse
    expect(orionSystems.some((s) => s.id === 'hip-24436')).toBe(true); // Rigel

    const umaSystems = resolveSelectedSystemsFromLayer('overlay-constellation-ursa-major', [], LAYER_MANIFESTS);
    expect(umaSystems.length).toBeGreaterThanOrEqual(10);
    expect(umaSystems.some((s) => s.id === 'hip-54061')).toBe(true); // Dubhe
    expect(umaSystems.some((s) => s.id === 'hip-67301')).toBe(true); // Alkaid

    const cenSystems = resolveSelectedSystemsFromLayer('overlay-constellation-centaurus', [], LAYER_MANIFESTS);
    expect(cenSystems.length).toBeGreaterThanOrEqual(5);
    expect(cenSystems.some((s) => s.id === 'hip-71683')).toBe(true); // Rigil Kentaurus
    expect(cenSystems.some((s) => s.id === 'gaia-5853498713190525696')).toBe(true); // Proxima Centauri
  });

  it('resolves active layer card overview and items for constellation layers', () => {
    const orionCard = resolveActiveLayerCard({
      layerParam: 'overlay-constellation-orion',
      currentPathname: '/galaxy',
      currentSearch: '?layer=overlay-constellation-orion',
      layers: LAYER_MANIFESTS,
    });
    expect(orionCard).not.toBeNull();
    expect(orionCard?.mode).toBe('overview');
    if (orionCard?.mode === 'overview') {
      expect(orionCard.layerId).toBe('overlay-constellation-orion');
      expect(orionCard.title).toBe('Orion (The Hunter)');
      expect(orionCard.kind).toBe('scientific-overlay');
      expect(orionCard.itemCount).toBe(9);
    }

    const betelgeuseCard = resolveActiveLayerCard({
      layerParam: 'overlay-constellation-orion:hip-27989',
      currentPathname: '/galaxy',
      currentSearch: '?layer=overlay-constellation-orion:hip-27989',
      layers: LAYER_MANIFESTS,
    });
    expect(betelgeuseCard).not.toBeNull();
    expect(betelgeuseCard?.mode).toBe('item');
    if (betelgeuseCard?.mode === 'item') {
      expect(betelgeuseCard.layerId).toBe('overlay-constellation-orion');
      expect(betelgeuseCard.itemSlug).toBe('hip-27989');
      expect(betelgeuseCard.subtitle).toContain('Alpha Orionis');
    }
  });
});
