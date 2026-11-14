import { describe, expect, it } from 'vitest';
import * as detailsService from './detailsService';

describe('detailsService barrel re-exports (DEC-035)', () => {
  it('re-exports all functions and types from details submodules', () => {
    // hazardsAndComposition
    expect(typeof detailsService.decodeSystemHazards).toBe('function');
    expect(typeof detailsService.decodePlanetHazards).toBe('function');
    expect(typeof detailsService.formatDiskKindLabel).toBe('function');

    // navigationAndCamera
    expect(typeof detailsService.buildGalaxySystemNavigationHref).toBe('function');
    expect(typeof detailsService.buildEntityOrbitTargetHref).toBe('function');
    expect(typeof detailsService.buildSystemViewBreadcrumbs).toBe('function');
    expect(typeof detailsService.buildPlanetViewBreadcrumbs).toBe('function');

    // focusedEntityDetails
    expect(typeof detailsService.buildFocusedEntityDetails).toBe('function');

    // galacticAperture
    expect(typeof detailsService.resolveGalacticInstrumentAperture).toBe('function');
    expect(typeof detailsService.extractGalaxyBodies).toBe('function');
    expect(typeof detailsService.mergeActiveStarsIntoCorpus).toBe('function');

    // bodiesAndSchematics
    expect(typeof detailsService.buildSystemOrbitalSchematic).toBe('function');
    expect(typeof detailsService.buildSystemBodiesSummary).toBe('function');
    expect(typeof detailsService.buildPlanetaryBodiesSummary).toBe('function');

    // minimapAndPreview
    expect(typeof detailsService.buildFocusedPreviewSummary).toBe('function');
    expect(typeof detailsService.buildGalaxyMinimapOrientation).toBe('function');
    expect(typeof detailsService.buildSystemMinimapOrientation).toBe('function');
    expect(typeof detailsService.buildPlanetMinimapOrientation).toBe('function');
  });
});
