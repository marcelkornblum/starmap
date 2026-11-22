import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import {
  OrbitalSchematicPanel,
  OrbitalSchematicItem,
} from './OrbitalSchematicPanel';
import type {
  OrbitalSchematicItem as OrbitalSchematicItemType,
  OrbitalSchematicSummary,
} from '../../../services/details/detailsHierarchyTypes';

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

    expect(screen.getByText('Sol')).toBeInTheDocument();
    expect(screen.getByText('Earth')).toBeInTheDocument();
    expect(screen.getAllByText('Moon').length).toBeGreaterThan(0);
    const heading = screen.getByRole('heading', { level: 2, name: 'Orbital Schematic' });
    expect(heading.getAttribute('data-heading')).toBe('true');
    expect(heading.getAttribute('data-size')).toBe('section');

    const habitableLink = screen.getByTestId('orbital-schematic-habitable-link');
    expect(habitableLink.tagName).toBe('A');
    expect(habitableLink.getAttribute('data-status')).toBe('nominal');
    expect(habitableLink.closest('[data-testid="orbital-schematic-item"]')?.querySelectorAll('a a').length).toBe(0);

    const spectralLink = screen.getByTestId('orbital-schematic-spectral-link');
    expect(spectralLink.tagName).toBe('A');
    expect(spectralLink.getAttribute('data-spectral-badge')).toBe('G2V');
    expect(spectralLink.getAttribute('href')).toContain('/guide/star-types/G2V');
    expect(spectralLink.closest('[data-testid="orbital-schematic-item"]')?.querySelectorAll('a a').length).toBe(0);

    const planetLink = screen.getByTestId('orbital-schematic-planet-type-link');
    expect(planetLink.tagName).toBe('A');
    expect(planetLink.getAttribute('data-category')).toBe('planet');
    expect(planetLink.getAttribute('href')).toContain('/guide/planet-types/Terrestrial');
    expect(planetLink.closest('[data-testid="orbital-schematic-item"]')?.querySelectorAll('a a').length).toBe(0);
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

    expect(screen.getByTestId('orbital-schematic-belt-badge')).toBeInTheDocument();
    expect(screen.getByTestId('orbital-schematic-belt-span')).toBeInTheDocument();
    expect(screen.getByTestId('orbital-schematic-belt-unit-link')).toBeInTheDocument();
  });

  it('renders all deferred items cleanly when list exceeds 8 top-level items and 4 nested moon children', () => {
    const manyMoons: OrbitalSchematicItemType[] = Array.from({ length: 7 }, (_, i) => ({
      id: `moon-${i}`,
      name: `Moon ${i}`,
      href: `/planet/jupiter?focus=moon-${i}`,
      kind: 'moon',
      orbitRank: i + 1,
      summaryLabel: 'Moon',
      inHabitableZone: false,
      isFocused: false,
      isSelected: false,
    }));

    const manyItems: OrbitalSchematicSummary = {
      scope: 'system',
      systemId: 'sol',
      systemName: 'Sol',
      items: Array.from({ length: 12 }, (_, i) => ({
        id: `planet-${i}`,
        name: `Planet ${i}`,
        href: `/planet/planet-${i}`,
        kind: 'planet',
        orbitRank: i + 1,
        summaryLabel: 'Terrestrial',
        inHabitableZone: false,
        isFocused: false,
        isSelected: false,
        children: i === 0 ? manyMoons : undefined,
      })),
    };

    render(<OrbitalSchematicPanel elements={manyItems} />);

    const renderedItems = screen.getAllByTestId('orbital-schematic-item');
    expect(renderedItems).toHaveLength(19);
    expect(screen.getByText('Planet 0')).toBeInTheDocument();
    expect(screen.getByText('Planet 11')).toBeInTheDocument();
    expect(screen.getByText('Moon 0')).toBeInTheDocument();
    expect(screen.getByText('Moon 6')).toBeInTheDocument();
  });

  it('memoises OrbitalSchematicItem structurally so cloned equal items compare equal while focused child updates do not', () => {
    const baseItem: OrbitalSchematicItemType = {
      id: 'earth',
      name: 'Earth',
      href: '/planet/earth',
      kind: 'planet',
      orbitRank: 3,
      summaryLabel: 'Terrestrial',
      inHabitableZone: true,
      region: 'habitable-zone',
      isFocused: false,
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
    };

    const clonedEqualItem: OrbitalSchematicItemType = {
      ...baseItem,
      children: baseItem.children?.map((child) => ({ ...child })),
    };

    const compare = (
      OrbitalSchematicItem as unknown as {
        compare?: (
          prev: { item: OrbitalSchematicItemType },
          next: { item: OrbitalSchematicItemType },
        ) => boolean;
      }
    ).compare;

    expect(compare).toBeTypeOf('function');
    expect(compare?.({ item: baseItem }, { item: clonedEqualItem })).toBe(true);

    const focusedChildItem: OrbitalSchematicItemType = {
      ...baseItem,
      children: baseItem.children?.map((child) => ({
        ...child,
        isFocused: true,
      })),
    };

    expect(compare?.({ item: baseItem }, { item: focusedChildItem })).toBe(false);
  });
});
