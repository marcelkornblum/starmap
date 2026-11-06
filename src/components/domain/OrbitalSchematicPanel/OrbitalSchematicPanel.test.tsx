// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import {
  OrbitalSchematicPanel,
  OrbitalSchematicItem,
} from './OrbitalSchematicPanel';
import type { OrbitalSchematicSummary } from '../../../services/detailsService';

const mockSchematicSummary: OrbitalSchematicSummary = {
  scope: 'system',
  systemId: 'sol',
  systemName: 'Sol',
  habitableZoneAu: [0.95, 1.37],
  items: [
    {
      id: 'sol',
      name: 'Sol',
      href: '/system/sol?focus=sol',
      kind: 'star',
      orbitRank: 0,
      summaryLabel: 'G2V',
      inHabitableZone: false,
      isFocused: false,
      isSelected: false,
    },
    {
      id: 'earth',
      name: 'Earth',
      href: '/planet/earth',
      kind: 'planet',
      orbitRank: 3,
      summaryLabel: 'Terrestrial',
      inHabitableZone: true,
      region: 'habitable-zone',
      isFocused: true,
      isSelected: false,
      children: [
        {
          id: 'moon',
          name: 'Moon',
          href: '/planet/earth?focus=moon',
          kind: 'moon',
          orbitRank: 1,
          summaryLabel: 'Moon',
          inHabitableZone: false,
          isFocused: false,
          isSelected: false,
        },
      ],
    },
  ],
};

describe('<OrbitalSchematicPanel />', () => {
  it('returns null when elements is null', () => {
    const { container } = render(<OrbitalSchematicPanel elements={null} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders orbital schematic panel with hierarchical items and habitable badge', () => {
    render(<OrbitalSchematicPanel elements={mockSchematicSummary} />);

    const panel = screen.getByTestId('orbital-schematic-panel');
    expect(panel.getAttribute('data-scope')).toBe('system');
    expect(panel.getAttribute('data-system-id')).toBe('sol');

    const lists = screen.getAllByTestId('orbital-schematic-list');
    expect(lists.length).toBe(2);

    expect(screen.getByText('Sol')).toBeDefined();
    expect(screen.getByText('Earth')).toBeDefined();
    expect(screen.getAllByText('Moon').length).toBeGreaterThan(0);
    expect(screen.getByTestId('orbital-schematic-habitable-link')).toBeDefined();
  });

  it('renders belt item with radialSpanAu and unit link', () => {
    render(
      <OrbitalSchematicItem
        item={{
          id: 'asteroid-belt',
          name: 'Asteroid Belt',
          href: '/system/sol?focus=asteroid-belt',
          kind: 'belt',
          orbitRank: 4,
          summaryLabel: 'Asteroid Belt',
          inHabitableZone: false,
          isFocused: false,
          isSelected: false,
          radialSpanAu: [2.1, 3.3],
        }}
      />
    );

    expect(screen.getByTestId('orbital-schematic-belt-badge')).toBeDefined();
    expect(screen.getByTestId('orbital-schematic-belt-span')).toBeDefined();
    expect(screen.getByTestId('orbital-schematic-belt-unit-link')).toBeDefined();
  });
});
