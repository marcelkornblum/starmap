import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { ALL_CANVAS_CLAMP_EDGES, useCameraStore } from '../../../stores/useCameraStore';
import { useUIStore } from '../../../stores/useUIStore';
import type { MinimapOrientationSummary } from '../../../services/details/detailsNavigationTypes';
import {
  CanvasRouterBridgeContext,
  type AppRouterAdapter,
} from '../../../hooks/useSpaLocation';
import { STANDARD_CAMERA_DISTANCES, getStandardInitialCamera } from '../../canvas/cartography/cartographyCamera';
import { VisorScalePill } from './VisorScalePill';

const mockGalaxyOrientation: MinimapOrientationSummary = {
  scope: 'galaxy',
  anchorId: 'anchor-a',
  anchorName: 'Anchor A',
  systemId: 'sys-a',
  systemName: 'System A',
  coordinatesPc: [0, 0, 0],
  distanceFromOriginPc: 0,
  cameraAzimuthDeg: 45,
  cameraElevationDeg: 30,
  cameraDistance: 42,
  focusedMarker: null,
  selectedMarkers: [],
  markers: [],
};

const mockSystemOrientation: MinimapOrientationSummary = {
  scope: 'system',
  anchorId: 'sys-a',
  anchorName: 'System A',
  systemId: 'sys-a',
  systemName: 'System A',
  planeInclinationDeg: 60.19,
  outerOrbitalRadiusAu: 30.1,
  orbitingBodyCount: 8,
  cameraAzimuthDeg: 20,
  cameraElevationDeg: 45,
  cameraDistance: 15,
  focusedMarker: null,
  selectedMarkers: [],
  markers: [],
};

const mockPlanetOrientation: MinimapOrientationSummary = {
  scope: 'planet',
  anchorId: 'planet-a',
  anchorName: 'Planet A',
  systemId: 'sys-a',
  systemName: 'System A',
  planeInclinationDeg: 60.19,
  axialTiltDeg: 23.44,
  parentSemiMajorAxisAu: 1.0,
  orbitingBodyCount: 1,
  cameraAzimuthDeg: 10,
  cameraElevationDeg: 18,
  cameraDistance: 8,
  focusedMarker: null,
  selectedMarkers: [],
  markers: [],
};

describe('<VisorScalePill />', () => {
  const originalInnerWidth = window.innerWidth;

  beforeEach(() => {
    useCameraStore.getState().reset();
    useUIStore.getState().resetUI();
    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      writable: true,
      value: 390,
    });
  });

  afterEach(() => {
    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      writable: true,
      value: originalInnerWidth,
    });
  });

  it('returns null when orientation is null', () => {
    const { container } = render(<VisorScalePill orientation={null} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders position, focal distance with scope unit, and rounded elevation cue using fallback pose', () => {
    render(<VisorScalePill orientation={mockGalaxyOrientation} />);

    const pill = screen.getByTestId('visor-scale-pill');
    expect(pill.tagName.toLowerCase()).toBe('button');
    expect(pill).toHaveAttribute('data-next-action', 'reorient');
    expect(pill).toHaveAttribute('aria-label', 'Reset camera orientation to North');
    expect(screen.getByTestId('visor-position')).toHaveTextContent('0,0,0');
    expect(screen.getByTestId('visor-focal-distance')).toHaveTextContent('42.0pc');
    expect(screen.getByTestId('visor-attitude-cue')).toHaveTextContent('N▲ 30°');
  });

  it('renders compact x,y,z target coordinates when panned off origin', () => {
    const pannedCam = getStandardInitialCamera(
      STANDARD_CAMERA_DISTANCES.galactic,
      [-0.9, 2.4, -2.9],
      45,
    );
    useCameraStore.getState().setCameraPose({
      position: pannedCam.position,
      target: [-0.9, 2.4, -2.9],
      up: pannedCam.up,
    });

    render(<VisorScalePill orientation={mockGalaxyOrientation} />);
    expect(screen.getByTestId('visor-position')).toHaveTextContent('-0.9,2.4,-2.9');
  });

  it('adapts focal units across system (AU) and planet (km) scopes and live camera pose', () => {
    useCameraStore.getState().setCameraPose({
      position: [0, -10, 10],
      target: [0, 0, 0],
      up: [0, 0, 1],
    });

    const { rerender } = render(<VisorScalePill orientation={mockSystemOrientation} />);
    expect(screen.getByTestId('visor-position')).toHaveTextContent('0,0,0');
    expect(screen.getByTestId('visor-focal-distance')).toHaveTextContent('14.1AU');
    expect(screen.getByTestId('visor-attitude-cue')).toHaveTextContent('N▲ 45°');

    rerender(<VisorScalePill orientation={mockPlanetOrientation} />);
    expect(screen.getByTestId('visor-focal-distance')).toHaveTextContent('14.1km');
    expect(screen.getByTestId('visor-attitude-cue')).toHaveTextContent('N▲ 45°');
  });

  it('Step 1 (off-orientation): dispatches radial preset and strips az/el search params', () => {
    const navigate = vi.fn().mockResolvedValue(undefined);
    const router: AppRouterAdapter = {
      navigate: navigate as AppRouterAdapter['navigate'],
      state: {
        location: {
          pathname: '/galaxy',
          searchStr: '?az=45&el=30&layer=canon',
          search: { az: '45', el: '30', layer: 'canon' } as AppRouterAdapter['state'] extends { location?: { search?: infer S } } ? S : never,
        },
      },
    };

    render(
      <CanvasRouterBridgeContext.Provider value={router}>
        <VisorScalePill orientation={mockGalaxyOrientation} />
      </CanvasRouterBridgeContext.Provider>,
    );

    const pill = screen.getByTestId('visor-scale-pill');
    expect(pill).toHaveAttribute('data-next-action', 'reorient');
    expect(useCameraStore.getState().pendingPresetRequest).toBeNull();

    fireEvent.click(pill);

    expect(useCameraStore.getState().pendingPresetRequest).toBe('radial');
    expect(navigate).toHaveBeenCalledTimes(1);
    const navOpts = navigate.mock.calls[0]?.[0] as {
      to: string;
      replace: boolean;
      search: (prev: Record<string, unknown>) => Record<string, unknown>;
    };
    expect(navOpts.to).toBe('.');
    expect(navOpts.replace).toBe(true);
    expect(navOpts.search({ az: '45', el: '30', layer: 'canon' })).toEqual({ layer: 'canon' });
  });

  it('Step 2 (canonical orientation + off-zoom): dispatches reset-zoom and strips dist/zoom params', () => {
    const offZoomCam = getStandardInitialCamera(64, [0, 0, 0], 45);
    useCameraStore.getState().setCameraPose({
      position: offZoomCam.position,
      target: [0, 0, 0],
      up: offZoomCam.up,
    });
    const navigate = vi.fn().mockResolvedValue(undefined);
    const router: AppRouterAdapter = {
      navigate: navigate as AppRouterAdapter['navigate'],
      state: {
        location: {
          pathname: '/galaxy',
          searchStr: '?dist=64&zoom=1.5',
        },
      },
    };

    render(
      <CanvasRouterBridgeContext.Provider value={router}>
        <VisorScalePill orientation={mockGalaxyOrientation} />
      </CanvasRouterBridgeContext.Provider>,
    );

    const pill = screen.getByTestId('visor-scale-pill');
    expect(pill).toHaveAttribute('data-next-action', 'reset-zoom');
    expect(pill).toHaveAttribute('aria-label', 'Reset camera zoom');

    fireEvent.click(pill);

    expect(useCameraStore.getState().pendingPresetRequest).toBe('reset-zoom');
    expect(navigate).toHaveBeenCalledTimes(1);
    const navOpts = navigate.mock.calls[0]?.[0] as {
      search: (prev: Record<string, unknown>) => Record<string, unknown>;
    };
    expect(navOpts.search({ dist: '64', zoom: '1.5', layer: 'canon' })).toEqual({
      layer: 'canon',
    });
  });

  it('Step 3 (canonical orientation + zoom + off-origin target): dispatches reset-position, records focus, and strips center/x/y/z', () => {
    const pannedCam = getStandardInitialCamera(
      STANDARD_CAMERA_DISTANCES.galactic,
      [-0.9, 2.4, -2.9],
      45,
    );
    useCameraStore.getState().setCameraPose({
      position: pannedCam.position,
      target: [-0.9, 2.4, -2.9],
      up: pannedCam.up,
    });
    const navigate = vi.fn().mockResolvedValue(undefined);
    const router: AppRouterAdapter = {
      navigate: navigate as AppRouterAdapter['navigate'],
      state: {
        location: {
          pathname: '/galaxy',
          searchStr: '?focus=tau-ceti&center=-0.9,2.4,-2.9',
          search: { focus: 'tau-ceti', center: '-0.9,2.4,-2.9' },
        },
      },
    };

    render(
      <CanvasRouterBridgeContext.Provider value={router}>
        <VisorScalePill orientation={mockGalaxyOrientation} />
      </CanvasRouterBridgeContext.Provider>,
    );

    const pill = screen.getByTestId('visor-scale-pill');
    expect(pill).toHaveAttribute('data-next-action', 'reset-position');
    expect(pill).toHaveAttribute('aria-label', 'Reset camera position to origin');

    fireEvent.click(pill);

    expect(useCameraStore.getState().pendingPresetRequest).toBe('reset-position');
    expect(useCameraStore.getState().canvasFocusedSlugs.has('tau-ceti')).toBe(true);
    expect(navigate).toHaveBeenCalledTimes(1);
    const navOpts = navigate.mock.calls[0]?.[0] as {
      search: (prev: Record<string, unknown>) => Record<string, unknown>;
    };
    expect(
      navOpts.search({
        focus: 'tau-ceti',
        center: '-0.9,2.4,-2.9',
        x: '1',
        y: '2',
        z: '3',
      }),
    ).toEqual({ focus: 'tau-ceti' });
  });

  it('Step 4 (all-ready): triggers clampBump across all 4 edges with zoom-out reason', () => {
    const canonicalCam = getStandardInitialCamera(
      STANDARD_CAMERA_DISTANCES.galactic,
      [0, 0, 0],
      45,
    );
    useCameraStore.getState().setCameraPose({
      position: canonicalCam.position,
      target: [0, 0, 0],
      up: canonicalCam.up,
    });

    render(<VisorScalePill orientation={mockGalaxyOrientation} />);

    const pill = screen.getByTestId('visor-scale-pill');
    expect(pill).toHaveAttribute('data-next-action', 'all-ready');
    expect(pill).toHaveAttribute('aria-label', 'Camera at default orientation, zoom, and position');

    fireEvent.click(pill);

    expect(useCameraStore.getState().pendingPresetRequest).toBeNull();
    expect(useCameraStore.getState().clampBump).toEqual({
      edges: [...ALL_CANVAS_CLAMP_EDGES],
      reason: 'zoom-out',
      impulse: 0.85,
      seq: 1,
    });
  });

  it('gates useLiveCameraPose off on desktop viewports (>= 768px)', () => {
    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      writable: true,
      value: 1440,
    });

    render(<VisorScalePill orientation={mockGalaxyOrientation} />);
    expect(screen.getByTestId('visor-focal-distance')).toHaveTextContent('42.0pc');

    act(() => {
      useCameraStore.getState().setCameraPose({
        position: [0, 0, 100],
        target: [0, 0, 0],
        up: [0, 1, 0],
      });
    });

    expect(screen.getByTestId('visor-focal-distance')).toHaveTextContent('42.0pc');
  });

  it('updates focal distance and elevation via rAF when camera store updates', () => {
    let rafCallback: FrameRequestCallback | null = null;
    const origRaf = window.requestAnimationFrame;
    window.requestAnimationFrame = ((cb: FrameRequestCallback) => {
      rafCallback = cb;
      return 1;
    }) as typeof window.requestAnimationFrame;

    try {
      render(<VisorScalePill orientation={mockGalaxyOrientation} />);
      expect(screen.getByTestId('visor-focal-distance')).toHaveTextContent('42.0pc');
      expect(screen.getByTestId('visor-attitude-cue')).toHaveTextContent('N▲ 30°');

      act(() => {
        useCameraStore.getState().setCameraPose({
          position: [0, 0, 100],
          target: [0, 0, 0],
          up: [0, 1, 0],
        });
      });

      act(() => {
        rafCallback?.(performance.now());
      });

      expect(screen.getByTestId('visor-focal-distance')).toHaveTextContent('100pc');
      expect(screen.getByTestId('visor-attitude-cue')).toHaveTextContent('N▲ 90°');
    } finally {
      window.requestAnimationFrame = origRaf;
    }
  });

  it('guards against -0° when elevationDeg is in [-0.5, 0)', () => {
    // Elevation = -0.2 deg => Math.round(-0.2) === -0 in JS; must render N▲ 0° not N▲ -0°
    const elRad = (-0.2 * Math.PI) / 180;
    const dist = 28;
    useCameraStore.getState().setCameraPose({
      position: [0, -dist * Math.cos(elRad), dist * Math.sin(elRad)],
      target: [0, 0, 0],
      up: [0, 0, 1],
    });

    render(<VisorScalePill orientation={mockGalaxyOrientation} />);
    expect(screen.getByTestId('visor-attitude-cue')).toHaveTextContent('N▲ 0°');
    expect(screen.getByTestId('visor-attitude-cue').textContent).not.toContain('-0');
  });

  it('normalises non-slugified ?focus=Tau%20Ceti into canvasFocusedSlugs on reset-position', () => {
    const pannedCam = getStandardInitialCamera(
      STANDARD_CAMERA_DISTANCES.galactic,
      [-0.9, 2.4, -2.9],
      45,
    );
    useCameraStore.getState().setCameraPose({
      position: pannedCam.position,
      target: [-0.9, 2.4, -2.9],
      up: pannedCam.up,
    });
    const navigate = vi.fn().mockResolvedValue(undefined);
    const router: AppRouterAdapter = {
      navigate: navigate as AppRouterAdapter['navigate'],
      state: {
        location: {
          pathname: '/galaxy',
          searchStr: '?focus=Tau%20Ceti&center=-0.9,2.4,-2.9',
          search: { focus: 'Tau Ceti', center: '-0.9,2.4,-2.9' },
        },
      },
    };

    render(
      <CanvasRouterBridgeContext.Provider value={router}>
        <VisorScalePill orientation={mockGalaxyOrientation} />
      </CanvasRouterBridgeContext.Provider>,
    );

    fireEvent.click(screen.getByTestId('visor-scale-pill'));

    const slugs = useCameraStore.getState().canvasFocusedSlugs;
    expect(slugs.has('tau-ceti')).toBe(true);
    expect(slugs.has('Tau Ceti')).toBe(true);
  });

  it('advances across reorient -> reset-zoom -> reset-position -> all-ready on 4 rapid consecutive clicks while isCameraTransitioning is true', () => {
    useCameraStore.getState().setCameraPose({
      position: [5, -3, 60],
      target: [5, -3, 2],
      up: [0, 1, 0],
    });
    useUIStore.getState().setCameraTransitioning(true);

    render(<VisorScalePill orientation={mockGalaxyOrientation} />);
    const pill = screen.getByTestId('visor-scale-pill');

    // Click 1 -> reorient
    fireEvent.click(pill);
    expect(useCameraStore.getState().pendingPresetRequest).toBe('radial');
    expect(useCameraStore.getState().clampBump).toBeNull();

    // Click 2 (still transitioning) -> reset-zoom
    fireEvent.click(pill);
    expect(useCameraStore.getState().pendingPresetRequest).toBe('reset-zoom');
    expect(useCameraStore.getState().clampBump).toBeNull();

    // Click 3 (still transitioning) -> reset-position
    fireEvent.click(pill);
    expect(useCameraStore.getState().pendingPresetRequest).toBe('reset-position');
    expect(useCameraStore.getState().clampBump).toBeNull();

    // Click 4 (still transitioning) -> all-ready (clampBump)
    fireEvent.click(pill);
    expect(useCameraStore.getState().clampBump).toEqual({
      edges: [...ALL_CANVAS_CLAMP_EDGES],
      reason: 'zoom-out',
      impulse: 0.85,
      seq: 1,
    });

    // When transition settles, in-flight step resets
    act(() => {
      useUIStore.getState().setCameraTransitioning(false);
    });
    useCameraStore.getState().clearPresetRequest();
    fireEvent.click(pill);
    expect(useCameraStore.getState().pendingPresetRequest).toBe('radial');
  });
});
