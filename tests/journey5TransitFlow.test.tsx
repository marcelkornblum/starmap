import { createElement } from 'react';
import { render, screen, act, within, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

vi.mock('@tanstack/react-router', () => ({
  useParams: vi.fn(() => ({})),
  useSearch: vi.fn(() => ({})),
  useRouter: vi.fn(() => undefined),
}));
import * as THREE from 'three';
import { SpatialEntityProvider } from '../src/components/canvas/entity/SpatialEntityProvider';
import { createSpatialEntityStore } from '../src/components/canvas/entity/SpatialEntityStore';
import { CanvasLayer } from '../src/components/domain/CanvasLayer';
import { ControlBar } from '../src/components/domain/ControlBar';
import { DetailsPanel } from '../src/components/domain/DetailsPanel';
import {
  buildCenterEntityHref,
  extractUrlSceneCameraState,
} from '../src/services/details/detailsCamera';
import { buildFocusedEntityDetails } from '../src/services/details/focusedEntityDetails';
import { buildGalaxyMinimapOrientation } from '../src/services/details/galaxyMinimap';
import { buildPlanetMinimapOrientation } from '../src/services/details/planetMinimap';
import { buildSystemMinimapOrientation } from '../src/services/details/systemMinimap';
import type {
  PlanetaryBodiesSummary,
  SystemBodiesSummary,
} from '../src/services/details/detailsHierarchyTypes';
import type { SceneCameraUrlState } from '../src/services/details/detailsNavigationTypes';
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
    render(createElement(ControlBar, { scope: 'galaxy' }));
    const controlBar = screen.getByTestId('control-bar');
    expect(controlBar).toBeInTheDocument();
    expect(controlBar).toHaveAttribute('data-scope', 'galaxy');
    expect(screen.getByTestId('control-bar-time-controller')).toBeInTheDocument();
    expect(screen.getByTestId('control-bar-play-pause')).toBeInTheDocument();
    expect(screen.getByTestId('control-bar-time-scrubber')).toBeInTheDocument();
    expect(screen.getByTestId('control-bar-datetime-picker')).toBeInTheDocument();
    expect(screen.getByTestId('control-bar-mode-group')).toBeInTheDocument();
    expect(screen.getByTestId('control-bar-projection-3d')).toBeInTheDocument();
    expect(screen.getByTestId('control-bar-projection-top-down')).toBeInTheDocument();
    expect(screen.getByTestId('control-bar-toggle-orbits')).toBeInTheDocument();
    expect(screen.getByTestId('control-bar-toggle-grid')).toBeInTheDocument();
    expect(screen.getByTestId('control-bar-toggle-labels')).toBeInTheDocument();
    const shortcuts = screen.getByTestId('control-bar-shortcuts-list');
    expect(shortcuts).toBeInTheDocument();
    expect(shortcuts).toHaveTextContent('Search');
    expect(shortcuts).toHaveTextContent('Play/Pause');
    expect(shortcuts).toHaveTextContent('Reset View');
    expect(shortcuts).toHaveTextContent('Clear Focus');
    cleanup();
  });

  it('DEC-020: mounts <CanvasLayer />, <ConsoleDock />, and scoped <Search.Panel /> across views without retired <ControlBar />', async () => {
    render(createElement(CanvasLayer, { scope: 'galaxy' }));
    const directCanvas = screen.getByTestId('canvas-layer');
    expect(directCanvas).toBeInTheDocument();
    expect(directCanvas).toHaveAttribute('data-scope', 'galaxy');
    cleanup();

    const store = createSpatialEntityStore();

    // GalaxyView
    await act(async () => {
      render(
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
    });
    const galaxyCanvas = screen.getByTestId('canvas-layer');
    expect(galaxyCanvas).toBeInTheDocument();
    expect(galaxyCanvas).toHaveAttribute('data-scope', 'galaxy');
    expect(screen.queryByTestId('control-bar')).toBeNull();
    expect(screen.getByTestId('console-dock')).toBeInTheDocument();
    expect(screen.getByTestId('search-panel')).toBeInTheDocument();
    cleanup();

    // SystemView
    await act(async () => {
      render(
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
    });
    const systemCanvas = screen.getByTestId('canvas-layer');
    expect(systemCanvas).toBeInTheDocument();
    expect(systemCanvas).toHaveAttribute('data-scope', 'system');
    expect(systemCanvas).toHaveAttribute('data-target-id', 'sol');
    expect(screen.queryByTestId('control-bar')).toBeNull();
    expect(screen.getByTestId('console-dock')).toBeInTheDocument();
    expect(screen.getByTestId('search-panel')).toBeInTheDocument();
    cleanup();

    // PlanetView
    await act(async () => {
      render(
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
    });
    const planetCanvas = screen.getByTestId('canvas-layer');
    expect(planetCanvas).toBeInTheDocument();
    expect(planetCanvas).toHaveAttribute('data-scope', 'planet');
    expect(planetCanvas).toHaveAttribute('data-target-id', 'earth');
    expect(screen.queryByTestId('control-bar')).toBeNull();
    expect(screen.getByTestId('console-dock')).toBeInTheDocument();
    expect(screen.getByTestId('search-panel')).toBeInTheDocument();
    cleanup();

    // SearchView
    render(
      createElement(
        SpatialEntityProvider,
        { store },
        createElement(SearchView),
      ),
    );
    expect(screen.getByTestId('console-dock')).toBeInTheDocument();
    const searchPanel = screen.getByTestId('search-panel');
    expect(searchPanel).toBeInTheDocument();
    expect(searchPanel).toHaveAttribute('data-scope', 'search');
    cleanup();
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
    expect(buildCenterEntityHref('system', undefined, 'tau-ceti')).toBeUndefined();
    expect(buildCenterEntityHref('planet', undefined, 'moon')).toBeUndefined();
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
    const { unmount } = render(
      createElement(CanvasLayer, {
        scope: 'galaxy',
        centerId: 'tau-ceti',
        centerCoordinates: [-0.94, 2.37, -2.93],
        cameraAzimuthDeg: 45,
        cameraElevationDeg: -15,
        cameraDistance: 150,
      }),
    );
    const canvasLayer = screen.getByTestId('canvas-layer');
    expect(canvasLayer).toBeInTheDocument();
    expect(canvasLayer).toHaveAttribute('data-center-id', 'tau-ceti');
    expect(canvasLayer).toHaveAttribute('data-center-coords', '-0.94,2.37,-2.93');
    expect(canvasLayer).toHaveAttribute('data-camera-az', '45');
    expect(canvasLayer).toHaveAttribute('data-camera-el', '-15');
    expect(canvasLayer).toHaveAttribute('data-camera-dist', '150');
    unmount();
  });

  it('DEC-021: GalaxyView, SystemView, and PlanetView pass URL camera state to CanvasLayer and Minimap', async () => {
    const store = createSpatialEntityStore();
    const searchString = '?center=tau-ceti&az=45&el=15&dist=100';

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
      unmountGalaxy = res.unmount;
    });

    const canvasLayer = screen.getByTestId('canvas-layer');
    expect(canvasLayer).toBeInTheDocument();
    expect(canvasLayer).toHaveAttribute('data-center-id', 'tau-ceti');
    expect(canvasLayer).toHaveAttribute('data-camera-az', '45');
    expect(canvasLayer).toHaveAttribute('data-camera-el', '15');
    expect(canvasLayer).toHaveAttribute('data-camera-dist', '100');
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

    const { unmount } = render(createElement(DetailsPanel, { details }));

    // 1. Centre button is rendered with centerHref
    const centerBtn = screen.getByTestId('details-button-center');
    expect(centerBtn).toBeInTheDocument();
    expect(centerBtn).toHaveAttribute('href', '/system/sol?center=earth&focus=earth');
    expect(centerBtn).toHaveTextContent('Centre on map');

    // 2. Detents are present
    const peekDetent = screen.getByTestId('details-detent-peek');
    const partialDetent = screen.getByTestId('details-detent-partial');
    const fullDetent = screen.getByTestId('details-detent-full');
    expect(peekDetent).toBeInTheDocument();
    expect(partialDetent).toBeInTheDocument();
    expect(fullDetent).toBeInTheDocument();

    // 3. Peek hero block contains CTA; partial detent contains canon
    expect(within(peekDetent).getByTestId('details-button-center')).toBeInTheDocument();
    expect(within(partialDetent).getByTestId('details-canon-section')).toBeInTheDocument();

    // 4. Full detent contains telemetry and astrometry
    expect(within(fullDetent).getByTestId('details-planet-telemetry-section')).toBeInTheDocument();
    expect(within(fullDetent).getByTestId('details-astrometry-section')).toBeInTheDocument();
    unmount();
  });
});
