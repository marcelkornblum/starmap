import { createElement } from 'react';
import { render, screen, act } from '@testing-library/react';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { SpatialEntityProvider } from '../src/components/canvas/entity/SpatialEntityProvider';
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
} from './fixtures/layerFixtures';
import { SAMPLE_CORPUS } from './fixtures/searchFixtures';

describe('Journey 5: Transit Flow - ControlBar & Cross-View Overlays (DEC-019, DEC-020)', () => {
  it('DEC-019: <ControlBar /> renders time controller, mode group, and shortcuts', () => {
    const { container } = render(createElement(ControlBar, { scope: 'galaxy' }));
    expect(screen.getByTestId('control-bar')).toBeDefined();
    expect(screen.getByTestId('control-bar').getAttribute('data-scope')).toBe('galaxy');
    expect(screen.getByTestId('control-bar-time-controller')).toBeDefined();
    expect(screen.getByTestId('control-bar-play-pause')).toBeDefined();
    expect(screen.getByTestId('control-bar-time-scrubber')).toBeDefined();
    expect(screen.getByTestId('control-bar-datetime-picker')).toBeDefined();
    expect(screen.getByTestId('control-bar-mode-group')).toBeDefined();
    expect(screen.getByTestId('control-bar-projection-3d')).toBeDefined();
    expect(screen.getByTestId('control-bar-projection-top-down')).toBeDefined();
    expect(screen.getByTestId('control-bar-toggle-orbits')).toBeDefined();
    expect(screen.getByTestId('control-bar-toggle-grid')).toBeDefined();
    expect(screen.getByTestId('control-bar-toggle-labels')).toBeDefined();
    expect(screen.getByTestId('control-bar-shortcuts-list')).toBeDefined();
    expect(container.textContent).toContain('Search');
    expect(container.textContent).toContain('Play/Pause');
    expect(container.textContent).toContain('Reset View');
    expect(container.textContent).toContain('Clear Focus');
  });

  it('DEC-020: mounts <CanvasLayer />, <ControlBar />, and scoped <Search.Panel /> across views', async () => {
    const { container: directCanvasContainer, unmount: unmountCanvas } = render(
      createElement(CanvasLayer, { scope: 'galaxy' }),
    );
    expect(directCanvasContainer.querySelector('[data-testid="canvas-layer"]')).not.toBeNull();
    expect(directCanvasContainer.querySelector('[data-scope="galaxy"]')).not.toBeNull();
    unmountCanvas();

    const store = createSpatialEntityStore();

    // GalaxyView
    let galaxyContainer: HTMLElement;
    let unmountGalaxy: () => void;
    await act(async () => {
      const res = render(
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
      galaxyContainer = res.container;
      unmountGalaxy = res.unmount;
    });
    expect(galaxyContainer!.querySelector('[data-testid="canvas-layer"]')).not.toBeNull();
    expect(galaxyContainer!.querySelector('[data-scope="galaxy"]')).not.toBeNull();
    expect(galaxyContainer!.querySelector('[data-testid="control-bar"]')).not.toBeNull();
    expect(galaxyContainer!.querySelector('[data-testid="search-panel"]')).not.toBeNull();
    unmountGalaxy!();

    // SystemView
    let systemContainer: HTMLElement;
    let unmountSystem: () => void;
    await act(async () => {
      const res = render(
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
      systemContainer = res.container;
      unmountSystem = res.unmount;
    });
    expect(systemContainer!.querySelector('[data-testid="canvas-layer"]')).not.toBeNull();
    expect(systemContainer!.querySelector('[data-scope="system"]')).not.toBeNull();
    expect(systemContainer!.querySelector('[data-target-id="sol"]')).not.toBeNull();
    expect(systemContainer!.querySelector('[data-testid="control-bar"]')).not.toBeNull();
    expect(systemContainer!.querySelector('[data-testid="search-panel"]')).not.toBeNull();
    unmountSystem!();

    // PlanetView
    let planetContainer: HTMLElement;
    let unmountPlanet: () => void;
    await act(async () => {
      const res = render(
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
      planetContainer = res.container;
      unmountPlanet = res.unmount;
    });
    expect(planetContainer!.querySelector('[data-testid="canvas-layer"]')).not.toBeNull();
    expect(planetContainer!.querySelector('[data-scope="planet"]')).not.toBeNull();
    expect(planetContainer!.querySelector('[data-target-id="earth"]')).not.toBeNull();
    expect(planetContainer!.querySelector('[data-testid="control-bar"]')).not.toBeNull();
    expect(planetContainer!.querySelector('[data-testid="search-panel"]')).not.toBeNull();
    unmountPlanet!();

    // SearchView
    const { container: searchContainer, unmount: unmountSearch } = render(
      createElement(
        SpatialEntityProvider,
        { store },
        createElement(SearchView),
      ),
    );
    expect(searchContainer.querySelector('[data-testid="search-panel"]')).not.toBeNull();
    expect(searchContainer.querySelector('[data-scope="search"]')).not.toBeNull();
    unmountSearch();
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
    const { container, unmount } = render(
      createElement(CanvasLayer, {
        scope: 'galaxy',
        centerId: 'tau-ceti',
        centerCoordinates: [-0.94, 2.37, -2.93],
        cameraAzimuthDeg: 45,
        cameraElevationDeg: -15,
        cameraDistance: 150,
      }),
    );
    const canvasLayer = container.querySelector('[data-testid="canvas-layer"]');
    expect(canvasLayer).not.toBeNull();
    expect(canvasLayer?.getAttribute('data-center-id')).toBe('tau-ceti');
    expect(canvasLayer?.getAttribute('data-center-coords')).toBe('-0.94,2.37,-2.93');
    expect(canvasLayer?.getAttribute('data-camera-az')).toBe('45');
    expect(canvasLayer?.getAttribute('data-camera-el')).toBe('-15');
    expect(canvasLayer?.getAttribute('data-camera-dist')).toBe('150');
    unmount();
  });

  it('DEC-021: GalaxyView, SystemView, and PlanetView pass URL camera state to CanvasLayer and Minimap', async () => {
    const store = createSpatialEntityStore();
    const searchString = '?center=tau-ceti&az=45&el=15&dist=100';

    let galaxyContainer: HTMLElement;
    let unmountGalaxy: () => void;
    await act(async () => {
      const res = render(
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
      galaxyContainer = res.container;
      unmountGalaxy = res.unmount;
    });

    const canvasLayer = galaxyContainer!.querySelector('[data-testid="canvas-layer"]');
    expect(canvasLayer?.getAttribute('data-center-id')).toBe('tau-ceti');
    expect(canvasLayer?.getAttribute('data-camera-az')).toBe('45');
    expect(canvasLayer?.getAttribute('data-camera-el')).toBe('15');
    expect(canvasLayer?.getAttribute('data-camera-dist')).toBe('100');
    unmountGalaxy!();
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

    const { container, unmount } = render(createElement(DetailsPanel, { details }));

    // 1. Centre button is rendered with centerHref
    const centerBtn = container.querySelector('[data-testid="details-button-center"]');
    expect(centerBtn).not.toBeNull();
    expect(centerBtn?.getAttribute('href')).toBe('/system/sol?center=earth&focus=earth');
    expect(centerBtn?.textContent).toContain('Centre');

    // 2. Detents are present
    const partialDetent = container.querySelector('[data-testid="details-detent-partial"]');
    const fullDetent = container.querySelector('[data-testid="details-detent-full"]');
    expect(partialDetent).not.toBeNull();
    expect(fullDetent).not.toBeNull();

    // 3. Partial detent contains CTA and canon
    expect(partialDetent?.querySelector('[data-testid="details-button-center"]')).not.toBeNull();
    expect(partialDetent?.querySelector('[data-testid="details-canon-section"]')).not.toBeNull();

    // 4. Full detent contains telemetry and astrometry
    expect(fullDetent?.querySelector('[data-testid="details-planet-telemetry-section"]')).not.toBeNull();
    expect(fullDetent?.querySelector('[data-testid="details-astrometry-section"]')).not.toBeNull();
    unmount();
  });
});
