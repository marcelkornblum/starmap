// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DetailsPanel } from './DetailsPanel';
import type {
  FocusedPlanetEntityDetails,
  FocusedSystemEntityDetails,
} from '../../../services/detailsService';

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
  planetCount: 2,
  planetCompositionBreakdown: [{ composition: 'terrestrial', count: 2 }],
  planetCompositionSummary: '2 terrestrial',
  hasHabitableCandidate: true,
  systemSummary: 'Single G-type star with 2 planets',
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
      massMsun: 0.783,
      radiusRsun: 0.793,
      luminosityLsun: 0.52,
      effectiveTempK: 5344,
    },
  ],
  planets: [
    {
      id: 'tau-ceti-e',
      name: 'Tau Ceti e',
      composition: 'terrestrial',
      semiMajorAxisAu: 0.538,
      periodDays: 162.87,
      eccentricity: 0.18,
      inclinationDeg: 12.4,
      massMearth: 3.93,
      radiusRearth: 1.58,
      equilibriumTempK: 258,
      isHabitableCandidate: true,
    },
  ],
  canonAnnotations: [
    {
      layerId: 'hard-scifi',
      layerTitle: 'Hard Sci-Fi Canon',
      layerHref: '/galaxy?select=layer:hard-scifi',
      href: '/galaxy?focus=tau-ceti&layer=hard-scifi',
      kind: 'fictional-canon',
      targetId: 'tau-ceti',
      targetType: 'system',
      inUniverseName: 'Tau Ceti',
      workTitle: 'Project Hail Mary',
      subtitle: 'Project Hail Mary',
      text: 'Destination star system of the Hail Mary mission.',
    },
  ],
};

const mockPlanetDetails: FocusedPlanetEntityDetails = {
  id: 'earth',
  systemId: 'sol',
  name: 'Earth',
  systemName: 'Sol',
  focusedKind: 'planet',
  hazardCount: 0,
  hazards: [],
  hazardSummaryLabel: '0 hazards',
  spectralType: 'G2V',
  reticleType: 'terrestrial',
  starCount: 1,
  planetCount: 8,
  planetCompositionBreakdown: [{ composition: 'terrestrial', count: 4 }],
  planetCompositionSummary: '4 terrestrial',
  hasHabitableCandidate: true,
  systemSummary: 'The Solar System · Third planet from the Sun',
  systemSummarySegments: [],
  coordinatesPc: [0, 0, 0],
  sectorId: 'sector_00',
  sectorName: 'Sector 00',
  tags: ['HomeSystem'],
  systemDetailsHref: '/planet/earth',
  directionsHref: '/galaxy?focus=sol&anchor=sol',
  centerHref: '/system/sol?center=earth&focus=earth',
  stars: [],
  planets: [],
  orbitingBodies: [
    {
      id: 'moon',
      name: 'Moon',
      href: '/planet/earth?focus=moon',
      categoryLabel: 'Moon',
    },
  ],
  canonAnnotations: [],
  planetTelemetry: {
    composition: 'terrestrial',
    semiMajorAxisAu: 1.0,
    periodDays: 365.256,
    massMearth: 1.0,
    radiusRearth: 1.0,
    surfaceGravityG: 1.0,
    equilibriumTempK: 255,
    isHabitableCandidate: true,
    isTidallyLocked: false,
    hazardCount: 0,
    hazards: [],
  },
};

describe('<DetailsPanel />', () => {
  it('returns null when details is null', () => {
    const { container } = render(<DetailsPanel details={null} isOpen={true} />);
    expect(container.firstChild).toBeNull();
  });

  it('returns null when isOpen is explicitly false', () => {
    const { container } = render(
      <DetailsPanel details={mockSystemDetails} isOpen={false} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders system details across Peek, Partial, and Full sections', () => {
    render(
      <DetailsPanel
        details={mockSystemDetails}
        isOpen={true}
        activeDetent="full"
      />
    );

    const panel = screen.getByTestId('details-panel');
    expect(panel).toBeDefined();
    expect(panel.getAttribute('data-entity-id')).toBe('tau-ceti');
    expect(panel.getAttribute('data-system-id')).toBe('tau-ceti');

    expect(screen.getByTestId('details-detent-peek')).toBeDefined();
    expect(screen.getByTestId('details-detent-partial')).toBeDefined();
    expect(screen.getByTestId('details-detent-full')).toBeDefined();

    expect(screen.getByTestId('details-peek-name').textContent).toBe('Tau Ceti');
    expect(screen.getByText('Project Hail Mary')).toBeDefined();
  });

  it('renders planet details with orbiting bodies', () => {
    render(
      <DetailsPanel
        details={mockPlanetDetails}
        isOpen={true}
        activeDetent="partial"
      />
    );

    const panel = screen.getByTestId('details-panel');
    expect(panel.getAttribute('data-entity-id')).toBe('earth');
    expect(panel.getAttribute('data-focused-kind')).toBe('planet');
    expect(screen.getByText('Moon')).toBeDefined();
  });
});
