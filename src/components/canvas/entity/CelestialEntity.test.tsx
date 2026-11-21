import { describe, it, expect, vi, beforeEach } from 'vitest';
import ReactThreeTest from '@react-three/test-renderer';
import { screen, render, act } from '@testing-library/react';
import { CelestialEntity } from './CelestialEntity';
import { SpatialEntityProvider } from './SpatialEntityProvider';
import { createSpatialEntityStore } from './SpatialEntityStore';
import { CelestialOcclusionManager } from '../cartography/celestialOcclusionRegistry';
import { SafeHtmlPortalOutlet } from '../SafeHtml';

const { mockInvalidate, wrappedInvalidateCache } = vi.hoisted(() => ({
  mockInvalidate: vi.fn(),
  wrappedInvalidateCache: new WeakMap<
    (frames?: number) => void,
    (frames?: number) => void
  >(),
}));

vi.mock('@react-three/fiber', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@react-three/fiber')>();
  return {
    ...actual,
    useThree: ((selector?: (state: unknown) => unknown) => {
      const realInvalidate = actual.useThree((s) => s.invalidate);
      const selected: unknown = actual.useThree(
        (selector ?? ((s: unknown) => s)) as Parameters<typeof actual.useThree>[0],
      );
      if (selected === realInvalidate) {
        let wrapped = wrappedInvalidateCache.get(realInvalidate);
        if (!wrapped) {
          wrapped = (frames?: number) => {
            mockInvalidate(frames);
            return realInvalidate(frames);
          };
          wrappedInvalidateCache.set(realInvalidate, wrapped);
        }
        return wrapped;
      }
      return selected;
    }) as typeof actual.useThree,
  };
});

describe('CelestialEntity - Active Label Density Suppression Rule', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    document.body.innerHTML = '';
  });

  it('renders EntityLabel for an active entity when aperture count <= 10', async () => {
    const store = createSpatialEntityStore();
    const { unmount: unmountOutlet } = render(<SafeHtmlPortalOutlet />);
    const apertureIds = new Set<string>(['star-1', 'star-2', 'star-3', 'star-4', 'target-star']);
    store.getState().setApertureIds(apertureIds);

    const renderer = await ReactThreeTest.create(
      <SpatialEntityProvider store={store}>
        <CelestialEntity id="target-star" name="Target Star" position={[0, 0, 0]} />
      </SpatialEntityProvider>,
    );

    const labelNodes = renderer.scene.findAll((node) =>
      typeof node.props.name === 'string' && node.props.name.startsWith('entity-label-target-star'),
    );
    expect(labelNodes).toHaveLength(1);
    expect(screen.queryByTestId('entity-label-target-star')).not.toBeNull();

    await renderer.unmount();
    unmountOutlet();
  });

  it('suppresses EntityLabel for an active entity when aperture count > 10', async () => {
    const store = createSpatialEntityStore();
    const { unmount: unmountOutlet } = render(<SafeHtmlPortalOutlet />);
    const ids = Array.from({ length: 11 }, (_, i) => `star-${i}`);
    ids.push('target-star');
    store.getState().setApertureIds(new Set(ids));

    const renderer = await ReactThreeTest.create(
      <SpatialEntityProvider store={store}>
        <CelestialEntity id="target-star" name="Target Star" position={[0, 0, 0]} />
      </SpatialEntityProvider>,
    );

    const labelNodes = renderer.scene.findAll((node) =>
      typeof node.props.name === 'string' && node.props.name.startsWith('entity-label-target-star'),
    );
    expect(labelNodes).toHaveLength(0);
    expect(screen.queryByTestId('entity-label-target-star')).toBeNull();

    await renderer.unmount();
    unmountOutlet();
  });

  it('keeps EntityLabel rendered when entity is selected even if aperture count > 10', async () => {
    const store = createSpatialEntityStore();
    const { unmount: unmountOutlet } = render(<SafeHtmlPortalOutlet />);
    const ids = Array.from({ length: 15 }, (_, i) => `star-${i}`);
    ids.push('target-star');
    store.getState().setApertureIds(new Set(ids));
    store.getState().setSelected('target-star');

    const renderer = await ReactThreeTest.create(
      <SpatialEntityProvider store={store}>
        <CelestialEntity id="target-star" name="Target Star" position={[0, 0, 0]} />
      </SpatialEntityProvider>,
    );

    const labelNodes = renderer.scene.findAll((node) =>
      typeof node.props.name === 'string' && node.props.name.startsWith('entity-label-target-star'),
    );
    expect(labelNodes).toHaveLength(1);
    expect(screen.queryByTestId('entity-label-target-star')).not.toBeNull();

    await renderer.unmount();
    unmountOutlet();
  });

  it('keeps EntityLabel rendered when entity is focused even if aperture count > 10', async () => {
    const store = createSpatialEntityStore();
    const { unmount: unmountOutlet } = render(<SafeHtmlPortalOutlet />);
    const ids = Array.from({ length: 20 }, (_, i) => `star-${i}`);
    ids.push('target-star');
    store.getState().setApertureIds(new Set(ids));
    store.getState().setFocused('target-star');

    const renderer = await ReactThreeTest.create(
      <SpatialEntityProvider store={store}>
        <CelestialEntity id="target-star" name="Target Star" position={[0, 0, 0]} />
      </SpatialEntityProvider>,
    );

    const labelNodes = renderer.scene.findAll((node) =>
      typeof node.props.name === 'string' && node.props.name.startsWith('entity-label-target-star'),
    );
    expect(labelNodes).toHaveLength(1);
    expect(screen.queryByTestId('entity-label-target-star')).not.toBeNull();

    await renderer.unmount();
    unmountOutlet();
  });

  it('does not render EntityLabel when entity is passive', async () => {
    const store = createSpatialEntityStore();
    const { unmount: unmountOutlet } = render(<SafeHtmlPortalOutlet />);
    store.getState().setApertureIds(new Set(['other-1', 'other-2']));

    const renderer = await ReactThreeTest.create(
      <SpatialEntityProvider store={store}>
        <CelestialEntity id="target-star" name="Target Star" position={[0, 0, 0]} />
      </SpatialEntityProvider>,
    );

    const labelNodes = renderer.scene.findAll((node) =>
      typeof node.props.name === 'string' && node.props.name.startsWith('entity-label-target-star'),
    );
    expect(labelNodes).toHaveLength(0);
    expect(screen.queryByTestId('entity-label-target-star')).toBeNull();

    await renderer.unmount();
    unmountOutlet();
  });

  it('respects stateOverride when provided', async () => {
    const store = createSpatialEntityStore();
    const { unmount: unmountOutlet } = render(<SafeHtmlPortalOutlet />);
    store.getState().setApertureIds(new Set(Array.from({ length: 15 }, (_, i) => `star-${i}`)));

    const renderer = await ReactThreeTest.create(
      <SpatialEntityProvider store={store}>
        <CelestialEntity
          id="target-star"
          name="Target Star"
          position={[0, 0, 0]}
          stateOverride="selected"
        />
      </SpatialEntityProvider>,
    );

    const labelNodes = renderer.scene.findAll((node) =>
      typeof node.props.name === 'string' && node.props.name.startsWith('entity-label-target-star'),
    );
    expect(labelNodes).toHaveLength(1);
    expect(screen.queryByTestId('entity-label-target-star')).not.toBeNull();

    await renderer.unmount();
    unmountOutlet();
  });
});

describe('CelestialEntity - Occlusion Lifecycle & Frame Loop Purity (AUD-103, AUD-105)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('registers footprint on mount and does NOT call register() per frame in useFrame (AUD-103)', async () => {
    const store = createSpatialEntityStore();
    const occlusionManager = new CelestialOcclusionManager();
    const registerSpy = vi.spyOn(occlusionManager, 'register');

    const renderer = await ReactThreeTest.create(
      <SpatialEntityProvider store={store} occlusionManager={occlusionManager}>
        <CelestialEntity id="target-star" name="Target Star" position={[0, 0, 0]} />
      </SpatialEntityProvider>,
    );

    // Initial registration happened in useEffect
    expect(registerSpy).toHaveBeenCalledTimes(1);

    // Advance frames to simulate useFrame
    await renderer.advanceFrames(2, 0.016);

    // register() must NOT be called per frame!
    expect(registerSpy).toHaveBeenCalledTimes(1);

    // Unmount should unregister
    const unregisterSpy = vi.spyOn(occlusionManager, 'unregister');
    await renderer.unmount();
    expect(unregisterSpy).toHaveBeenCalledWith('target-star');
  });

  it('calls invalidate() when the DropStalk retraction timer finishes', async () => {
    vi.useFakeTimers();
    const store = createSpatialEntityStore({ selectedId: 'target-star' });

    const renderer = await ReactThreeTest.create(
      <SpatialEntityProvider store={store}>
        <CelestialEntity id="target-star" name="Target Star" position={[0, 0, 5]} />
      </SpatialEntityProvider>,
    );

    mockInvalidate.mockClear();

    await act(async () => {
      store.getState().setSelected(null);
    });

    mockInvalidate.mockClear();
    await act(async () => {
      vi.advanceTimersByTime(250);
    });

    expect(mockInvalidate).toHaveBeenCalled();

    await renderer.unmount();
    vi.useRealTimers();
  });
});
