// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import * as THREE from 'three';
import { CelestialEntity } from '../src/components/canvas/entity/CelestialEntity';
import {
  SpatialEntityProvider,
} from '../src/components/canvas/entity/SpatialEntityContext';
import { createSpatialEntityStore } from '../src/components/canvas/entity/SpatialEntityStore';

vi.mock('@react-three/fiber', () => ({
  useFrame: vi.fn(),
  useThree: vi.fn(() => ({
    camera: new THREE.PerspectiveCamera(),
    size: { width: 800, height: 600 },
  })),
}));

vi.mock('../src/components/canvas/entity/BodyMarker', () => ({
  BodyMarker: () => <div data-testid="mock-body-marker" />,
}));

vi.mock('../src/components/canvas/entity/Reticle', () => ({
  Reticle: () => <div data-testid="mock-reticle" />,
}));

vi.mock('../src/components/canvas/entity/DropStalk', () => ({
  DropStalk: () => <div data-testid="mock-drop-stalk" />,
}));

vi.mock('../src/components/canvas/entity/KinematicVector', () => ({
  KinematicVector: () => <div data-testid="mock-kinematic-vector" />,
}));

vi.mock('../src/components/canvas/entity/OrbitPath', () => ({
  OrbitPath: () => <div data-testid="mock-orbit-path" />,
}));

vi.mock('../src/components/canvas/entity/EntityLabel', () => ({
  EntityLabel: ({ id, name, state }: { id: string; name: string; state: string }) => (
    <div data-testid={`entity-label-${id}`} data-name={name} data-state={state}>
      {name}
    </div>
  ),
}));

describe('CelestialEntity - Active Label Density Suppression Rule', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders EntityLabel for an active entity when aperture count <= 10', () => {
    const store = createSpatialEntityStore();
    const apertureIds = new Set<string>(['star-1', 'star-2', 'star-3', 'star-4', 'target-star']);
    store.getState().setApertureIds(apertureIds);

    const { queryByTestId } = render(
      <SpatialEntityProvider store={store}>
        <CelestialEntity id="target-star" name="Target Star" position={[0, 0, 0]} />
      </SpatialEntityProvider>,
    );

    const label = queryByTestId('entity-label-target-star');
    expect(label).not.toBeNull();
    expect(label?.getAttribute('data-state')).toBe('active');
  });

  it('suppresses EntityLabel for an active entity when aperture count > 10', () => {
    const store = createSpatialEntityStore();
    // 11 active objects in aperture
    const ids = Array.from({ length: 11 }, (_, i) => `star-${i}`);
    ids.push('target-star');
    store.getState().setApertureIds(new Set(ids));

    const { queryByTestId } = render(
      <SpatialEntityProvider store={store}>
        <CelestialEntity id="target-star" name="Target Star" position={[0, 0, 0]} />
      </SpatialEntityProvider>,
    );

    // Label should be suppressed because apertureIds.size > 10
    const label = queryByTestId('entity-label-target-star');
    expect(label).toBeNull();
  });

  it('keeps EntityLabel rendered when entity is selected even if aperture count > 10', () => {
    const store = createSpatialEntityStore();
    const ids = Array.from({ length: 15 }, (_, i) => `star-${i}`);
    ids.push('target-star');
    store.getState().setApertureIds(new Set(ids));
    store.getState().setSelected('target-star');

    const { queryByTestId } = render(
      <SpatialEntityProvider store={store}>
        <CelestialEntity id="target-star" name="Target Star" position={[0, 0, 0]} />
      </SpatialEntityProvider>,
    );

    const label = queryByTestId('entity-label-target-star');
    expect(label).not.toBeNull();
    expect(label?.getAttribute('data-state')).toBe('selected');
  });

  it('keeps EntityLabel rendered when entity is focused even if aperture count > 10', () => {
    const store = createSpatialEntityStore();
    const ids = Array.from({ length: 20 }, (_, i) => `star-${i}`);
    ids.push('target-star');
    store.getState().setApertureIds(new Set(ids));
    store.getState().setFocused('target-star');

    const { queryByTestId } = render(
      <SpatialEntityProvider store={store}>
        <CelestialEntity id="target-star" name="Target Star" position={[0, 0, 0]} />
      </SpatialEntityProvider>,
    );

    const label = queryByTestId('entity-label-target-star');
    expect(label).not.toBeNull();
    expect(label?.getAttribute('data-state')).toBe('focused');
  });

  it('does not render EntityLabel when entity is passive', () => {
    const store = createSpatialEntityStore();
    // target-star is not in aperture, so it is passive
    store.getState().setApertureIds(new Set(['other-1', 'other-2']));

    const { queryByTestId } = render(
      <SpatialEntityProvider store={store}>
        <CelestialEntity id="target-star" name="Target Star" position={[0, 0, 0]} />
      </SpatialEntityProvider>,
    );

    const label = queryByTestId('entity-label-target-star');
    expect(label).toBeNull();
  });

  it('respects stateOverride when provided', () => {
    const store = createSpatialEntityStore();
    store.getState().setApertureIds(new Set(Array.from({ length: 15 }, (_, i) => `star-${i}`)));

    // State overridden to 'selected'
    const { queryByTestId } = render(
      <SpatialEntityProvider store={store}>
        <CelestialEntity
          id="target-star"
          name="Target Star"
          position={[0, 0, 0]}
          stateOverride="selected"
        />
      </SpatialEntityProvider>,
    );

    const label = queryByTestId('entity-label-target-star');
    expect(label).not.toBeNull();
    expect(label?.getAttribute('data-state')).toBe('selected');
  });
});
