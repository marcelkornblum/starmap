import { describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import type { OrbitalSchematicSummary } from '../../../services/details/detailsHierarchyTypes';
import { SpatialEntityProvider } from '../../canvas/entity/SpatialEntityProvider';
import { createSpatialEntityStore } from '../../canvas/entity/SpatialEntityStore';
import { OrbitalSchematicPanel } from './OrbitalSchematicPanel';

const solSchematicFixture: OrbitalSchematicSummary = {
  parentId: 'sol',
  parentName: 'Sol',
  parentKind: 'system',
  systemId: 'sol',
  systemName: 'Sol',
  habitableZoneAu: [0.75, 1.77],
  minorBodyCount: 4,
  hasMinorToggle: true,
  zones: [
    {
      id: 'main-asteroid-belt',
      name: 'Main Asteroid Belt',
      href: '/system/sol?focus=main-asteroid-belt',
      kind: 'belt',
      innerRadiusAu: 2.06,
      outerRadiusAu: 3.27,
      sortDistanceAu: 2.66,
      isFocused: false,
      isSelected: false,
    },
  ],
  rows: [
    {
      id: 'mercury',
      name: 'Mercury',
      href: '/planet/mercury',
      kind: 'planet',
      reticleType: 'terrestrial',
      tier: 'primary',
      sortDistanceAu: 0.387,
      lineStyle: 'dashed',
      inHabitableZone: false,
      isFocused: false,
      isSelected: false,
    },
    {
      id: 'earth',
      name: 'Earth',
      href: '/planet/earth',
      kind: 'planet',
      reticleType: 'terrestrial',
      tier: 'primary',
      sortDistanceAu: 1.0,
      lineStyle: 'dashed',
      inHabitableZone: true,
      isFocused: true,
      isSelected: true,
    },
    {
      id: 'mars',
      name: 'Mars',
      href: '/planet/mars',
      kind: 'planet',
      reticleType: 'terrestrial',
      tier: 'primary',
      sortDistanceAu: 1.524,
      lineStyle: 'dashed',
      inHabitableZone: true,
      isFocused: false,
      isSelected: false,
    },
    {
      id: 'ceres',
      name: '1 Ceres',
      href: '/system/sol?focus=ceres',
      kind: 'dwarf-planet',
      reticleType: 'dwarf-planet',
      tier: 'primary',
      sortDistanceAu: 2.767,
      lineStyle: 'dashed',
      inHabitableZone: false,
      isFocused: false,
      isSelected: false,
      zoneId: 'main-asteroid-belt',
    },
    {
      id: 'vesta',
      name: '4 Vesta',
      href: '/system/sol?focus=vesta',
      kind: 'minor-body',
      reticleType: 'asteroid',
      tier: 'minor',
      sortDistanceAu: 2.362,
      lineStyle: 'dashed',
      inHabitableZone: false,
      isFocused: false,
      isSelected: false,
      zoneId: 'main-asteroid-belt',
    },
    {
      id: 'pallas',
      name: '2 Pallas',
      href: '/system/sol?focus=pallas',
      kind: 'minor-body',
      reticleType: 'asteroid',
      tier: 'minor',
      sortDistanceAu: 2.773,
      lineStyle: 'dashed',
      inHabitableZone: false,
      isFocused: false,
      isSelected: false,
      zoneId: 'main-asteroid-belt',
    },
    {
      id: 'voyager-1',
      name: 'Voyager 1',
      href: '/system/sol?focus=voyager-1',
      kind: 'spacecraft',
      reticleType: 'construct',
      tier: 'minor',
      sortDistanceAu: 166.0,
      lineStyle: 'dotted',
      inHabitableZone: false,
      isFocused: false,
      isSelected: false,
    },
    {
      id: 'oumuamua',
      name: '1I/ʻOumuamua',
      href: '/system/sol?focus=oumuamua',
      kind: 'comet',
      reticleType: 'comet',
      tier: 'minor',
      sortDistanceAu: 210.0,
      lineStyle: 'dotted',
      inHabitableZone: false,
      isFocused: false,
      isSelected: false,
    },
  ],
};

const saturnRingFixture: OrbitalSchematicSummary = {
  parentId: 'saturn',
  parentName: 'Saturn',
  parentKind: 'planet',
  systemId: 'sol',
  systemName: 'Sol',
  minorBodyCount: 0,
  hasMinorToggle: false,
  zones: [
    {
      id: 'saturn-main-rings',
      name: 'Saturn Main Rings (D–F)',
      kind: 'ring-system',
      innerRadiusAu: 0.00045,
      outerRadiusAu: 0.00094,
      sortDistanceAu: 0.0007,
      isFocused: false,
      isSelected: false,
    },
    {
      id: 'saturn-e-ring',
      name: 'Saturn E Ring',
      kind: 'ring-system',
      innerRadiusAu: 0.0012,
      outerRadiusAu: 0.0032,
      sortDistanceAu: 0.0022,
      isFocused: false,
      isSelected: false,
    },
  ],
  rows: [
    {
      id: 'mimas',
      name: 'Mimas',
      href: '/planet/saturn?focus=mimas',
      kind: 'moon',
      reticleType: 'moon',
      tier: 'primary',
      sortDistanceAu: 0.00124,
      lineStyle: 'dashed',
      inHabitableZone: false,
      isFocused: false,
      isSelected: false,
      zoneId: 'saturn-e-ring',
    },
    {
      id: 'enceladus',
      name: 'Enceladus',
      href: '/planet/saturn?focus=enceladus',
      kind: 'moon',
      reticleType: 'moon',
      tier: 'primary',
      sortDistanceAu: 0.00159,
      lineStyle: 'dashed',
      inHabitableZone: false,
      isFocused: true,
      isSelected: true,
      zoneId: 'saturn-e-ring',
    },
    {
      id: 'tethys',
      name: 'Tethys',
      href: '/planet/saturn?focus=tethys',
      kind: 'moon',
      reticleType: 'moon',
      tier: 'primary',
      sortDistanceAu: 0.00197,
      lineStyle: 'dashed',
      inHabitableZone: false,
      isFocused: false,
      isSelected: false,
      zoneId: 'saturn-e-ring',
    },
    {
      id: 'dione',
      name: 'Dione',
      href: '/planet/saturn?focus=dione',
      kind: 'moon',
      reticleType: 'moon',
      tier: 'primary',
      sortDistanceAu: 0.00252,
      lineStyle: 'dashed',
      inHabitableZone: false,
      isFocused: false,
      isSelected: false,
      zoneId: 'saturn-e-ring',
    },
  ],
};

const tauCetiDebrisFixture: OrbitalSchematicSummary = {
  parentId: 'tau-ceti',
  parentName: 'Tau Ceti',
  parentKind: 'system',
  systemId: 'tau-ceti',
  systemName: 'Tau Ceti',
  minorBodyCount: 0,
  hasMinorToggle: false,
  zones: [
    {
      id: 'tau-ceti-debris-disk',
      name: 'Tau Ceti Debris Disk',
      href: '/system/tau-ceti?focus=tau-ceti-debris-disk',
      kind: 'debris-disk',
      innerRadiusAu: 10,
      outerRadiusAu: 55,
      sortDistanceAu: 32.5,
      isFocused: true,
      isSelected: false,
    },
  ],
  rows: [],
};

describe('<OrbitalSchematicPanel />', () => {
  it('returns null when elements is null or has neither rows nor zones', () => {
    const { container, rerender } = render(<OrbitalSchematicPanel elements={null} />);
    expect(container.firstChild).toBeNull();

    rerender(
      <OrbitalSchematicPanel
        elements={{
          parentId: 'empty',
          parentName: 'Empty',
          parentKind: 'system',
          systemId: 'empty',
          systemName: 'Empty',
          rows: [],
          zones: [],
          minorBodyCount: 0,
          hasMinorToggle: false,
        }}
      />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders header with collapsible Orbiting Bodies eyebrow heading and Legend link pointing to /guide/legend', () => {
    render(<OrbitalSchematicPanel elements={solSchematicFixture} />);

    const panel = screen.getByTestId('orbital-schematic-panel');
    expect(panel.getAttribute('data-parent-id')).toBe('sol');
    expect(panel.getAttribute('data-parent-kind')).toBe('system');
    expect(panel.getAttribute('data-system-id')).toBe('sol');

    const heading = screen.getByRole('heading', { level: 4, name: 'Orbiting Bodies' });
    expect(heading.getAttribute('data-heading')).toBe('true');
    expect(heading.getAttribute('data-size')).toBe('eyebrow');

    const legendLink = screen.getByTestId('orbital-schematic-legend-link');
    expect(legendLink.tagName).toBe('A');
    expect(legendLink.getAttribute('href')).toContain('/guide/legend');
  });

  it('toggles stage visibility when tapping the Orbiting Bodies title button', () => {
    render(<OrbitalSchematicPanel elements={solSchematicFixture} />);

    const toggle = screen.getByTestId('orbital-schematic-toggle');
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    expect(screen.getByTestId('orbital-schematic-stage')).toBeInTheDocument();

    fireEvent.click(toggle);
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    expect(screen.queryByTestId('orbital-schematic-stage')).toBeNull();

    fireEvent.click(toggle);
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    expect(screen.getByTestId('orbital-schematic-stage')).toBeInTheDocument();
  });

  it('renders pure track rows with large unbordered symbol, line-style cue, right-aligned name, and zero inline telemetry numbers', () => {
    render(<OrbitalSchematicPanel elements={solSchematicFixture} />);

    const rows = screen.getAllByTestId('orbital-schematic-row');
    expect(rows).toHaveLength(4);

    const earthRow = rows.find((el) => el.getAttribute('data-entity-id') === 'earth');
    expect(earthRow).toBeDefined();
    expect(earthRow?.tagName).toBe('A');
    expect(earthRow?.getAttribute('href')).toBe('/planet/earth');
    expect(earthRow?.getAttribute('data-line-style')).toBe('dashed');
    expect(earthRow?.getAttribute('data-focused')).toBe('true');
    expect(earthRow?.getAttribute('data-selected')).toBe('true');
    expect(earthRow?.textContent).toBe('Earth');
    expect(earthRow?.textContent).not.toMatch(/AU|km|M⊕|Terrestrial/i);

    const symbol = earthRow?.querySelector('[data-celestial-symbol="terrestrial"][data-size="lg"]');
    expect(symbol).not.toBeNull();
    expect(symbol?.parentElement?.className).toContain('symbolSlot');
    expect(earthRow?.querySelector('[class*="symbolHalo"]')).toBeNull();
  });

  it('groups contiguous habitable zone rows inside a single feathered hzGroup', () => {
    render(<OrbitalSchematicPanel elements={solSchematicFixture} />);

    const hzGroups = screen.getAllByTestId('orbital-schematic-hz-group');
    expect(hzGroups).toHaveLength(1);
    expect(hzGroups[0].getAttribute('data-in-habitable-zone')).toBe('true');

    const hzRows = hzGroups[0].querySelectorAll('[data-testid="orbital-schematic-row"]');
    expect(hzRows).toHaveLength(2);
    expect(hzRows[0].getAttribute('data-entity-id')).toBe('earth');
    expect(hzRows[1].getAttribute('data-entity-id')).toBe('mars');
  });

  it('renders unified zone bands with midpoint title slot at floor(N / 2) and standalone bands for empty zones', () => {
    const { rerender } = render(<OrbitalSchematicPanel elements={saturnRingFixture} />);

    const zones = screen.getAllByTestId('orbital-schematic-zone');
    expect(zones).toHaveLength(2);

    const mainRings = zones[0];
    expect(mainRings.getAttribute('data-region-kind')).toBe('ring-system');
    expect(mainRings.querySelectorAll('[data-testid="orbital-schematic-row"]')).toHaveLength(0);
    const mainRingsTitle = mainRings.querySelector('[data-testid="orbital-schematic-zone-title"]');
    expect(mainRingsTitle?.tagName).toBe('SPAN');
    expect(mainRingsTitle?.textContent).toBe('Saturn Main Rings (D–F)');

    const eRing = zones[1];
    expect(eRing.getAttribute('data-region-kind')).toBe('ring-system');
    const eRingChildren = Array.from(eRing.children);
    expect(eRingChildren.map((el) => el.getAttribute('data-entity-id') ?? el.getAttribute('data-testid'))).toEqual([
      'mimas',
      'enceladus',
      'orbital-schematic-zone-title',
      'tethys',
      'dione',
    ]);
    const eRingTitle = eRing.querySelector('[data-testid="orbital-schematic-zone-title"]');
    expect(eRingTitle?.tagName).toBe('SPAN');
    expect(eRingTitle?.textContent).toBe('Saturn E Ring');

    rerender(<OrbitalSchematicPanel elements={tauCetiDebrisFixture} />);
    const debrisZone = screen.getByTestId('orbital-schematic-zone');
    expect(debrisZone.getAttribute('data-region-kind')).toBe('debris-disk');
    expect(debrisZone.getAttribute('data-focused')).toBe('true');
    const debrisTitle = screen.getByTestId('orbital-schematic-zone-title');
    expect(debrisTitle.tagName).toBe('A');
    expect(debrisTitle.getAttribute('href')).toBe('/system/tau-ceti?focus=tau-ceti-debris-disk');
  });

  it('shows minor-bodies toggle only when hasMinorToggle is true and toggles dotted hyperbolic rows', () => {
    const { rerender } = render(<OrbitalSchematicPanel elements={saturnRingFixture} />);
    expect(screen.queryByTestId('orbital-schematic-minor-toggle')).toBeNull();

    rerender(<OrbitalSchematicPanel elements={solSchematicFixture} />);
    const toggle = screen.getByTestId('orbital-schematic-minor-toggle');
    expect(toggle.getAttribute('aria-pressed')).toBe('false');
    expect(toggle.textContent).toBe('Show minor bodies (4)');
    expect(screen.getAllByTestId('orbital-schematic-row')).toHaveLength(4);

    fireEvent.click(toggle);
    expect(toggle.getAttribute('aria-pressed')).toBe('true');
    expect(toggle.textContent).toBe('Hide minor bodies');
    const expandedRows = screen.getAllByTestId('orbital-schematic-row');
    expect(expandedRows).toHaveLength(8);
    const voyager = expandedRows.find((el) => el.getAttribute('data-entity-id') === 'voyager-1');
    expect(voyager?.getAttribute('data-line-style')).toBe('dotted');

    fireEvent.click(toggle);
    expect(toggle.getAttribute('aria-pressed')).toBe('false');
    expect(screen.getAllByTestId('orbital-schematic-row')).toHaveLength(4);
  });

  it('resets minor-bodies disclosure when parentId changes', () => {
    const { rerender } = render(<OrbitalSchematicPanel elements={solSchematicFixture} />);
    fireEvent.click(screen.getByTestId('orbital-schematic-minor-toggle'));
    expect(screen.getByTestId('orbital-schematic-minor-toggle').getAttribute('aria-pressed')).toBe('true');

    rerender(
      <OrbitalSchematicPanel
        elements={{
          ...solSchematicFixture,
          parentId: 'sol-alt',
        }}
      />,
    );
    expect(screen.getByTestId('orbital-schematic-minor-toggle').getAttribute('aria-pressed')).toBe('false');
  });

  it('syncs hover and focus events on rows and clickable zones to SpatialEntityStore and onHoverEntity', () => {
    const store = createSpatialEntityStore();
    const onHoverEntity = vi.fn();

    render(
      <SpatialEntityProvider store={store}>
        <OrbitalSchematicPanel
          elements={solSchematicFixture}
          onHoverEntity={onHoverEntity}
        />
      </SpatialEntityProvider>,
    );

    const earthRow = screen
      .getAllByTestId('orbital-schematic-row')
      .find((el) => el.getAttribute('data-entity-id') === 'earth')!;

    fireEvent.mouseEnter(earthRow);
    expect(store.getState().hoveredId).toBe('earth');
    expect(onHoverEntity).toHaveBeenLastCalledWith('earth');

    fireEvent.mouseLeave(earthRow);
    expect(store.getState().hoveredId).toBeNull();
    expect(onHoverEntity).toHaveBeenLastCalledWith(null);

    const beltTitle = screen.getByTestId('orbital-schematic-zone-title');
    expect(beltTitle.tagName).toBe('A');
    fireEvent.focus(beltTitle);
    expect(store.getState().hoveredId).toBe('main-asteroid-belt');
    expect(onHoverEntity).toHaveBeenLastCalledWith('main-asteroid-belt');

    fireEvent.blur(beltTitle);
    expect(store.getState().hoveredId).toBeNull();
    expect(onHoverEntity).toHaveBeenLastCalledWith(null);
  });
});
