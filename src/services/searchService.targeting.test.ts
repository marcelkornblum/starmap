import { describe, expect, it } from 'vitest';
import {
  buildEntityOrbitTargetHref,
  extractUrlSelectSlugs,
} from './searchService';
import { LAYER_INDEX_ENTRIES } from '../../tests/fixtures/layerFixtures';

describe('searchService - Centralised Orbit-Context View Targeting (DEC-038)', () => {
  it('routes layer manifests to galaxy overview card URL', () => {
    const res = buildEntityOrbitTargetHref({
      id: 'overlay-recent-discoveries',
      name: 'Newly Discovered Worlds',
      entityKind: 'layer',
    });
    expect(res).toEqual({
      targetView: 'galaxy',
      href: '/galaxy?select=layer:recent-discoveries&layer=recent-discoveries',
    });
  });

  it('routes systems and galactic structures to galaxy view', () => {
    const sysRes = buildEntityOrbitTargetHref({
      id: 'gaia-2452378776434477184',
      name: 'Tau Ceti',
      entityKind: 'star-system',
    });
    expect(sysRes).toEqual({
      targetView: 'galaxy',
      href: '/galaxy?focus=tau-ceti',
    });

    const structRes = buildEntityOrbitTargetHref({
      id: 'm13-hercules',
      name: 'Great Hercules Cluster',
      entityKind: 'galactic-structure',
    });
    expect(structRes).toEqual({
      targetView: 'galaxy',
      href: '/galaxy?focus=great-hercules-cluster',
    });
  });

  it('routes stars, planets, dwarf-planets, belts, and minor bodies to system view with ?focus=<itemSlug>', () => {
    const planetRes = buildEntityOrbitTargetHref({
      id: 'lhs-1140-b',
      name: 'LHS 1140 b',
      entityKind: 'planet',
      systemId: 'lhs-1140',
      systemName: 'LHS 1140',
    });
    expect(planetRes).toEqual({
      targetView: 'system',
      href: '/system/lhs-1140?focus=lhs-1140-b',
    });

    const beltRes = buildEntityOrbitTargetHref({
      id: 'main-asteroid-belt',
      name: 'Main Asteroid Belt',
      entityKind: 'belt',
      systemId: 'sol',
      systemName: 'Sol',
      isSolarSystem: true,
    });
    expect(beltRes).toEqual({
      targetView: 'system',
      href: '/system/sol?focus=main-asteroid-belt',
    });
  });

  it('routes planetary moons to planetary view with /planet/<parentPlanetSlug>?focus=<moonSlug>', () => {
    const moonRes = buildEntityOrbitTargetHref({
      id: 'europa',
      name: 'Europa',
      entityKind: 'moon',
      systemId: 'sol',
      parentBodyId: 'jupiter',
    });
    expect(moonRes).toEqual({
      targetView: 'planet',
      href: '/planet/jupiter?focus=europa',
    });

    const phoebeRes = buildEntityOrbitTargetHref({
      id: 'phoebe',
      name: 'Phoebe',
      entityKind: 'minor-body',
      systemId: 'sol',
      parentBodyId: 'saturn',
    });
    expect(phoebeRes).toEqual({
      targetView: 'planet',
      href: '/planet/saturn?focus=phoebe',
    });
  });

  it('attaches compound &layer=<layerSlug>:<itemSlug> when layerId is present', () => {
    const itemRes = buildEntityOrbitTargetHref({
      id: 'trappist-1-e',
      name: 'TRAPPIST-1 e',
      entityKind: 'planet',
      systemId: 'trappist-1',
      systemName: 'TRAPPIST-1',
      layerId: 'overlay-jwst-targets',
    });
    expect(itemRes).toEqual({
      targetView: 'system',
      href: '/system/trappist-1?focus=trappist-1-e&select=layer:jwst-targets&layer=jwst-targets:trappist-1-e',
    });

    const moonInLayer = buildEntityOrbitTargetHref({
      id: 'europa',
      name: 'Europa',
      entityKind: 'moon',
      systemId: 'sol',
      parentBodyId: 'jupiter',
      layerId: 'overlay-extreme-worlds',
    });
    expect(moonInLayer).toEqual({
      targetView: 'planet',
      href: '/planet/jupiter?focus=europa&select=layer:extreme-worlds&layer=extreme-worlds:europa',
    });
  });

  it('extracts structured select slugs via extractUrlSelectSlugs helper', () => {
    const parsed = extractUrlSelectSlugs(
      '?select=tag:habitable-candidate,layer:recent-discoveries,star-type:g,sol',
      LAYER_INDEX_ENTRIES,
    );
    expect(parsed.tags).toEqual(['habitable-candidate']);
    expect(parsed.layerSlugs).toEqual(['overlay-recent-discoveries']);
    expect(parsed.starTypes).toEqual(['g']);
    expect(parsed.entitySlugs).toEqual(['sol']);
  });
});
