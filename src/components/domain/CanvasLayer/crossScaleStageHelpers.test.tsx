import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createElement } from 'react';
import { render, screen } from '@testing-library/react';
import * as THREE from 'three';
import { useCameraStore } from '../../../stores/useCameraStore';
import { useUIStore } from '../../../stores/useUIStore';
import { createSpatialEntityStore } from '../../canvas/entity/SpatialEntityStore';
import {
  clearPendingCrossScaleArrival,
  hasPendingCrossScaleArrival,
  setPendingCrossScaleArrival,
} from '../../canvas/instrument/crossScaleArrivalState';
import {
  getCrossScaleInstrumentFade,
  resetCrossScaleInstrumentFade,
  setCrossScaleInstrumentFade,
} from '../../canvas/instrument/crossScaleFadeState';
import {
  clearCrossScalePlanePreview,
  getCrossScalePlanePreviewState,
  getCrossScaleSceneScale,
  resetCrossScaleSceneScale,
  setCrossScalePlanePreview,
  setCrossScaleSceneScale,
} from '../../canvas/instrument/crossScaleVisualState';
import {
  isMatchingSceneTarget,
  renderCommittedSpatialScene,
  resetAllCrossScaleVisualState,
  resolveDepartureTarget,
  resolveEntityPosition,
  resolveStageSwapProps,
  resolveTargetPlaneMetadata,
  snapshotPreDiveGalaxyCamera,
  type SpatialStageSceneProps,
} from './crossScaleStageHelpers';

vi.mock('../../canvas/scenes/GalacticSceneEntry', () => ({
  default: (props: { centerId?: string }) =>
    createElement('div', { 'data-testid': 'helper-galactic', 'data-center-id': props.centerId }),
  GalacticSceneContent: (props: { centerId?: string }) =>
    createElement('div', { 'data-testid': 'helper-galactic', 'data-center-id': props.centerId }),
}));

vi.mock('../../canvas/scenes/SystemSceneEntry', () => ({
  default: (props: { systemId?: string }) =>
    createElement('div', { 'data-testid': 'helper-system', 'data-system-id': props.systemId }),
  SystemSceneContent: (props: { systemId?: string }) =>
    createElement('div', { 'data-testid': 'helper-system', 'data-system-id': props.systemId }),
}));

vi.mock('../../canvas/scenes/PlanetarySceneEntry', () => ({
  default: (props: { planetId?: string }) =>
    createElement('div', { 'data-testid': 'helper-planet', 'data-planet-id': props.planetId }),
  PlanetarySceneContent: (props: { planetId?: string }) =>
    createElement('div', { 'data-testid': 'helper-planet', 'data-planet-id': props.planetId }),
}));

describe('crossScaleStageHelpers', () => {
  beforeEach(() => {
    useCameraStore.getState().reset();
    useUIStore.getState().resetUI();
    clearPendingCrossScaleArrival();
    resetCrossScaleInstrumentFade();
    clearCrossScalePlanePreview();
    resetCrossScaleSceneScale();
  });

  afterEach(() => {
    clearPendingCrossScaleArrival();
    resetCrossScaleInstrumentFade();
    clearCrossScalePlanePreview();
    resetCrossScaleSceneScale();
  });

  it('resolves entity positions for Vector3 and tuple coordinates', () => {
    const store = createSpatialEntityStore();
    store.getState().registerEntity({
      id: 'vec-star',
      name: 'Vector Star',
      position: new THREE.Vector3(1, 2, 3),
    });
    store.getState().registerEntity({
      id: 'tuple-star',
      name: 'Tuple Star',
      position: [4, 5, 6],
    });

    expect(resolveEntityPosition(null, 'vec-star')).toBeNull();
    expect(resolveEntityPosition(store, undefined)).toBeNull();
    expect(resolveEntityPosition(store, 'missing')).toBeNull();
    expect(resolveEntityPosition(store, 'vec-star')).toEqual([1, 2, 3]);
    expect(resolveEntityPosition(store, 'tuple-star')).toEqual([4, 5, 6]);
  });

  it('extracts finite target plane metadata and omits missing records', () => {
    const store = createSpatialEntityStore();
    store.getState().registerEntity({
      id: 'plain-body',
      name: 'Plain Body',
      position: [0, 0, 0],
    });
    store.getState().registerEntity({
      id: 'tilted-body',
      name: 'Tilted Body',
      position: [1, 1, 1],
      orbit: { semiMajorAxis: 1, inclination: 15, ascendingNode: 30 },
      data: { axialTiltDeg: 23.4, obliquityDeg: 23.44 },
    });

    expect(resolveTargetPlaneMetadata(null, 'tilted-body')).toBeUndefined();
    expect(resolveTargetPlaneMetadata(store, 'plain-body')).toBeUndefined();
    expect(resolveTargetPlaneMetadata(store, 'tilted-body')).toEqual({
      inclinationDeg: 15,
      ascendingNodeDeg: 30,
      axialTiltDeg: 23.4,
      obliquityDeg: 23.44,
    });
  });

  it('resolves departure targets for zoom-in and zoom-out across store, committed coords, and controls', () => {
    const store = createSpatialEntityStore();
    store.getState().registerEntity({
      id: 'dest-system',
      name: 'Destination System',
      position: [9, 8, 7],
    });
    const controls = { target: new THREE.Vector3(1, 2, 3) };

    expect(resolveDepartureTarget('in', store, 'dest-system', [4, 5, 6], controls)).toEqual([
      9, 8, 7,
    ]);
    expect(resolveDepartureTarget('in', store, 'missing', [4, 5, 6], controls)).toEqual([4, 5, 6]);
    expect(resolveDepartureTarget('in', store, 'missing', undefined, controls)).toEqual([1, 2, 3]);
    expect(resolveDepartureTarget('out', store, 'dest-system', [4, 5, 6], controls)).toEqual([
      1, 2, 3,
    ]);
    expect(resolveDepartureTarget('out', store, 'dest-system', undefined, undefined)).toEqual([
      0, 0, 0,
    ]);
  });

  it('matches scene targets by scope and targetId for non-galactic scopes', () => {
    expect(isMatchingSceneTarget('galaxy', 'a', 'galaxy', 'b')).toBe(true);
    expect(isMatchingSceneTarget('system', 'sys-1', 'system', 'sys-1')).toBe(true);
    expect(isMatchingSceneTarget('system', 'sys-1', 'system', 'sys-2')).toBe(false);
    expect(isMatchingSceneTarget('system', 'sys-1', 'planet', 'sys-1')).toBe(false);
  });

  it('snapshots pre-dive galactic camera pose and resets cross-scale visual state', () => {
    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000);
    camera.position.set(0, -20, 10);
    camera.up.set(0, 0, 1);
    const controls = { target: new THREE.Vector3(1, 2, 3) };

    snapshotPreDiveGalaxyCamera(camera, controls, [0, 0, 0]);
    expect(useCameraStore.getState().savedGalaxyCamera).toMatchObject({
      position: [0, -20, 10],
      target: [1, 2, 3],
      up: [0, 0, 1],
      centerKey: '1,2,3',
    });

    setCrossScaleSceneScale(0.2);
    setCrossScaleInstrumentFade(0.3);
    setCrossScalePlanePreview({
      position: [0, 0, 0],
      inclinationRad: 0,
      ascendingNodeRad: 0,
      maxRadius: 2,
    });
    setPendingCrossScaleArrival({
      direction: 'in',
      targetScope: 'system',
      durationSec: 1,
      frameTiltRad: 0.5,
      tiltAxis: [1, 0, 0],
    });
    useUIStore.getState().setCameraTransitioning(true);

    resetAllCrossScaleVisualState();
    expect(getCrossScaleSceneScale()).toBe(1);
    expect(getCrossScaleInstrumentFade()).toBe(1);
    expect(getCrossScalePlanePreviewState().active).toBe(false);
    expect(hasPendingCrossScaleArrival()).toBe(false);
    expect(useUIStore.getState().isCameraTransitioning).toBe(false);
  });

  it('resolves stage swap props from latestProps, matching props, or synthesised target props', () => {
    const committed: SpatialStageSceneProps = {
      scope: 'galaxy',
      centerId: 'center-a',
      centerCoordinates: [1, 2, 3],
      isSpatialSceneMounted: true,
    };
    const next: SpatialStageSceneProps = {
      scope: 'system',
      targetId: 'sys-next',
      centerId: 'body-a',
      isSpatialSceneMounted: true,
    };

    expect(resolveStageSwapProps(next, committed, committed, false, 'system', 'sys-next')).toBe(
      next,
    );
    expect(resolveStageSwapProps(undefined, next, committed, true, 'system', 'sys-next')).toBe(
      next,
    );
    expect(
      resolveStageSwapProps(undefined, committed, committed, false, 'system', 'sys-next'),
    ).toEqual({
      scope: 'system',
      targetId: 'sys-next',
      centerId: undefined,
      centerCoordinates: undefined,
      isSpatialSceneMounted: true,
    });
  });

  it('renders the committed spatial scene element for each mounted scope', async () => {
    expect(
      renderCommittedSpatialScene({ scope: 'galaxy', isSpatialSceneMounted: false }),
    ).toBeNull();
    expect(
      renderCommittedSpatialScene({ scope: 'system', isSpatialSceneMounted: true }),
    ).toBeNull();

    const { rerender } = render(
      createElement(
        'div',
        null,
        renderCommittedSpatialScene({
          scope: 'galaxy',
          centerId: 'center-a',
          isSpatialSceneMounted: true,
        }),
      ),
    );
    expect(await screen.findByTestId('helper-galactic')).toHaveAttribute(
      'data-center-id',
      'center-a',
    );

    rerender(
      createElement(
        'div',
        null,
        renderCommittedSpatialScene({
          scope: 'system',
          targetId: 'sys-1',
          isSpatialSceneMounted: true,
        }),
      ),
    );
    expect(await screen.findByTestId('helper-system')).toHaveAttribute('data-system-id', 'sys-1');

    rerender(
      createElement(
        'div',
        null,
        renderCommittedSpatialScene({
          scope: 'planet',
          targetId: 'planet-1',
          isSpatialSceneMounted: true,
        }),
      ),
    );
    expect(await screen.findByTestId('helper-planet')).toHaveAttribute(
      'data-planet-id',
      'planet-1',
    );
  });
});
