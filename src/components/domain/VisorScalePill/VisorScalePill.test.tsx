import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { useCameraStore } from '../../../stores/useCameraStore';
import type { MinimapOrientationSummary } from '../../../services/details/detailsNavigationTypes';
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

  it('renders focal distance with scope unit and rounded elevation cue using fallback pose', () => {
    render(<VisorScalePill orientation={mockGalaxyOrientation} />);

    const pill = screen.getByTestId('visor-scale-pill');
    expect(pill.tagName.toLowerCase()).toBe('button');
    expect(pill).toHaveAttribute('aria-label', 'Reset camera orientation to North');
    expect(screen.getByTestId('visor-focal-distance')).toHaveTextContent('42.0pc');
    expect(screen.getByTestId('visor-attitude-cue')).toHaveTextContent('N▲ 30°');
  });

  it('adapts focal units across system (AU) and planet (km) scopes and live camera pose', () => {
    useCameraStore.getState().setCameraPose({
      position: [0, -10, 10],
      target: [0, 0, 0],
      up: [0, 0, 1],
    });

    const { rerender } = render(<VisorScalePill orientation={mockSystemOrientation} />);
    expect(screen.getByTestId('visor-focal-distance')).toHaveTextContent('14.1AU');
    expect(screen.getByTestId('visor-attitude-cue')).toHaveTextContent('N▲ 45°');

    rerender(<VisorScalePill orientation={mockPlanetOrientation} />);
    expect(screen.getByTestId('visor-focal-distance')).toHaveTextContent('14.1km');
    expect(screen.getByTestId('visor-attitude-cue')).toHaveTextContent('N▲ 45°');
  });

  it('triggers useCameraStore.setRadialView() when clicked', () => {
    render(<VisorScalePill orientation={mockGalaxyOrientation} />);

    expect(useCameraStore.getState().pendingPresetRequest).toBeNull();

    fireEvent.click(screen.getByTestId('visor-scale-pill'));

    expect(useCameraStore.getState().pendingPresetRequest).toBe('radial');
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
});
