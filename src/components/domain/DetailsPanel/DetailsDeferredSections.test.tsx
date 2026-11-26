import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DetailsDeferredPartialLower } from './DetailsDeferredSections';
import type { FocusedSystemEntityDetails } from '../../../services/details/detailsEntityTypes';
import type { OrbitalSchematicSummary } from '../../../services/details/detailsHierarchyTypes';

const mockSystemDetails: FocusedSystemEntityDetails = {
  id: 'tau-ceti',
  systemId: 'tau-ceti',
  name: 'Tau Ceti',
  systemName: 'Tau Ceti',
  focusedKind: 'system',
  hazardCount: 0,
  hazards: [],
  hazardSummaryLabel: '0 hazards',
  spectralType: 'G8.5V',
  reticleType: 'stellar-system',
  starCount: 1,
  planetCount: 1,
  planetCompositionBreakdown: [{ composition: 'terrestrial', count: 1 }],
  planetCompositionSummary: '1 terrestrial',
  hasHabitableCandidate: true,
  systemSummary: 'Single G-type star with 1 planet',
  systemSummarySegments: [],
  coordinatesPc: [-0.94, 2.37, -2.93],
  sectorId: 'sector_01',
  sectorName: 'Sector 01',
  tags: ['SolarNeighborhood10pc', 'HabitableCandidate'],
  systemDetailsHref: '/system/tau-ceti',
  directionsHref: '/galaxy?focus=tau-ceti&anchor=sol',
  centerHref: '/galaxy?center=tau-ceti&focus=tau-ceti',
  stars: [
    {
      id: 'tau-ceti',
      name: 'Tau Ceti',
      componentDesignation: 'A',
      spectralType: 'G8.5V',
      mag: 3.5,
      absmag: 5.68,
    },
  ],
  planets: [
    {
      id: 'tau-ceti-e',
      name: 'Tau Ceti e',
      composition: 'terrestrial',
      semiMajorAxisAu: 0.538,
      isHabitableCandidate: true,
    },
  ],
  canonAnnotations: [],
};

describe('DetailsDeferredSections', () => {
  it('renders DetailsDeferredPartialLower with fallback hierarchy sections when schematic is omitted', () => {
    render(
      <DetailsDeferredPartialLower
        focusedKind="system"
        isSystemFocus={true}
        stars={mockSystemDetails.stars}
        planets={mockSystemDetails.planets}
        systemNameOrId="Tau Ceti"
      />,
    );

    expect(screen.getByTestId('details-planets-section')).toBeInTheDocument();
    expect(screen.getByText('Tau Ceti e')).toBeInTheDocument();
  });

  it('renders OrbitalSchematicPanel once in DetailsDeferredPartialLower when schematic is populated', () => {
    const mockSchematic: OrbitalSchematicSummary = {
      parentId: 'tau-ceti',
      parentName: 'Tau Ceti',
      parentKind: 'system',
      systemId: 'tau-ceti',
      systemName: 'Tau Ceti',
      habitableZoneAu: [0.54, 1.28],
      rows: [
        {
          id: 'tau-ceti-e',
          name: 'Tau Ceti e',
          href: '/system/tau-ceti?focus=tau-ceti-e',
          kind: 'planet',
          reticleType: 'terrestrial',
          tier: 'primary',
          sortDistanceAu: 0.538,
          lineStyle: 'dashed',
          inHabitableZone: true,
          isFocused: true,
          isSelected: false,
        },
      ],
      zones: [],
      minorBodyCount: 0,
      hasMinorToggle: false,
    };

    render(
      <DetailsDeferredPartialLower
        focusedKind="planet"
        isSystemFocus={false}
        schematic={mockSchematic}
        systemNameOrId="Tau Ceti"
      />,
    );

    expect(screen.getAllByTestId('orbital-schematic-panel')).toHaveLength(1);
    expect(screen.getByTestId('orbital-schematic-row')).toBeInTheDocument();
    expect(screen.queryByTestId('details-planets-section')).toBeNull();
  });
});
