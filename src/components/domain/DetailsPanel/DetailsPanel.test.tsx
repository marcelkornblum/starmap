import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DetailsPanel } from './DetailsPanel';
import { useUIStore } from '../../../stores/useUIStore';
import type {
  FocusedPlanetEntityDetails,
  FocusedSystemEntityDetails,
} from '../../../services/details/detailsEntityTypes';
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

    expect(screen.getByTestId('details-detent-peek')).toBeInTheDocument();
    expect(screen.getByTestId('details-detent-partial')).toBeInTheDocument();
    expect(screen.getByTestId('details-detent-full')).toBeInTheDocument();

    expect(screen.getByTestId('details-peek-name').textContent).toBe('Tau Ceti');
    expect(screen.getByText('Project Hail Mary')).toBeInTheDocument();
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
    expect(screen.getByText('Moon')).toBeInTheDocument();
  });

  it('renders OrbitalSchematicPanel inside partial detent for system focus without duplicating in full detent or fallback sections', () => {
    const schematic: OrbitalSchematicSummary = {
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
          isFocused: false,
          isSelected: false,
        },
      ],
      zones: [],
      minorBodyCount: 0,
      hasMinorToggle: false,
    };

    const { container } = render(
      <DetailsPanel
        details={mockSystemDetails}
        isOpen={true}
        activeDetent="full"
        schematic={schematic}
      />,
    );

    const partialDetent = container.querySelector('[data-testid="details-detent-partial"]');
    const fullDetent = container.querySelector('[data-testid="details-detent-full"]');
    expect(screen.getAllByTestId('orbital-schematic-panel')).toHaveLength(1);
    expect(partialDetent?.querySelector('[data-testid="orbital-schematic-panel"]')).not.toBeNull();
    expect(fullDetent?.querySelector('[data-testid="orbital-schematic-panel"]')).toBeNull();
    expect(screen.getByTestId('orbital-schematic-row')).toBeInTheDocument();
    expect(screen.queryByTestId('details-stars-section')).toBeNull();
    expect(screen.queryByTestId('details-planets-section')).toBeNull();
  });

  it('renders OrbitalSchematicPanel inside partial detent for planet focus without duplicating in full detent', () => {
    const planetSchematic: OrbitalSchematicSummary = {
      parentId: 'earth',
      parentName: 'Earth',
      parentKind: 'planet',
      systemId: 'sol',
      systemName: 'Sol',
      rows: [
        {
          id: 'moon',
          name: 'Moon',
          href: '/planet/earth?focus=moon',
          kind: 'moon',
          reticleType: 'moon',
          tier: 'primary',
          sortDistanceAu: 0.00257,
          lineStyle: 'dashed',
          inHabitableZone: false,
          isFocused: false,
          isSelected: false,
        },
      ],
      zones: [],
      minorBodyCount: 0,
      hasMinorToggle: false,
    };

    const { container } = render(
      <DetailsPanel
        details={mockPlanetDetails}
        isOpen={true}
        activeDetent="full"
        schematic={planetSchematic}
      />,
    );

    const partialDetent = container.querySelector('[data-testid="details-detent-partial"]');
    const fullDetent = container.querySelector('[data-testid="details-detent-full"]');
    expect(screen.getAllByTestId('orbital-schematic-panel')).toHaveLength(1);
    expect(partialDetent?.querySelector('[data-testid="orbital-schematic-panel"]')).not.toBeNull();
    expect(fullDetent?.querySelector('[data-testid="orbital-schematic-panel"]')).toBeNull();
    expect(screen.getByTestId('orbital-schematic-row')).toBeInTheDocument();
    expect(screen.queryByTestId('details-orbiting-bodies-section')).toBeNull();
  });

  it('forwards detent changes from DetentSheet to useUIStore and onDetentChange prop', () => {
    useUIStore.getState().setDetailsDetent('peek');
    const onDetentChange = vi.fn();
    render(
      <DetailsPanel
        details={mockSystemDetails}
        isOpen={true}
        onDetentChange={onDetentChange}
      />,
    );

    const handle = screen.getByTestId('details-drag-handle');
    fireEvent.click(handle);

    expect(onDetentChange).toHaveBeenCalledWith('partial');
    expect(useUIStore.getState().detailsDetent).toBe('partial');
  });

  it('renders PreviewPanel inside overview mid-stage above CTAs without duplicating in partial or full detents, and keeps Partial lower sections in order', () => {
    const mockPreview = {
      targetId: 'earth',
      targetName: 'Earth',
      systemId: 'sol',
      systemName: 'Sol',
      focusedKind: 'planet' as const,
      previewMode: 'planetary-system' as const,
      orbitElements: [],
    };
    const planetWithCanon: FocusedPlanetEntityDetails = {
      ...mockPlanetDetails,
      canonAnnotations: mockSystemDetails.canonAnnotations,
    };
    const { container } = render(
      <DetailsPanel
        details={planetWithCanon}
        isOpen={true}
        activeDetent="partial"
        preview={mockPreview}
      />,
    );

    const panel = container.querySelector('[data-testid="details-panel"]') as HTMLElement;
    const peekDetent = container.querySelector('[data-testid="details-detent-peek"]');
    const partialDetent = container.querySelector('[data-testid="details-detent-partial"]');
    const fullDetent = container.querySelector('[data-testid="details-detent-full"]');
    const titleRow = peekDetent?.querySelector('[data-overview-title-row="true"]');
    const midStage = peekDetent?.querySelector('[data-testid="details-overview-mid-stage"]');
    const previewPanel = midStage?.querySelector('[data-testid="preview-panel"]');
    const summaryText = midStage?.querySelector('[data-testid="details-system-summary"]');
    const ctaGroup = peekDetent?.querySelector('[data-testid="details-cta-group"]');

    expect(panel.style.getPropertyValue('--detent-expand-progress')).toBe('1');
    expect(titleRow).not.toBeNull();
    expect(midStage).not.toBeNull();
    expect(summaryText).not.toBeNull();
    expect(previewPanel).not.toBeNull();
    expect(ctaGroup).not.toBeNull();
    expect(screen.getAllByTestId('preview-panel')).toHaveLength(1);
    expect(partialDetent?.querySelector('[data-testid="preview-panel"]')).toBeNull();
    expect(fullDetent?.querySelector('[data-testid="preview-panel"]')).toBeNull();
    expect(partialDetent?.querySelector('[data-testid="details-cta-group"]')).toBeNull();

    // Title Row -> Mid-Stage (Prose + PreviewPanel) -> CTA Row in DOM order
    expect(
      titleRow!.compareDocumentPosition(midStage!) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    expect(
      summaryText!.compareDocumentPosition(previewPanel!) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    expect(
      previewPanel!.compareDocumentPosition(ctaGroup!) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBe(Node.DOCUMENT_POSITION_FOLLOWING);

    const orderedSelectors = [
      '[data-testid="details-orbiting-bodies-section"]',
      '[data-testid="details-canon-section"]',
      '[data-testid="details-hazards-section"]',
      '[data-testid="details-quick-telemetry-section"]',
    ];
    const orderedNodes = orderedSelectors.map((sel) => partialDetent?.querySelector(sel));
    orderedNodes.forEach((node) => expect(node).not.toBeNull());
    for (let i = 0; i < orderedNodes.length - 1; i++) {
      const current = orderedNodes[i];
      const next = orderedNodes[i + 1];
      if (!current || !next) {
        throw new Error('Expected ordered partial detent section nodes to be rendered');
      }
      expect(
        current.compareDocumentPosition(next) & Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    }
  });

  it('renders title row and CTA buttons at Peek detent with --detent-expand-progress = 0 and no detent pill buttons', () => {
    render(
      <DetailsPanel
        details={mockPlanetDetails}
        isOpen={true}
        activeDetent="peek"
      />,
    );

    const panel = screen.getByTestId('details-panel');
    expect(panel.getAttribute('data-detent')).toBe('peek');
    expect(panel.style.getPropertyValue('--detent-expand-progress')).toBe('0');

    expect(screen.getByTestId('details-peek-name')).toBeInTheDocument();
    expect(screen.getByTestId('details-button-system-details')).toBeInTheDocument();
    expect(screen.getByTestId('details-button-directions')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^(peek|part|partial|full)$/i })).toBeNull();
  });

  it('collapses and re-expands section bodies when clicking a section heading trigger', () => {
    render(
      <DetailsPanel
        details={mockSystemDetails}
        isOpen={true}
        activeDetent="full"
      />,
    );

    const hazardsTrigger = screen.getByRole('button', { name: /environmental hazards/i });
    expect(hazardsTrigger.getAttribute('aria-expanded')).toBe('true');
    expect(screen.getByTestId('details-hazards-nominal')).toBeInTheDocument();

    fireEvent.click(hazardsTrigger);
    expect(hazardsTrigger.getAttribute('aria-expanded')).toBe('false');
    expect(screen.queryByTestId('details-hazards-nominal')).toBeNull();

    fireEvent.click(hazardsTrigger);
    expect(hazardsTrigger.getAttribute('aria-expanded')).toBe('true');
    expect(screen.getByTestId('details-hazards-nominal')).toBeInTheDocument();

    const telemetryTriggers = screen.getAllByRole('button', { name: /^telemetry$/i });
    const quickTelemetryTrigger = telemetryTriggers[0]!;
    expect(quickTelemetryTrigger.getAttribute('aria-expanded')).toBe('true');
    expect(screen.getByTestId('details-planet-composition')).toBeInTheDocument();

    fireEvent.click(quickTelemetryTrigger);
    expect(quickTelemetryTrigger.getAttribute('aria-expanded')).toBe('false');
    expect(screen.queryByTestId('details-planet-composition')).toBeNull();

    fireEvent.click(quickTelemetryTrigger);
    expect(quickTelemetryTrigger.getAttribute('aria-expanded')).toBe('true');
    expect(screen.getByTestId('details-planet-composition')).toBeInTheDocument();
  });

  it('renders cohesive Hero Block in peek, quick telemetry and hazard Blocks in partial, and full telemetry in full', () => {
    const hazardDetails: FocusedSystemEntityDetails = {
      ...mockSystemDetails,
      hazardCount: 2,
      hazardSummaryLabel: '2 hazards',
      hazards: [
        {
          code: 'RAD-01',
          label: 'High UV Flux',
          severity: 'warning',
          description: 'Elevated stellar UV radiation.',
        },
        {
          code: 'TID-02',
          label: 'Tidal Shear',
          severity: 'critical',
          description: 'Extreme tidal heating.',
        },
      ],
    };

    const { container } = render(
      <DetailsPanel
        details={hazardDetails}
        isOpen={true}
        activeDetent="full"
      />,
    );

    const peekDetent = container.querySelector('[data-testid="details-detent-peek"]');
    expect(peekDetent?.children).toHaveLength(2);
    expect(peekDetent?.children[0].tagName).toBe('H3');
    expect(peekDetent?.children[1]).toHaveAttribute('data-testid', 'details-peek-header');
    expect(peekDetent?.children[1]).toHaveAttribute('data-block', 'true');
    expect(peekDetent?.children[1].querySelector('[data-testid="details-peek-name"]')).not.toBeNull();
    expect(peekDetent?.children[1].querySelector('[data-testid="details-system-summary"]')).not.toBeNull();
    expect(peekDetent?.children[1].querySelector('[data-testid="details-cta-group"]')).not.toBeNull();

    const partialDetent = container.querySelector('[data-testid="details-detent-partial"]');
    expect(partialDetent?.querySelector('[data-testid="details-planet-composition"]')).not.toBeNull();

    const fullDetent = container.querySelector('[data-testid="details-detent-full"]');
    expect(fullDetent?.querySelector('[data-testid="details-planet-composition"]')).toBeNull();
    expect(fullDetent?.querySelector('[data-testid="details-astrometry-section"]')).not.toBeNull();

    const hazardsList = screen.getByTestId('details-hazards-list');
    expect(hazardsList.tagName).toBe('UL');
    const hazardItems = screen.getAllByTestId('details-hazard-item');
    expect(hazardItems).toHaveLength(2);
    expect(hazardItems[0].tagName).toBe('LI');
    expect(hazardItems[0]).toHaveAttribute('data-block', 'true');
    expect(hazardItems[0]).toHaveAttribute('data-status', 'caution');
    expect(hazardItems[0]).toHaveAttribute('data-hazard-severity', 'warning');
    expect(hazardItems[1]).toHaveAttribute('data-status', 'critical');
    expect(screen.getByText('Elevated stellar UV radiation.')).toBeInTheDocument();
  });

  it('renders planet reticle and habitable zone badge with label inside peek Hero Block for planet focus without duplicate composition link', () => {
    const { container } = render(
      <DetailsPanel
        details={mockPlanetDetails}
        isOpen={true}
        activeDetent="full"
      />,
    );

    const peekHeader = container.querySelector('[data-testid="details-peek-header"]');
    const reticleBadge = peekHeader?.querySelector('[data-testid="details-reticle-type"]');
    const habitableLink = peekHeader?.querySelector('[data-testid="details-planet-habitable-link"]');
    expect(reticleBadge).toHaveAttribute('data-celestial-badge', 'terrestrial');
    expect(peekHeader?.querySelector('[data-testid="details-planet-type-link"]')).toBeNull();
    expect(habitableLink).not.toBeNull();
    expect(habitableLink?.textContent).toMatch(/habitable zone/i);
  });
});
