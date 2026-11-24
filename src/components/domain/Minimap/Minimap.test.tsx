import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { useCameraStore } from '../../../stores/useCameraStore';
import type { MinimapOrientationSummary } from '../../../services/details/detailsNavigationTypes';
import { Minimap } from './Minimap';
import styles from './Minimap.module.css';

const mockGalaxyOrientation: MinimapOrientationSummary = {
  scope: 'galaxy',
  anchorId: 'sol',
  anchorName: 'Sol',
  systemId: 'sol',
  systemName: 'Sol',
  coordinatesPc: [0, 0, 0],
  distanceFromOriginPc: 0,
  cameraAzimuthDeg: 45,
  cameraElevationDeg: 30,
  cameraDistance: 42,
  focusedMarker: {
    id: 'sol',
    name: 'Sol',
    kind: 'star',
    role: 'focused',
    href: '/galaxy?focus=sol',
    coordinatesPc: [0, 0, 0],
  },
  selectedMarkers: [
    {
      id: 'alpha-centauri',
      name: 'Alpha Centauri',
      kind: 'system',
      role: 'selected',
      href: '/galaxy?focus=alpha-centauri',
      coordinatesPc: [-0.47, 1.32, -0.33],
    },
  ],
  markers: [
    {
      id: 'sol',
      name: 'Sol',
      kind: 'star',
      role: 'focused',
      href: '/galaxy?focus=sol',
      coordinatesPc: [0, 0, 0],
    },
    {
      id: 'alpha-centauri',
      name: 'Alpha Centauri',
      kind: 'system',
      role: 'selected',
      href: '/galaxy?focus=alpha-centauri',
      coordinatesPc: [-0.47, 1.32, -0.33],
    },
  ],
};

const mockSystemOrientation: MinimapOrientationSummary = {
  scope: 'system',
  anchorId: 'sol',
  anchorName: 'Sol System',
  systemId: 'sol',
  systemName: 'Sol',
  planeInclinationDeg: 60.19,
  outerOrbitalRadiusAu: 30.1,
  orbitingBodyCount: 8,
  focusedMarker: {
    id: 'earth',
    name: 'Earth',
    kind: 'planet',
    role: 'focused',
    href: '/system/sol?focus=earth',
    semiMajorAxisAu: 1.0,
  },
  selectedMarkers: [],
  markers: [
    {
      id: 'sol',
      name: 'Sol',
      kind: 'star',
      role: 'anchor',
      href: '/system/sol',
      semiMajorAxisAu: 0,
    },
    {
      id: 'earth',
      name: 'Earth',
      kind: 'planet',
      role: 'focused',
      href: '/system/sol?focus=earth',
      semiMajorAxisAu: 1.0,
    },
  ],
};

const mockPlanetOrientation: MinimapOrientationSummary = {
  scope: 'planet',
  anchorId: 'earth',
  anchorName: 'Earth',
  systemId: 'sol',
  systemName: 'Sol',
  planeInclinationDeg: 60.19,
  axialTiltDeg: 23.44,
  parentSemiMajorAxisAu: 1.0,
  orbitingBodyCount: 1,
  focusedMarker: null,
  selectedMarkers: [],
  markers: [
    {
      id: 'earth',
      name: 'Earth',
      kind: 'planet',
      role: 'anchor',
      href: '/planet/earth?focus=earth',
    },
    {
      id: 'moon',
      name: 'Moon',
      kind: 'moon',
      role: 'focused',
      href: '/planet/earth?focus=moon',
    },
  ],
};

describe('<Minimap />', () => {
  beforeEach(() => {
    useCameraStore.getState().reset();
  });

  it('returns null when orientation is null', () => {
    const { container } = render(<Minimap orientation={null} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders minimal borderless Map Moves SVG HUD with CORE/ORB/N labels, zoom bar, and .srOnlyMarkers E2E contract', () => {
    useCameraStore.getState().setCameraPose({
      position: [0, -35, 20],
      target: [0, 0, 0],
      up: [0, 0, 1],
    });

    render(<Minimap orientation={mockGalaxyOrientation} />);

    const panel = screen.getByTestId('minimap-panel');
    expect(panel.getAttribute('data-scope')).toBe('galaxy');
    expect(panel.getAttribute('data-anchor-id')).toBe('sol');
    expect(panel.getAttribute('data-system-id')).toBe('sol');
    const heading = screen.getByRole('heading', { name: 'Minimap' });
    expect(heading).toBeInTheDocument();
    expect(heading.id).toBeTruthy();
    expect(heading.id).not.toBe('minimap-panel-heading');
    expect(panel).toHaveAttribute('aria-labelledby', heading.id);

    const slot = screen.getByTestId('minimap-viewport-slot');
    const svg = slot.querySelector('svg[viewBox="0 0 196 128"]');
    expect(svg).not.toBeNull();
    expect(svg?.getAttribute('aria-label')).toBe('Galactic frame orientation minimap');

    expect(svg?.textContent).toContain('CORE');
    expect(svg?.textContent).toContain('ORB');
    expect(svg?.textContent).toContain('N');
    expect(svg?.querySelector(`.${styles.galacticSector}`)).not.toBeNull();
    expect(svg?.querySelector(`.${styles.northStalk}`)).not.toBeNull();
    expect(svg?.querySelector(`.${styles.localViewportRing}`)).not.toBeNull();
    expect(svg?.querySelector(`.${styles.zStalk}`)).toBeNull();

    // Legacy Stage 1 clutter is absent
    expect(screen.queryByTestId('minimap-anchor-name')).toBeNull();
    expect(screen.queryByTestId('minimap-heading')).toBeNull();
    expect(screen.queryByTestId('minimap-elevation')).toBeNull();
    expect(screen.queryByTestId('minimap-parent-plane-ghost')).toBeNull();

    // E2E URL contract markers remain accessible in .srOnlyMarkers
    const markerItems = screen.getAllByTestId('minimap-marker-item');
    expect(markerItems).toHaveLength(2);
    expect(markerItems[0].getAttribute('data-marker-id')).toBe('sol');
    expect(markerItems[0].getAttribute('data-marker-role')).toBe('focused');
    expect(markerItems[1].getAttribute('data-marker-id')).toBe('alpha-centauri');
    expect(markerItems[1].getAttribute('data-marker-role')).toBe('selected');

    const markerLinks = screen.getAllByTestId('minimap-marker-link');
    expect(markerLinks[0].getAttribute('href')).toBe('/galaxy?focus=sol');
    expect(markerLinks[1].getAttribute('href')).toBe('/galaxy?focus=alpha-centauri');

    const markerRoles = screen.getAllByTestId('minimap-marker-role');
    expect(markerRoles[0].textContent).toBe('focused');
    expect(markerRoles[1].textContent).toBe('selected');

    // Zoom bar and focal distance footer
    expect(screen.getByTestId('minimap-telemetry')).toBeInTheDocument();
    expect(screen.getByTestId('minimap-zoom-bar')).toBeInTheDocument();
    expect(screen.getByTestId('minimap-focal-distance').textContent).toBe('40.3 pc');
  });

  it('renders Z-offset stalk when coordinatesPc.z sits above or below Galactic midplane and omits empty .srOnlyMarkers', () => {
    useCameraStore.getState().setCameraPose({
      position: [0, -35, 20],
      target: [0, 0, 0],
      up: [0, 0, 1],
    });

    render(
      <Minimap
        orientation={{
          ...mockGalaxyOrientation,
          coordinatesPc: [1, 2, 120],
          markers: [],
        }}
      />,
    );

    const slot = screen.getByTestId('minimap-viewport-slot');
    expect(slot.querySelector(`.${styles.zStalk}`)).not.toBeNull();
    expect(slot.querySelector(`.${styles.srOnlyMarkers}`)).toBeNull();
    expect(screen.queryByTestId('minimap-marker-item')).toBeNull();
  });

  it('uses spherical fallback pose when camera store is at initial untouched defaults', () => {
    render(<Minimap orientation={mockGalaxyOrientation} />);
    expect(screen.getByTestId('minimap-focal-distance').textContent).toBe('42.0 pc');
  });

  it('renders system and planet scopes with cumulative Galactic Frame tilt and scope focal distance units', () => {
    useCameraStore.getState().setCameraPose({
      position: [-14, -22, 15],
      target: [0, 0, 0],
      up: [0, 0, 1],
    });

    const { rerender } = render(<Minimap orientation={mockGalaxyOrientation} />);
    const slot = screen.getByTestId('minimap-viewport-slot');
    const galaxySector = slot.querySelector(`.${styles.galacticSector}`)?.getAttribute('points');

    rerender(<Minimap orientation={mockSystemOrientation} />);
    expect(screen.getByTestId('minimap-panel').getAttribute('data-scope')).toBe('system');
    expect(screen.getByTestId('minimap-focal-distance').textContent).toContain('AU');
    const systemSector = slot.querySelector(`.${styles.galacticSector}`)?.getAttribute('points');
    expect(systemSector).not.toBe(galaxySector);

    rerender(<Minimap orientation={mockPlanetOrientation} />);
    expect(screen.getByTestId('minimap-panel').getAttribute('data-scope')).toBe('planet');
    expect(screen.getByTestId('minimap-focal-distance').textContent).toContain('km');
    const planetSector = slot.querySelector(`.${styles.galacticSector}`)?.getAttribute('points');
    expect(planetSector).not.toBe(systemSector);
  });

  it('updates live SVG projection and focal distance via rAF when useCameraStore updates', () => {
    let rafCallback: FrameRequestCallback | null = null;
    const origRaf = window.requestAnimationFrame;
    window.requestAnimationFrame = ((cb: FrameRequestCallback) => {
      rafCallback = cb;
      return 1;
    }) as typeof window.requestAnimationFrame;

    try {
      render(<Minimap orientation={mockGalaxyOrientation} />);
      const slot = screen.getByTestId('minimap-viewport-slot');
      const initialNorthY2 = slot.querySelector(`.${styles.northStalk}`)?.getAttribute('y2');
      const initialCoreX2 = slot.querySelector(`.${styles.toCoreVector}`)?.getAttribute('x2');
      expect(screen.getByTestId('minimap-focal-distance').textContent).toBe('42.0 pc');

      act(() => {
        useCameraStore.getState().setCameraPose({
          position: [-80, 0, 0],
          target: [0, 0, 0],
          up: [0, 0, 1],
        });
      });

      act(() => {
        rafCallback?.(performance.now());
      });

      const updatedNorthY2 = slot.querySelector(`.${styles.northStalk}`)?.getAttribute('y2');
      const updatedCoreX2 = slot.querySelector(`.${styles.toCoreVector}`)?.getAttribute('x2');
      expect(screen.getByTestId('minimap-focal-distance').textContent).toBe('80.0 pc');
      expect(updatedNorthY2).not.toBe(initialNorthY2);
      expect(updatedCoreX2).not.toBe(initialCoreX2);
    } finally {
      window.requestAnimationFrame = origRaf;
    }
  });
});
