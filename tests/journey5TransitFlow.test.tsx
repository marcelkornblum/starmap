// @vitest-environment jsdom
import { createElement, type ReactElement } from 'react';
import { render } from '@testing-library/react';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { SpatialEntityProvider } from '../src/components/canvas/entity/SpatialEntityContext';
import { createSpatialEntityStore } from '../src/components/canvas/entity/SpatialEntityStore';
import {
  CanvasLayer,
  ControlBar,
  DetailsPanel,
} from '../src/components/domain';
import {
  buildCenterEntityHref,
  buildFocusedEntityDetails,
  buildGalaxyMinimapOrientation,
  buildPlanetMinimapOrientation,
  buildSystemMinimapOrientation,
  extractUrlSceneCameraState,
  type PlanetaryBodiesSummary,
  type SceneCameraUrlState,
  type SystemBodiesSummary,
} from '../src/services/detailsService';
import { GalaxyView } from '../src/views/GalaxyView';
import { PlanetView } from '../src/views/PlanetView';
import { SearchView } from '../src/views/SearchView';
import { SystemView } from '../src/views/SystemView';
import {
  annotationRecordsFor,
  resetLayerRuntime,
  seedAllLayerData,
} from './layerFixtures';
import { SAMPLE_CORPUS } from './searchFixtures';

const renderToHtml = (element: ReactElement): string =>
  render(createElement(SpatialEntityProvider, null, element)).container.innerHTML;

describe('Journey 5: Transit Flow - ControlBar & Cross-View Overlays (DEC-019, DEC-020)', () => {
  it('DEC-019: <ControlBar /> renders time controller, mode group, and shortcuts', () => {
    const html = renderToHtml(createElement(ControlBar, { scope: 'galaxy' }));
    expect(html).toContain('data-testid="control-bar"');
    expect(html).toContain('data-scope="galaxy"');
    expect(html).toContain('data-testid="control-bar-time-controller"');
    expect(html).toContain('data-testid="control-bar-play-pause"');
    expect(html).toContain('data-testid="control-bar-time-scrubber"');
    expect(html).toContain('data-testid="control-bar-datetime-picker"');
    expect(html).toContain('data-testid="control-bar-mode-group"');
    expect(html).toContain('data-testid="control-bar-projection-3d"');
    expect(html).toContain('data-testid="control-bar-projection-top-down"');
    expect(html).toContain('data-testid="control-bar-toggle-orbits"');
    expect(html).toContain('data-testid="control-bar-toggle-grid"');
    expect(html).toContain('data-testid="control-bar-toggle-labels"');
    expect(html).toContain('data-testid="control-bar-shortcuts-list"');
    expect(html).toContain('Search');
    expect(html).toContain('Play/Pause');
    expect(html).toContain('Reset View');
    expect(html).toContain('Clear Focus');
  });

  it('DEC-020: mounts <CanvasLayer />, <ControlBar />, and scoped <Search.Panel /> across views', () => {
    const directCanvasHtml = renderToHtml(createElement(CanvasLayer, { scope: 'galaxy' }));
    expect(directCanvasHtml).toContain('data-testid="canvas-layer"');
    expect(directCanvasHtml).toContain('data-scope="galaxy"');

    const store = createSpatialEntityStore();

    // GalaxyView
    const galaxyHtml = renderToHtml(
      createElement(
        SpatialEntityProvider,
        { store },
        createElement(GalaxyView, {
          initialCorpus: SAMPLE_CORPUS,
          locationPathname: '/galaxy',
          locationSearch: '',
        }),
      ),
    );
    expect(galaxyHtml).toContain('data-testid="canvas-layer"');
    expect(galaxyHtml).toContain('data-scope="galaxy"');
    expect(galaxyHtml).toContain('data-testid="control-bar"');
    expect(galaxyHtml).toContain('data-testid="search-panel"');
    expect(galaxyHtml).toContain('data-scope="galaxy"');

    // SystemView
    const systemHtml = renderToHtml(
      createElement(
        SpatialEntityProvider,
        { store },
        createElement(SystemView, {
          initialCorpus: SAMPLE_CORPUS,
          locationPathname: '/system/sol',
          locationSearch: '',
        }),
      ),
    );
    expect(systemHtml).toContain('data-testid="canvas-layer"');
    expect(systemHtml).toContain('data-scope="system"');
    expect(systemHtml).toContain('data-target-id="sol"');
    expect(systemHtml).toContain('data-testid="control-bar"');
    expect(systemHtml).toContain('data-testid="search-panel"');
    expect(systemHtml).toContain('data-scope="system"');

    // PlanetView
    const planetHtml = renderToHtml(
      createElement(
        SpatialEntityProvider,
        { store },
        createElement(PlanetView, {
          initialCorpus: SAMPLE_CORPUS,
          locationPathname: '/planet/earth',
          locationSearch: '',
        }),
      ),
    );
    expect(planetHtml).toContain('data-testid="canvas-layer"');
    expect(planetHtml).toContain('data-scope="planet"');
    expect(planetHtml).toContain('data-target-id="earth"');
    expect(planetHtml).toContain('data-testid="control-bar"');
    expect(planetHtml).toContain('data-testid="search-panel"');
    expect(planetHtml).toContain('data-scope="planet"');

    // SearchView
    const searchHtml = renderToHtml(createElement(SearchView));
    expect(searchHtml).toContain('data-testid="search-panel"');
    expect(searchHtml).toContain('data-scope="search"');
  });
});

describe('Journey 5: Transit Flow - 3D View Reference Point, Camera URL State & Detent Swap (DEC-021, DEC-022)', () => {
  beforeAll(seedAllLayerData);
  afterAll(resetLayerRuntime);

  it('DEC-021: extractUrlSceneCameraState extracts center and relative spherical / cartesian camera parameters', () => {
    // Empty search string
    expect(extractUrlSceneCameraState('')).toEqual({});
    expect(extractUrlSceneCameraState('?')).toEqual({});

    // Full camera parameters
    const parsed = extractUrlSceneCameraState(
      '?center=tau-ceti&x=10.5&y=-20.2&z=30&az=45.5&el=-15.2&dist=250.75&zoom=3',
    );
    expect(parsed).toEqual({
      center: 'tau-ceti',
      x: 10.5,
      y: -20.2,
      z: 30,
      az: 45.5,
      el: -15.2,
      dist: 250.75,
      zoom: 3,
    });

    // Zero angles and partial cartesian
    const zeroState = extractUrlSceneCameraState('?az=0&el=0&dist=0&x=0');
    expect(zeroState.az).toBe(0);
    expect(zeroState.el).toBe(0);
    expect(zeroState.dist).toBe(0);
    expect(zeroState.x).toBe(0);
    expect(zeroState.y).toBeUndefined();

    // Invalid / non-numeric params
    const invalidState = extractUrlSceneCameraState('?az=invalid&dist=NaN&center=');
    expect(invalidState.az).toBeUndefined();
    expect(invalidState.dist).toBeUndefined();
    expect(invalidState.center).toBeUndefined();
  });

  it('DEC-021: buildCenterEntityHref constructs valid center URL for galaxy, system, and planet scopes', () => {
    expect(buildCenterEntityHref('galaxy', undefined, undefined)).toBeUndefined();
    expect(buildCenterEntityHref('galaxy', undefined, 'tau-ceti')).toBe(
      '/galaxy?center=tau-ceti&focus=tau-ceti',
    );
    expect(buildCenterEntityHref('system', 'sol', 'earth')).toBe(
      '/system/sol?center=earth&focus=earth',
    );
    expect(buildCenterEntityHref('planet', 'earth', 'moon')).toBe(
      '/planet/earth?center=moon&focus=moon',
    );
    // Fallback if scopeTargetId is omitted in system/planet scopes
    expect(buildCenterEntityHref('system', undefined, 'tau-ceti')).toBe(
      '/galaxy?center=tau-ceti&focus=tau-ceti',
    );
  });

  it('DEC-021: buildFocusedEntityDetails populates centerHref', () => {
    const details = buildFocusedEntityDetails({
      focusedEntity: {
        id: 'tau-ceti',
        name: 'Tau Ceti',
        position: [-0.94, 2.37, -2.93],
        classification: 'stellar-system',
      },
      corpus: SAMPLE_CORPUS,
    });
    expect(details?.centerHref).toBe('/galaxy?center=tau-ceti&focus=tau-ceti');

    const systemPlanetDetails = buildFocusedEntityDetails({
      focusedEntity: {
        id: 'earth',
        name: 'Earth',
        position: [0, 0, 0],
        classification: 'terrestrial',
      },
      corpus: SAMPLE_CORPUS,
      urlSystemSlug: 'sol',
    });
    expect(systemPlanetDetails?.centerHref).toBe('/system/sol?center=earth&focus=earth');
  });

  it('DEC-021: buildGalaxyMinimapOrientation, buildSystemMinimapOrientation, and buildPlanetMinimapOrientation reflect cameraState and centerEntity', () => {
    const cameraState: SceneCameraUrlState = {
      center: 'tau-ceti',
      az: 120,
      el: 45,
      dist: 300,
    };
    const centerEntity = {
      id: 'tau-ceti',
      name: 'Tau Ceti',
      position: new THREE.Vector3(-0.94, 2.37, -2.93),
      classification: 'stellar-system' as const,
    };

    // Galaxy
    const galaxyOrientation = buildGalaxyMinimapOrientation(
      undefined,
      [],
      null,
      cameraState,
      centerEntity,
    );
    expect(galaxyOrientation.anchorId).toBe('tau-ceti');
    expect(galaxyOrientation.anchorName).toBe('Tau Ceti');
    expect(galaxyOrientation.coordinatesPc).toEqual([-0.94, 2.37, -2.93]);
    expect(galaxyOrientation.cameraAzimuthDeg).toBe(120);
    expect(galaxyOrientation.cameraElevationDeg).toBe(45);
    expect(galaxyOrientation.cameraDistance).toBe(300);

    // System
    const dummySystemBodies: SystemBodiesSummary = {
      scope: 'system',
      systemId: 'sol',
      systemName: 'Sol',
      systemHref: '/system/sol',
      stars: [],
      planets: [
        {
          id: 'earth',
          name: 'Earth',
          href: '/system/sol?focus=earth',
          composition: 'terrestrial',
          isHabitableCandidate: true,
          semiMajorAxisAu: 1.0,
        },
      ],
      moonsAndDwarfPlanets: [],
      minorBodiesAndSpacecraft: [],
      canonAnnotations: [],
    };
    const systemOrientation = buildSystemMinimapOrientation(
      dummySystemBodies,
      null,
      null,
      undefined,
      [],
      { center: 'earth', az: 120, el: 45, dist: 300 },
    );
    expect(systemOrientation.anchorId).toBe('earth');
    expect(systemOrientation.anchorName).toBe('Earth');
    expect(systemOrientation.cameraAzimuthDeg).toBe(120);
    expect(systemOrientation.cameraElevationDeg).toBe(45);
    expect(systemOrientation.cameraDistance).toBe(300);

    // Planet
    const dummyPlanetaryBodies: PlanetaryBodiesSummary = {
      scope: 'planet',
      planetId: 'earth',
      planetName: 'Earth',
      planetHref: '/planet/earth',
      systemId: 'sol',
      systemName: 'Sol',
      systemHref: '/system/sol',
      moons: [
        {
          id: 'moon',
          name: 'Moon',
          href: '/planet/earth?focus=moon',
          categoryLabel: 'Moon',
        },
      ],
      minorBodiesAndSpacecraft: [],
      canonAnnotations: [],
    };
    const planetOrientation = buildPlanetMinimapOrientation(
      dummyPlanetaryBodies,
      null,
      [],
      { center: 'moon', az: 120, el: 45, dist: 300 },
    );
    expect(planetOrientation.anchorId).toBe('moon');
    expect(planetOrientation.anchorName).toBe('Moon');
    expect(planetOrientation.cameraAzimuthDeg).toBe(120);
    expect(planetOrientation.cameraElevationDeg).toBe(45);
    expect(planetOrientation.cameraDistance).toBe(300);
  });

  it('DEC-021: <CanvasLayer /> renders data attributes for center and camera parameters', () => {
    const html = renderToHtml(
      createElement(CanvasLayer, {
        scope: 'galaxy',
        centerId: 'tau-ceti',
        centerCoordinates: [-0.94, 2.37, -2.93],
        cameraAzimuthDeg: 45,
        cameraElevationDeg: -15,
        cameraDistance: 150,
      }),
    );
    expect(html).toContain('data-testid="canvas-layer"');
    expect(html).toContain('data-center-id="tau-ceti"');
    expect(html).toContain('data-center-coords="-0.94,2.37,-2.93"');
    expect(html).toContain('data-camera-az="45"');
    expect(html).toContain('data-camera-el="-15"');
    expect(html).toContain('data-camera-dist="150"');
  });

  it('DEC-021: GalaxyView, SystemView, and PlanetView pass URL camera state to CanvasLayer and Minimap', () => {
    const store = createSpatialEntityStore();
    const searchString = '?center=tau-ceti&az=45&el=15&dist=100';

    const galaxyHtml = renderToHtml(
      createElement(
        SpatialEntityProvider,
        { store },
        createElement(GalaxyView, {
          initialCorpus: SAMPLE_CORPUS,
          locationPathname: '/galaxy',
          locationSearch: searchString,
        }),
      ),
    );
    expect(galaxyHtml).toContain('data-center-id="tau-ceti"');
    expect(galaxyHtml).toContain('data-camera-az="45"');
    expect(galaxyHtml).toContain('data-camera-el="15"');
    expect(galaxyHtml).toContain('data-camera-dist="100"');
  });

  it('DEC-022 & DEC-021: DetailsPanel renders Centre CTA and swaps Partial / Full detent contents', () => {
    const details = buildFocusedEntityDetails({
      focusedEntity: {
        id: 'earth',
        name: 'Earth',
        position: [0, 0, 0],
        classification: 'terrestrial',
      },
      corpus: SAMPLE_CORPUS,
      canonRecords: annotationRecordsFor(['earth', 'sol']),
      urlSystemSlug: 'sol',
      entityDetail: {
        kind: 'system',
        record: {
          id: 'sol',
          name: 'Sol',
          x: 0,
          y: 0,
          z: 0,
          dist: 0,
          sectorId: 'S-0',
          stars: [
            {
              id: 'sol',
              name: 'Sol',
              componentDesignation: 'A',
              spectralType: 'G2V',
              mag: -26.74,
              absmag: 4.83,
              massMsun: 1,
              radiusRsun: 1,
              luminosityLsun: 1,
              effectiveTempK: 5778,
            },
          ],
          planets: [
            {
              id: 'earth',
              name: 'Earth',
              letter: 'b',
              massMearth: 1.0,
              radiusRearth: 1.0,
              equilibriumTempK: 255,
              discoveryYear: 1900,
              orbit: {
                semiMajorAxis: 1.0,
                periodDays: 365.25,
                eccentricity: 0.0167,
                inclination: 0,
                ascendingNode: 0,
                argumentOfPeriapsis: 0,
                meanAnomaly: 0,
              },
            },
          ],
        },
      },
    });

    expect(details?.centerHref).toBe('/system/sol?center=earth&focus=earth');

    const html = renderToHtml(createElement(DetailsPanel, { details }));

    // 1. Centre button is rendered with centerHref
    expect(html).toContain('data-testid="details-button-center"');
    expect(html).toContain('href="/system/sol?center=earth&amp;focus=earth"');
    expect(html).toContain('Centre');

    // 2. Detents are present
    expect(html).toContain('data-testid="details-detent-partial"');
    expect(html).toContain('data-testid="details-detent-full"');

    const partialIdx = html.indexOf('data-testid="details-detent-partial"');
    const fullIdx = html.indexOf('data-testid="details-detent-full"');
    expect(partialIdx).toBeLessThan(fullIdx);

    // 3. DEC-022 layout:
    // In Partial detent (before fullIdx):
    // - CTAs (details-actions, details-button-center) are at the top
    // - Canon annotations (details-canon-section) follow immediately
    // - Orbiting bodies / Stars / Planets follow below
    const actionsIdx = html.indexOf('data-testid="details-cta-group"') !== -1
      ? html.indexOf('data-testid="details-cta-group"')
      : html.indexOf('data-testid="details-actions"');
    const canonIdx = html.indexOf('data-testid="details-canon-section"');
    const centerBtnIdx = html.indexOf('data-testid="details-button-center"');
    expect(actionsIdx).toBeGreaterThan(partialIdx);
    expect(centerBtnIdx).toBeGreaterThan(actionsIdx);
    expect(canonIdx).toBeGreaterThan(actionsIdx);
    expect(canonIdx).toBeLessThan(fullIdx);

    // In Full detent (after fullIdx):
    // - Intrinsic Telemetry (details-planet-telemetry-section)
    // - Astrometry (details-astrometry-section)
    const telemetryIdx = html.indexOf('data-testid="details-planet-telemetry-section"');
    const astrometryIdx = html.indexOf('data-testid="details-astrometry-section"');

    expect(telemetryIdx).toBeGreaterThan(fullIdx);
    expect(astrometryIdx).toBeGreaterThan(fullIdx);
  });
});
