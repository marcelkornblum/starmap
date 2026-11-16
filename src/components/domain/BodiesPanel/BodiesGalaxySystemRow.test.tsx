import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DataTable } from '../../interface';
import {
  BodiesGalaxySystemRow,
  type GalaxySystemItem,
} from './BodiesGalaxySystemRow';

const BASE_ITEM: GalaxySystemItem = {
  id: 'sol',
  name: 'Sol',
  href: '/system/sol',
  tier: 'focused',
  reticleType: 'star',
  spectralType: 'G2V',
  starTypeGuideHref: '/guides/star-type/g',
  planetCount: 8,
  hasHabitableCandidate: true,
  habitableZoneGuideHref: '/guides/habitable-zone',
  hazardCount: 1,
  hazardSummaryLabel: 'Solar Flare Risk',
  hasCriticalHazard: false,
  distanceFromFocusPc: 0,
  distanceFromFocusLy: 0,
  distanceGuideHref: '/guides/metric/distance',
};

const NON_FOCUSED_ITEM: GalaxySystemItem = {
  id: 'alpha-centauri',
  name: 'Alpha Centauri',
  href: '/system/alpha-centauri',
  tier: 'active',
  reticleType: 'star',
  spectralType: 'G2V',
  starTypeGuideHref: '/guides/star-type/g',
  planetCount: 3,
  hasHabitableCandidate: true,
  habitableZoneGuideHref: '/guides/habitable-zone',
  hazardCount: 0,
  hazardSummaryLabel: '',
  hasCriticalHazard: false,
  distanceFromFocusPc: 1.34,
  distanceFromFocusLy: 4.37,
  distanceGuideHref: '/guides/metric/distance',
};

describe('BodiesGalaxySystemRow', () => {
  it('renders row attributes for focused and selected state', () => {
    render(
      <DataTable>
        <DataTable.Body>
          <BodiesGalaxySystemRow
            sys={BASE_ITEM}
            isItemFocused={true}
            isItemSelected={false}
            isItemHovered={false}
          />
        </DataTable.Body>
      </DataTable>,
    );

    const row = screen.getByTestId('bodies-galaxy-system-item');
    expect(row).toHaveAttribute('data-system-id', 'sol');
    expect(row).toHaveAttribute('data-focused', 'true');
    expect(row).not.toHaveAttribute('data-selected');
    expect(row).toHaveAttribute('data-tier', 'focused');
  });

  it('renders selected attribute when selected', () => {
    render(
      <DataTable>
        <DataTable.Body>
          <BodiesGalaxySystemRow
            sys={NON_FOCUSED_ITEM}
            isItemFocused={false}
            isItemSelected={true}
            isItemHovered={true}
          />
        </DataTable.Body>
      </DataTable>,
    );

    const row = screen.getByTestId('bodies-galaxy-system-item');
    expect(row).toHaveAttribute('data-system-id', 'alpha-centauri');
    expect(row).toHaveAttribute('data-selected', 'true');
    expect(row).toHaveAttribute('data-hovered', 'true');
  });

  it('renders focused origin badge when tier is focused and distanceFromFocusPc is 0', () => {
    render(
      <DataTable>
        <DataTable.Body>
          <BodiesGalaxySystemRow
            sys={BASE_ITEM}
            isItemFocused={true}
            isItemSelected={false}
            isItemHovered={false}
          />
        </DataTable.Body>
      </DataTable>,
    );

    expect(screen.getByTestId('bodies-focused-origin-badge')).toBeInTheDocument();
    expect(screen.getByText('Focused')).toBeInTheDocument();
  });

  it('renders pc and ly distance quantities when not origin', () => {
    render(
      <DataTable>
        <DataTable.Body>
          <BodiesGalaxySystemRow
            sys={NON_FOCUSED_ITEM}
            isItemFocused={false}
            isItemSelected={false}
            isItemHovered={false}
          />
        </DataTable.Body>
      </DataTable>,
    );

    expect(screen.queryByTestId('bodies-focused-origin-badge')).toBeNull();
    const distanceCluster = screen.getByTestId('bodies-system-distance');
    expect(distanceCluster).toBeInTheDocument();
    expect(distanceCluster).toHaveTextContent('1.34');
    expect(distanceCluster).toHaveTextContent('4.37');
    expect(screen.getByTestId('bodies-distance-unit-link')).toHaveAttribute(
      'href',
      '/guides/metric/distance',
    );
  });

  it('handles mouseEnter, mouseLeave, focus, and blur callbacks', () => {
    const handleHover = vi.fn();
    render(
      <DataTable>
        <DataTable.Body>
          <BodiesGalaxySystemRow
            sys={BASE_ITEM}
            isItemFocused={false}
            isItemSelected={false}
            isItemHovered={false}
            onHoverEntity={handleHover}
          />
        </DataTable.Body>
      </DataTable>,
    );

    const row = screen.getByTestId('bodies-galaxy-system-item');

    fireEvent.mouseEnter(row);
    expect(handleHover).toHaveBeenCalledWith('sol');

    fireEvent.mouseLeave(row);
    expect(handleHover).toHaveBeenCalledWith(null);

    fireEvent.focus(row);
    expect(handleHover).toHaveBeenCalledWith('sol');

    fireEvent.blur(row);
    expect(handleHover).toHaveBeenCalledWith(null);
  });
});
