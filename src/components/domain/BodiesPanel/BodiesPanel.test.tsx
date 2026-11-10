// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BodiesPanel } from './BodiesPanel';
import { SpatialEntityProvider } from '../../canvas/entity/SpatialEntityContext';

const renderWithProvider = (ui: React.ReactElement) =>
  render(<SpatialEntityProvider>{ui}</SpatialEntityProvider>);
import type {
  GalaxyBodiesSummary,
  PlanetaryBodiesSummary,
  SystemBodiesSummary,
} from '../../../services/detailsService';

const mockGalaxyFixture: GalaxyBodiesSummary = {
  scope: 'galaxy',
  centerId: 'sol',
  centerName: 'Sol',
  centerCoordinatesPc: [0, 0, 0],
  apertureRadiusPc: 10,
  apertureRadiusLy: 32.62,
  focusedSystemId: 'sol',
  focusedSystemName: 'Sol',
  systems: [
    {
      id: 'sol',
      name: 'Sol',
      href: '/galaxy?focus=sol',
      tier: 'focused',
      reticleType: 'stellar-system',
      spectralType: 'G2V',
      starTypeGuideHref: '/guide/star-types/G2V',
      planetCount: 8,
      hasHabitableCandidate: true,
      habitableZoneGuideHref: '/galaxy?select=tag:habitable-candidate',
      hazardCount: 0,
      hazardSummaryLabel: '0 hazards',
      hasCriticalHazard: false,
      distanceFromFocusPc: 0,
      distanceFromFocusLy: 0,
      distanceGuideHref: '/guide/metrics/distance?focus=sol',
    },
    {
      id: 'alpha-centauri',
      name: 'Alpha Centauri',
      href: '/galaxy?focus=alpha-centauri',
      tier: 'active',
      reticleType: 'stellar-system',
      spectralType: 'G2V',
      starTypeGuideHref: '/guide/star-types/G2V',
      planetCount: 1,
      hasHabitableCandidate: true,
      habitableZoneGuideHref: '/galaxy?select=tag:habitable-candidate',
      hazardCount: 1,
      hazardSummaryLabel: '1 hazard',
      hasCriticalHazard: true,
      distanceFromFocusPc: 1.34,
      distanceFromFocusLy: 4.37,
      distanceGuideHref: '/guide/metrics/distance?focus=alpha-centauri',
    },
  ],
};

const mockSystemFixture: SystemBodiesSummary = {
  scope: 'system',
  systemId: 'sol',
  systemName: 'Sol',
  systemHref: '/system/sol',
  focusedEntityId: 'earth',
  selectedEntityIds: ['earth'],
  stars: [
    {
      id: 'sol',
      name: 'Sol',
      componentDesignation: 'A',
      spectralType: 'G2V',
      mag: -26.74,
      absmag: 4.83,
      massMsun: 1.0,
      radiusRsun: 1.0,
      luminosityLsun: 1.0,
      effectiveTempK: 5778,
      href: '/system/sol?focus=sol',
    },
  ],
  planets: [
    {
      id: 'earth',
      name: 'Earth',
      composition: 'terrestrial',
      semiMajorAxisAu: 1.0,
      periodDays: 365.256,
      massMearth: 1.0,
      isHabitableCandidate: true,
      href: '/planet/earth',
    },
  ],
  moonsAndDwarfPlanets: [],
  minorBodiesAndSpacecraft: [
    {
      id: 'voyager-1',
      name: 'Voyager 1',
      href: '/system/sol?focus=voyager-1',
      categoryLabel: 'Spacecraft',
    },
  ],
  canonAnnotations: [],
};

const mockPlanetFixture: PlanetaryBodiesSummary = {
  scope: 'planet',
  planetId: 'earth',
  planetName: 'Earth',
  planetHref: '/planet/earth',
  systemId: 'sol',
  systemName: 'Sol',
  systemHref: '/system/sol',
  focusedEntityId: 'moon',
  selectedEntityIds: ['moon'],
  planetDetail: {
    id: 'earth',
    name: 'Earth',
    composition: 'terrestrial',
    semiMajorAxisAu: 1.0,
    periodDays: 365.256,
    massMearth: 1.0,
    equilibriumTempK: 255,
    isHabitableCandidate: true,
    href: '/planet/earth',
  },
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

describe('<BodiesPanel />', () => {
  it('returns null when elements is null', () => {
    const { container } = renderWithProvider(<BodiesPanel elements={null} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders galaxy scope with distance caption and handles hover interactions', () => {
    const onHoverEntity = vi.fn();
    renderWithProvider(
      <BodiesPanel
        elements={mockGalaxyFixture}
        onHoverEntity={onHoverEntity}
      />
    );

    const panel = screen.getByTestId('bodies-panel');
    expect(panel.getAttribute('data-scope')).toBe('galaxy');
    expect(panel.getAttribute('data-center-id')).toBe('sol');
    expect(screen.getByText('Distances from Sol')).toBeDefined();

    const systemItems = screen.getAllByTestId('bodies-galaxy-system-item');
    expect(systemItems.length).toBe(2);

    fireEvent.mouseEnter(systemItems[0]);
    expect(onHoverEntity).toHaveBeenCalledWith('sol');

    fireEvent.mouseLeave(systemItems[0]);
    expect(onHoverEntity).toHaveBeenCalledWith(null);

    fireEvent.focus(systemItems[1]);
    expect(onHoverEntity).toHaveBeenCalledWith('alpha-centauri');

    fireEvent.blur(systemItems[1]);
    expect(onHoverEntity).toHaveBeenCalledWith(null);
  });

  it('renders system scope with orbital schematic and minor bodies', () => {
    renderWithProvider(<BodiesPanel elements={mockSystemFixture} />);

    const panel = screen.getByTestId('bodies-panel');
    expect(panel.getAttribute('data-scope')).toBe('system');
    expect(panel.getAttribute('data-system-id')).toBe('sol');
    expect(screen.getByTestId('orbital-schematic-panel')).toBeDefined();
    expect(screen.getByTestId('bodies-minor-bodies-section')).toBeDefined();
    expect(screen.getByText('Voyager 1')).toBeDefined();
  });

  it('renders planetary scope', () => {
    renderWithProvider(<BodiesPanel elements={mockPlanetFixture} />);

    const panel = screen.getByTestId('bodies-panel');
    expect(panel.getAttribute('data-scope')).toBe('planet');
    expect(panel.getAttribute('data-planet-id')).toBe('earth');
  });
});
