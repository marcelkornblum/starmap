import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { BodiesPanel } from './BodiesPanel';
import { BodiesMinorBodyRow, type BodiesMinorBodyRowProps } from './BodiesMinorBodyRow';
import { SpatialEntityProvider } from '../../canvas/entity/SpatialEntityProvider';
import { SpatialEntityStoreContext } from '../../canvas/entity/SpatialEntityContext';
import { createSpatialEntityStore } from '../../canvas/entity/SpatialEntityStore';

const renderWithProvider = (ui: React.ReactElement) =>
  render(<SpatialEntityProvider>{ui}</SpatialEntityProvider>);
import type {
  GalaxyBodiesSummary,
  PlanetaryBodiesSummary,
  SystemBodiesSummary,
} from '../../../services/details/detailsHierarchyTypes';

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
    expect(screen.getByText('Distances from Sol')).toBeInTheDocument();

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

  it('renders system scope with primary Block rows (stars, planets, disks, dwarf planets), minor bodies, and no orbital-schematic-panel', () => {
    const richSystemFixture: SystemBodiesSummary = {
      ...mockSystemFixture,
      selectedEntityIds: ['earth', 'sol'],
      disks: [
        {
          id: 'main-belt',
          name: 'Main Asteroid Belt',
          kind: 'asteroid-belt',
          kindLabel: 'Asteroid Belt',
          href: '/system/sol?focus=main-belt',
          innerRadiusAu: 2.2,
          outerRadiusAu: 3.2,
          semiMajorAxisAu: 2.7,
          composition: 'Silicate and carbonaceous asteroids',
          guideHref: '/guide/metrics/semi-major-axis',
        },
      ],
      moonsAndDwarfPlanets: [
        {
          id: 'ceres',
          name: '1 Ceres',
          href: '/system/sol?focus=ceres',
          categoryKey: 'dwarf-planet',
          categoryLabel: 'Dwarf Planet',
        },
      ],
    };

    renderWithProvider(<BodiesPanel elements={richSystemFixture} />);

    const panel = screen.getByTestId('bodies-panel');
    expect(panel.getAttribute('data-scope')).toBe('system');
    expect(panel.getAttribute('data-system-id')).toBe('sol');
    expect(screen.queryByTestId('orbital-schematic-panel')).toBeNull();

    const primaryList = screen.getByTestId('bodies-primary-list');
    expect(primaryList.tagName).toBe('UL');
    const primaryItems = screen.getAllByTestId('bodies-primary-item');
    expect(primaryItems).toHaveLength(4);
    expect(primaryItems[0]).toHaveAttribute('data-entity-id', 'sol');
    expect(primaryItems[0]).toHaveAttribute('data-block', 'true');
    expect(primaryItems[0]).toHaveAttribute('data-selected', 'true');
    expect(primaryItems[0]).not.toHaveAttribute('data-focused');

    expect(primaryItems[1]).toHaveAttribute('data-entity-id', 'earth');
    expect(primaryItems[1]).toHaveAttribute('data-focused', 'true');
    expect(primaryItems[1]).toHaveAttribute('data-selected', 'true');

    expect(primaryItems[2]).toHaveAttribute('data-entity-id', 'main-belt');
    expect(primaryItems[3]).toHaveAttribute('data-entity-id', 'ceres');

    expect(screen.getByText('G2V')).toBeInTheDocument();
    expect(screen.getByText('Terrestrial')).toBeInTheDocument();
    expect(screen.getByText('Asteroid Belt')).toBeInTheDocument();
    expect(screen.getByText('Dwarf Planet')).toBeInTheDocument();

    const minorBodiesSection = screen.getByTestId('bodies-minor-bodies-section');
    expect(minorBodiesSection).toBeInTheDocument();

    const heading = screen.getByRole('heading', { level: 3, name: /minor bodies/i });
    expect(heading).toBeInTheDocument();
    expect(heading.parentElement).toBe(minorBodiesSection);
    expect(heading.getAttribute('data-size')).toBe('eyebrow');

    expect(screen.getByText('Voyager 1')).toBeInTheDocument();
  });

  it('renders empty state when no primary orbital bodies are catalogued', () => {
    const emptySystemFixture: SystemBodiesSummary = {
      ...mockSystemFixture,
      stars: [],
      planets: [],
      disks: [],
      moonsAndDwarfPlanets: [],
      minorBodiesAndSpacecraft: [],
    };

    renderWithProvider(<BodiesPanel elements={emptySystemFixture} />);
    expect(screen.getByTestId('bodies-primary-empty')).toHaveTextContent(
      'No catalogued orbital bodies',
    );
  });

  it('renders planetary scope with host planet and moons as primary Block rows', () => {
    renderWithProvider(<BodiesPanel elements={mockPlanetFixture} />);

    const panel = screen.getByTestId('bodies-panel');
    expect(panel.getAttribute('data-scope')).toBe('planet');
    expect(panel.getAttribute('data-planet-id')).toBe('earth');
    expect(screen.queryByTestId('orbital-schematic-panel')).toBeNull();

    const primaryItems = screen.getAllByTestId('bodies-primary-item');
    expect(primaryItems).toHaveLength(2);
    expect(primaryItems[0]).toHaveAttribute('data-entity-id', 'earth');
    expect(primaryItems[1]).toHaveAttribute('data-entity-id', 'moon');
    expect(primaryItems[1]).toHaveAttribute('data-focused', 'true');
    expect(primaryItems[1]).toHaveAttribute('data-selected', 'true');
    expect(screen.getByRole('link', { name: 'Moon' })).toBeInTheDocument();
  });

  it('syncs primary row hover and focus to SpatialEntityStore without re-rendering system-scope BodiesPanel', () => {
    const store = createSpatialEntityStore();
    const onRender = vi.fn();

    render(
      <SpatialEntityStoreContext.Provider value={store}>
        <React.Profiler id="bodies-panel-system" onRender={onRender}>
          <BodiesPanel elements={mockSystemFixture} />
        </React.Profiler>
      </SpatialEntityStoreContext.Provider>,
    );

    expect(onRender).toHaveBeenCalled();
    onRender.mockClear();

    const primaryItems = screen.getAllByTestId('bodies-primary-item');
    fireEvent.mouseEnter(primaryItems[0]);
    expect(store.getState().hoveredId).toBe('sol');
    expect(onRender).not.toHaveBeenCalled();

    fireEvent.mouseLeave(primaryItems[0]);
    expect(store.getState().hoveredId).toBeNull();
    expect(onRender).not.toHaveBeenCalled();

    fireEvent.focus(primaryItems[1]);
    expect(store.getState().hoveredId).toBe('earth');
    expect(onRender).not.toHaveBeenCalled();

    fireEvent.blur(primaryItems[1]);
    expect(store.getState().hoveredId).toBeNull();
    expect(onRender).not.toHaveBeenCalled();

    act(() => {
      store.getState().setHovered('earth');
    });

    expect(onRender).not.toHaveBeenCalled();
  });

  it('compares minor-body rows structurally via BodiesMinorBodyRow memo comparator', () => {
    const compare = (
      BodiesMinorBodyRow as unknown as {
        compare?: (prev: BodiesMinorBodyRowProps, next: BodiesMinorBodyRowProps) => boolean;
      }
    ).compare;
    const baseBody = {
      id: 'ceres',
      name: 'Ceres',
      href: '/system/sol?focus=ceres',
      categoryKey: 'asteroid' as const,
      categoryLabel: 'Minor Body',
    };

    expect(compare).toBeTypeOf('function');
    expect(
      compare?.(
        { body: baseBody, isFocused: false, isSelected: false },
        { body: { ...baseBody }, isFocused: false, isSelected: false },
      ),
    ).toBe(true);

    expect(
      compare?.(
        { body: baseBody, isFocused: false, isSelected: false },
        { body: { ...baseBody }, isFocused: true, isSelected: false },
      ),
    ).toBe(false);
  });

  it('paginates large minor-body lists initially and reveals more on button click', () => {
    const manyMinorBodies = Array.from({ length: 120 }, (_, idx) => ({
      id: `asteroid-${idx}`,
      name: `Asteroid ${idx}`,
      href: `/system/sol?focus=asteroid-${idx}`,
      categoryKey: 'asteroid' as const,
      categoryLabel: 'Minor Body',
    }));

    renderWithProvider(
      <BodiesPanel
        elements={{
          ...mockSystemFixture,
          focusedEntityId: 'asteroid-99',
          minorBodiesAndSpacecraft: manyMinorBodies,
        }}
      />,
    );

    expect(screen.getAllByTestId('bodies-minor-body-item')).toHaveLength(51);
    expect(screen.getByText('Asteroid 99')).toBeInTheDocument();

    const showMoreBtn = screen.getByTestId('bodies-minor-bodies-show-more');
    expect(showMoreBtn).toBeInTheDocument();

    fireEvent.click(showMoreBtn);
    expect(screen.getAllByTestId('bodies-minor-body-item')).toHaveLength(100);
    expect(screen.getByTestId('bodies-minor-bodies-show-more')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('bodies-minor-bodies-show-more'));
    expect(screen.getAllByTestId('bodies-minor-body-item')).toHaveLength(120);
    expect(screen.queryByTestId('bodies-minor-bodies-show-more')).toBeNull();
  });
});
