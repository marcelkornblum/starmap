import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import {
  DetailsDeferredPartialLower,
  DetailsDeferredFull,
} from './DetailsDeferredSections';
import type {
  FocusedSystemEntityDetails,
} from '../../../services/details/detailsEntityTypes';
import type { FocusedPreviewSummary } from '../../../services/details/detailsNavigationTypes';

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
  it('renders DetailsDeferredPartialLower with hierarchy sections', () => {
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

  it('renders DetailsDeferredFull with preview when provided', () => {
    const mockPreview: FocusedPreviewSummary = {
      targetId: 'tau-ceti-e',
      targetName: 'Tau Ceti e',
      systemId: 'tau-ceti',
      systemName: 'Tau Ceti',
      focusedKind: 'planet',
      previewMode: 'planetary-system',
      orbitElements: [],
    };
    render(
      <DetailsDeferredFull
        isSystemFocus={false}
        preview={mockPreview}
      />,
    );

    expect(screen.getByTestId('preview-panel')).toBeInTheDocument();
  });
});
