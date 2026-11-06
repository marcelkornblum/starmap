// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Minimap } from './Minimap';
import type { MinimapOrientationSummary } from '../../../services/detailsService';

const mockGalaxyOrientation: MinimapOrientationSummary = {
  scope: 'galaxy',
  anchorId: 'sol',
  anchorName: 'Sol',
  systemId: 'sol',
  systemName: 'Sol',
  coordinatesPc: [0, 0, 0],
  distanceFromOriginPc: 0,
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

const mockPlanetOrientation: MinimapOrientationSummary = {
  scope: 'planet',
  anchorId: 'earth',
  anchorName: 'Earth',
  systemId: 'sol',
  systemName: 'Sol',
  parentSemiMajorAxisAu: 1.0,
  orbitingBodyCount: 1,
  focusedMarker: null,
  selectedMarkers: [],
  markers: [],
};

describe('<Minimap />', () => {
  it('returns null when orientation is null', () => {
    const { container } = render(<Minimap orientation={null} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders galaxy orientation with anchor, coordinates, and markers', () => {
    render(<Minimap orientation={mockGalaxyOrientation} />);

    const panel = screen.getByTestId('minimap-panel');
    expect(panel.getAttribute('data-scope')).toBe('galaxy');
    expect(panel.getAttribute('data-anchor-id')).toBe('sol');

    expect(screen.getByTestId('minimap-anchor-name').textContent).toBe('Sol');
    expect(screen.getByTestId('minimap-telemetry')).toBeDefined();
    expect(screen.getByTestId('minimap-coordinates').textContent).toContain('0, 0, 0');

    const markers = screen.getAllByTestId('minimap-marker-item');
    expect(markers.length).toBe(2);
    expect(screen.getByText('Alpha Centauri')).toBeDefined();
  });

  it('renders planet orientation with system badge and telemetry', () => {
    render(<Minimap orientation={mockPlanetOrientation} />);

    const panel = screen.getByTestId('minimap-panel');
    expect(panel.getAttribute('data-scope')).toBe('planet');
    expect(panel.getAttribute('data-anchor-id')).toBe('earth');

    expect(screen.getByText('Earth')).toBeDefined();
    expect(screen.getByText('Sol')).toBeDefined();
    expect(screen.getByTestId('minimap-orbiting-count')).toBeDefined();
  });
});
