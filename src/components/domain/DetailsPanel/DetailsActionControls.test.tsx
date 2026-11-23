import { describe, it, expect, beforeEach, vi } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import { useCameraStore } from '../../../stores/useCameraStore';
import { useCanvasStageStore } from '../../../stores/useCanvasStageStore';
import { createSpatialEntityStore } from '../../canvas/entity/SpatialEntityStore';
import { SpatialEntityStoreContext } from '../../canvas/entity/SpatialEntityContext';
import { DetailsActionControls } from './DetailsActionControls';

describe('<DetailsActionControls />', () => {
  beforeEach(() => {
    useCameraStore.getState().reset();
    useCanvasStageStore.getState().resetCanvasStageStore();
  });

  it('hides details-button-center when centerHref is undefined with zero /galaxy fallback', () => {
    render(
      <DetailsActionControls
        id="earth"
        directionsHref="/galaxy?focus=sol&anchor=sol"
        centerHref={undefined}
      />,
    );

    expect(screen.queryByTestId('details-button-center')).toBeNull();
    expect(screen.getByTestId('details-button-directions')).toBeInTheDocument();
  });

  it('hides details-button-center when camera target matches scene-local SpatialEntityStore position on SystemView and shows it with preserved params once panned away', () => {
    const store = createSpatialEntityStore();
    store.getState().registerEntity({
      id: 'earth',
      name: 'Earth',
      classification: 'terrestrial',
      position: [1.5, 0, -0.8],
    });
    useCameraStore.getState().setCameraPose({
      position: [1.5, 2, 1.2],
      target: [1.5, 0, -0.8],
    });

    const centerHref =
      '/system/sol?center=earth&focus=earth&layer=canon-1&select=earth&route=sol,tau-ceti';

    render(
      <SpatialEntityStoreContext.Provider value={store}>
        <DetailsActionControls
          id="earth"
          coordinatesPc={[0, 0, 0]}
          centerHref={centerHref}
          directionsHref="/galaxy?focus=sol"
        />
      </SpatialEntityStoreContext.Provider>,
    );

    expect(screen.queryByTestId('details-button-center')).toBeNull();

    act(() => {
      useCameraStore.getState().setCameraPose({
        position: [4.5, 2, 1.2],
        target: [3.2, 0.4, -0.8],
      });
    });

    const centreBtn = screen.getByTestId('details-button-center');
    expect(centreBtn).toBeInTheDocument();
    expect(centreBtn.getAttribute('href')).toBe(centerHref);
  });

  it('hides details-button-center on GalaxyView when camera target matches coordinatesPc and shows it when panned away', () => {
    useCameraStore.getState().setCameraPose({
      position: [-0.94, 2.37, 17.07],
      target: [-0.94, 2.37, -2.93],
    });

    const centerHref = '/galaxy?center=tau-ceti&focus=tau-ceti';

    render(
      <DetailsActionControls
        id="tau-ceti"
        coordinatesPc={[-0.94, 2.37, -2.93]}
        centerHref={centerHref}
        directionsHref="/galaxy?focus=tau-ceti&anchor=sol"
      />,
    );

    expect(screen.queryByTestId('details-button-center')).toBeNull();

    act(() => {
      useCameraStore.getState().setCameraPose({
        position: [0, 0, 20],
        target: [0, 0, 0],
      });
    });

    const centreBtn = screen.getByTestId('details-button-center');
    expect(centreBtn).toBeInTheDocument();
    expect(centreBtn.getAttribute('href')).toBe(centerHref);
  });

  it('prefers activeSceneStore orbital coordinates over outer galactic [0,0,0] stubs', () => {
    const outerStore = createSpatialEntityStore();
    outerStore.getState().registerEntity({
      id: 'mars',
      name: 'Mars',
      classification: 'terrestrial',
      position: [0, 0, 0],
    });

    const sceneStore = createSpatialEntityStore();
    sceneStore.getState().registerEntity({
      id: 'mars',
      name: 'Mars',
      classification: 'terrestrial',
      position: [-1.38, 0.65, 0.04],
    });
    useCanvasStageStore.getState().setActiveSceneStore(sceneStore);
    useCameraStore.getState().setCameraPose({
      position: [0, 0, 22],
      target: [0, 0, 0],
    });

    render(
      <SpatialEntityStoreContext.Provider value={outerStore}>
        <DetailsActionControls
          id="mars"
          coordinatesPc={[0, 0, 0]}
          centerHref="/system/sol?center=mars&focus=mars"
          directionsHref="/system/sol?focus=mars&route=earth,mars"
        />
      </SpatialEntityStoreContext.Provider>,
    );

    expect(screen.getByTestId('details-button-center')).toBeInTheDocument();

    act(() => {
      useCameraStore.getState().setCameraPose({
        position: [-1.38, 0.65, 22],
        target: [-1.38, 0.65, 0.04],
      });
    });

    expect(screen.queryByTestId('details-button-center')).toBeNull();
  });

  it('ignores non-entity aperture updates on effectiveEntityStore without re-evaluating snapshots', () => {
    const sceneStore = createSpatialEntityStore();
    sceneStore.getState().registerEntity({
      id: 'mars',
      name: 'Mars',
      classification: 'terrestrial',
      position: [-1.38, 0.65, 0.04],
    });
    const resolveSpy = vi.spyOn(sceneStore.getState(), 'resolveEntityId');
    useCanvasStageStore.getState().setActiveSceneStore(sceneStore);

    render(
      <DetailsActionControls
        id="mars"
        coordinatesPc={[0, 0, 0]}
        centerHref="/system/sol?center=mars&focus=mars"
        directionsHref="/system/sol?focus=mars&route=earth,mars"
      />,
    );

    const callsAfterMount = resolveSpy.mock.calls.length;

    act(() => {
      sceneStore.getState().setApertureFrame([1, 2, 3], 10);
      sceneStore.getState().setApertureIds(new Set(['mars']));
    });

    expect(resolveSpy.mock.calls.length).toBe(callsAfterMount);
  });
});
