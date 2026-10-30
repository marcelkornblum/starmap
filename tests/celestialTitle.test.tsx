// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import {
  CelestialTitle,
} from '../src/components/interface/information/CelestialSymbol';
import { DetailsPanel } from '../src/components/domain/DetailsPanel/DetailsPanel';
import { BodiesPanel } from '../src/components/domain/BodiesPanel/BodiesPanel';
import { Breadcrumbs } from '../src/components/domain/Breadcrumbs/Breadcrumbs';
import { GuideExamplesList } from '../src/components/domain/GuideExamplesList/GuideExamplesList';
import { PreviewPanel } from '../src/components/domain/PreviewPanel/PreviewPanel';
import { LayerCard } from '../src/components/domain/LayerCard/LayerCard';
import { DirectionsPanel } from '../src/components/domain/DirectionsPanel/DirectionsPanel';
import { buildJourneyPlan } from '../src/services/journeyService';
import type {
  FocusedSystemEntityDetails,
  FocusedPlanetEntityDetails,
  BodiesPanelSummary,
  FocusedPreviewSummary,
} from '../src/services/detailsService';
import type { ActiveLayerCardModel } from '../src/services/layerCardService';

/** Helper to assert that firstNode precedes secondNode in document order. */
const expectPrecedes = (firstNode: Node, secondNode: Node) => {
  const position = firstNode.compareDocumentPosition(secondNode);
  expect((position & Node.DOCUMENT_POSITION_FOLLOWING) !== 0).toBe(true);
};

describe('CelestialTitle Component & Reticle-on-Left Standard', () => {
  describe('<CelestialTitle /> Primitives', () => {
    it('renders inline-flex wrapper with data-celestial-title and reticle badge on left', () => {
      render(
        <CelestialTitle
          type="star"
          title="Sol"
          data-testid="celestial-title-sol"
        />,
      );

      const root = screen.getByTestId('celestial-title-sol');
      expect(root.getAttribute('data-celestial-title')).toBe('star');

      const badge = root.querySelector('[data-celestial-badge="star"]');
      expect(badge).not.toBeNull();
      expect(root.textContent).toContain('Sol');

      expectPrecedes(badge!, root.lastChild!);
    });

    it('renders link when href is supplied, forwarding titleTestId and link attributes', () => {
      render(
        <CelestialTitle
          type="terrestrial"
          title="Earth"
          href="/planet/earth"
          titleTestId="earth-title-link"
        />,
      );

      const link = screen.getByTestId('earth-title-link');
      expect(link.getAttribute('href')).toBe('/planet/earth');
      expect(link.textContent).toBe('Earth');

      const badge = link.parentElement?.querySelector('[data-celestial-badge="terrestrial"]');
      expect(badge).not.toBeNull();
      expectPrecedes(badge!, link);
    });

    it('renders specified semantic heading or tag via "as" prop', () => {
      render(
        <CelestialTitle
          type="stellar-system"
          title="Alpha Centauri"
          as="h2"
          titleTestId="alpha-title-heading"
        />,
      );

      const heading = screen.getByRole('heading', { level: 2 });
      expect(heading.getAttribute('data-testid')).toBe('alpha-title-heading');
      expect(heading.textContent).toBe('Alpha Centauri');
    });

    it('forwards symbolHref and symbolTestId to reticle badge', () => {
      render(
        <CelestialTitle
          type="gas-giant"
          title="Jupiter"
          symbolHref="/guide/planet-types/gas-giant"
          symbolTestId="jupiter-symbol"
          titleTestId="jupiter-title"
        />,
      );

      const symbol = screen.getByTestId('jupiter-symbol');
      const symbolLink = symbol.closest('a') ?? symbol;
      expect(symbolLink.getAttribute('href')).toBe('/guide/planet-types/gas-giant');

      const title = screen.getByTestId('jupiter-title');
      expectPrecedes(symbol, title);
    });

    it('respects showTooltip={false} by suppressing Tooltip wrapper', () => {
      const { unmount } = render(
        <CelestialTitle
          type="star"
          title="Vega"
          showTooltip={true}
        />,
      );
      expect(document.querySelector('[role="tooltip"]')).not.toBeNull();
      unmount();

      render(
        <CelestialTitle
          type="star"
          title="Vega"
          showTooltip={false}
        />,
      );
      expect(document.querySelector('[role="tooltip"]')).toBeNull();
    });
  });

  describe('DetailsPanel Reticle Placement', () => {
    const mockSystemFixture: FocusedSystemEntityDetails = {
      id: 'sol',
      systemId: 'sol',
      name: 'Sol',
      systemName: 'Sol',
      focusedKind: 'system',
      hazardCount: 0,
      hazards: [],
      hazardSummaryLabel: '0 hazards',
      spectralType: 'G2V',
      reticleType: 'stellar-system',
      starCount: 1,
      planetCount: 8,
      planetCompositionBreakdown: [],
      planetCompositionSummary: '8 planets',
      hasHabitableCandidate: true,
      systemSummary: 'The Solar System',
      systemSummarySegments: [{ kind: 'text', text: 'The Solar System' }],
      canonAnnotations: [],
      coordinatesPc: [0, 0, 0],
      sectorId: 'sol-sector',
      directionsHref: '/galaxy?focus=sol&route=sol,sol',
      tags: [],
      planets: [
        {
          id: 'earth',
          name: 'Earth',
          composition: 'terrestrial',
          isHabitableCandidate: true,
          semiMajorAxisAu: 1.0,
          periodDays: 365.25,
        },
      ],
      stars: [
        {
          id: 'sol-star',
          name: 'Sol A',
          componentDesignation: 'A',
          spectralType: 'G2V',
          mag: -26.74,
          absmag: 4.83,
        },
      ],
      disks: [
        {
          id: 'asteroid-belt',
          name: 'Main Asteroid Belt',
          kind: 'asteroid-belt',
          kindLabel: 'Asteroid Belt',
          href: '/system/sol?focus=asteroid-belt',
          semiMajorAxisAu: 2.7,
          composition: 'Rocky & metallic planetesimals',
          innerRadiusAu: 2.1,
          outerRadiusAu: 3.3,
          guideHref: '/guide/metrics/semi-major-axis',
        },
      ],
      orbitingBodies: [
        {
          id: 'voyager-1',
          name: 'Voyager 1',
          href: '/system/sol?focus=voyager-1',
          categoryKey: 'spacecraft',
          categoryLabel: 'Spacecraft',
        },
      ],
    };

    it('renders reticle on the left of peek header name', () => {
      render(<DetailsPanel details={mockSystemFixture} />);

      const reticle = screen.getByTestId('details-reticle-type');
      const name = screen.getByTestId('details-peek-name');
      expectPrecedes(reticle, name);
    });

    it('renders reticle on the left of star link in Stars table', () => {
      render(<DetailsPanel details={mockSystemFixture} />);

      const starLink = screen.getByTestId('details-star-name-link');
      const starRow = starLink.closest('tr')!;
      const starReticle = starRow.querySelector('[data-celestial-badge="star"]');
      expect(starReticle).not.toBeNull();
      expectPrecedes(starReticle!, starLink);
    });

    it('renders reticle on left of planet link in first cell, with no separate Type column header', () => {
      render(<DetailsPanel details={mockSystemFixture} />);

      const planetReticle = screen.getByTestId('details-planet-type-link');
      const planetLink = screen.getByTestId('details-planet-name-link');
      expectPrecedes(planetReticle, planetLink);

      const planetsTable = screen.getByTestId('details-planets-list');
      const thead = planetsTable.querySelector('thead')!;
      expect(thead.textContent).toContain('Planet');
      expect(thead.textContent).not.toContain('Type');
    });

    it('renders reticle on left of disk link in first cell, with no separate Classification column header', () => {
      render(<DetailsPanel details={mockSystemFixture} />);

      const diskLink = screen.getByTestId('details-disk-name-link');
      const diskRow = diskLink.closest('tr')!;
      const diskReticle = diskRow.querySelector('[data-celestial-badge="asteroid-belt"]');
      expect(diskReticle).not.toBeNull();
      expectPrecedes(diskReticle!, diskLink);

      const disksTable = screen.getByTestId('details-disks-list');
      const thead = disksTable.querySelector('thead')!;
      expect(thead.textContent).not.toContain('Classification');
    });

    it('renders reticle on left of orbiting body link, with no separate Category column header', () => {
      const mockPlanetWithMoons: FocusedPlanetEntityDetails = {
        id: 'earth',
        systemId: 'sol',
        name: 'Earth',
        systemName: 'Sol',
        focusedKind: 'planet',
        hazardCount: 0,
        hazards: [],
        hazardSummaryLabel: '0 hazards',
        reticleType: 'terrestrial',
        starCount: 1,
        planetCount: 8,
        planetCompositionBreakdown: [],
        planetCompositionSummary: '8 planets',
        hasHabitableCandidate: true,
        systemSummary: 'Earth',
        systemSummarySegments: [],
        coordinatesPc: [0, 0, 0],
        sectorId: 'sol-sector',
        directionsHref: '/system/sol?route=earth,earth',
        stars: [],
        planets: [],
        planetTelemetry: {
          composition: 'terrestrial',
          isHabitableCandidate: true,
          isTidallyLocked: false,
          hazardCount: 0,
          hazards: [],
        },
        orbitingBodies: [
          {
            id: 'moon',
            name: 'Moon',
            href: '/planet/earth?focus=moon',
            categoryKey: 'moon',
            categoryLabel: 'Moon',
          },
        ],
        canonAnnotations: [],
        tags: [],
      };

      render(<DetailsPanel details={mockPlanetWithMoons} />);

      const bodyLink = screen.getByTestId('details-orbiting-body-link');
      const bodyRow = bodyLink.closest('tr')!;
      const bodyReticle = bodyRow.querySelector('[data-celestial-badge="moon"]');
      expect(bodyReticle).not.toBeNull();
      expectPrecedes(bodyReticle!, bodyLink);

      const orbitingTable = screen.getByTestId('details-orbiting-bodies-list');
      const thead = orbitingTable.querySelector('thead')!;
      expect(thead.textContent).not.toContain('Category');
    });
  });

  describe('BodiesPanel Reticle Placement', () => {
    const mockGalaxySummary: BodiesPanelSummary = {
      scope: 'galaxy',
      centerId: 'sol',
      centerName: 'Sol',
      centerCoordinatesPc: [0, 0, 0],
      apertureRadiusPc: 10,
      apertureRadiusLy: 32.6,
      focusedSystemId: 'sol',
      focusedSystemName: 'Sol',
      systems: [
        {
          id: 'sol',
          name: 'Sol',
          href: '/system/sol',
          tier: 'focused',
          reticleType: 'stellar-system',
          spectralType: 'G2V',
          starTypeGuideHref: '/guide/star-types/G2V',
          planetCount: 8,
          hasHabitableCandidate: true,
          habitableZoneGuideHref: '/galaxy?select=tag:habitable-candidate',
          hazardCount: 0,
          hasCriticalHazard: false,
          hazardSummaryLabel: '0 hazards',
          distanceFromFocusPc: 0,
        },
      ],
    };

    const mockSystemBodiesSummary: BodiesPanelSummary = {
      scope: 'system',
      systemId: 'sol',
      systemName: 'Sol',
      systemHref: '/system/sol',
      focusedEntityId: undefined,
      stars: [],
      planets: [],
      moonsAndDwarfPlanets: [],
      minorBodiesAndSpacecraft: [
        {
          id: 'voyager-1',
          name: 'Voyager 1',
          href: '/system/sol?focus=voyager-1',
          categoryKey: 'spacecraft',
          categoryLabel: 'Spacecraft',
        },
      ],
      canonAnnotations: [],
    };

    it('renders bodies-galaxy-system-reticle on left of bodies-galaxy-system-link in first cell', () => {
      render(<BodiesPanel elements={mockGalaxySummary} />);

      const reticle = screen.getByTestId('bodies-galaxy-system-reticle');
      const link = screen.getByTestId('bodies-galaxy-system-link');
      expectPrecedes(reticle, link);

      const table = screen.getByTestId('bodies-galaxy-systems-list');
      const thead = table.querySelector('thead')!;
      expect(thead.textContent).not.toContain('Reticle');
    });

    it('renders minor body reticle on left of bodies-minor-body-link in first cell', () => {
      render(<BodiesPanel elements={mockSystemBodiesSummary} />);

      const bodyLink = screen.getByTestId('bodies-minor-body-link');
      const bodyRow = bodyLink.closest('tr')!;
      const bodyBadge = bodyRow.querySelector('[data-celestial-badge="construct"]');
      expect(bodyBadge).not.toBeNull();
      expectPrecedes(bodyBadge!, bodyLink);

      const table = screen.getByTestId('bodies-minor-bodies-list');
      const thead = table.querySelector('thead')!;
      expect(thead.textContent).not.toContain('Classification');
    });
  });

  describe('Breadcrumbs Reticle Placement', () => {
    it('infers stellar-system for system and terrestrial for planet under Galaxy context', () => {
      render(
        <Breadcrumbs
          items={[
            { label: 'Galaxy', href: '/galaxy' },
            { label: 'Sol', href: '/system/sol' },
            { label: 'Earth' },
          ]}
        />,
      );

      const breadcrumbs = screen.getByTestId('view-breadcrumbs');
      const solLink = within(breadcrumbs).getByRole('link', { name: /Sol/i });
      const earthCurrent = within(breadcrumbs).getByText('Earth');

      const solReticle = solLink.querySelector('[data-celestial-badge="stellar-system"], [data-celestial-symbol="stellar-system"]');
      expect(solReticle).not.toBeNull();
      const solText = within(solLink).getByText('Sol');
      expectPrecedes(solReticle!, solText);

      const earthReticle = earthCurrent.closest('[data-celestial-title]')?.querySelector('[data-celestial-badge="terrestrial"], [data-celestial-symbol="terrestrial"]');
      expect(earthReticle).not.toBeNull();
      expectPrecedes(earthReticle!, earthCurrent);
    });

    it('respects explicit reticleType on breadcrumb item', () => {
      render(
        <Breadcrumbs
          items={[
            { label: 'Galaxy', href: '/galaxy' },
            { label: 'Ceres', reticleType: 'dwarf-planet' },
          ]}
        />,
      );

      const ceresCurrent = screen.getByText('Ceres');
      const dwarfPlanetReticle = ceresCurrent.closest('[data-celestial-title]')?.querySelector('[data-celestial-badge="dwarf-planet"], [data-celestial-symbol="dwarf-planet"]');
      expect(dwarfPlanetReticle).not.toBeNull();
      expectPrecedes(dwarfPlanetReticle!, ceresCurrent);
    });
  });

  describe('GuideExamplesList Reticle Placement', () => {
    it('places header cells inside a table row within the table head', () => {
      render(
        <GuideExamplesList
          examples={[{ name: 'Sol', href: '/system/sol', note: 'G2V main sequence' }]}
        />,
      );

      const headerCells = screen.getAllByRole('columnheader');
      expect(headerCells.length).toBeGreaterThan(0);
      for (const cell of headerCells) {
        expect(cell.parentElement?.tagName).toBe('TR');
        expect(cell.parentElement?.parentElement?.tagName).toBe('THEAD');
      }
    });

    it('renders terrestrial reticle for planet links and star reticle for star links', () => {
      render(
        <GuideExamplesList
          examples={[
            { name: 'Earth', href: '/planet/earth', note: 'Standard terrestrial' },
            { name: 'Sol', href: '/system/sol', note: 'G2V main sequence' },
          ]}
        />,
      );

      const earthLink = screen.getByRole('link', { name: /Earth/i });
      const solLink = screen.getByRole('link', { name: /Sol/i });

      const earthReticle = earthLink.closest('[data-celestial-title]')?.querySelector('[data-celestial-badge="terrestrial"], [data-celestial-symbol="terrestrial"]');
      expect(earthReticle).not.toBeNull();
      expectPrecedes(earthReticle!, earthLink);

      const solReticle = solLink.closest('[data-celestial-title]')?.querySelector('[data-celestial-badge="star"], [data-celestial-symbol="star"]');
      expect(solReticle).not.toBeNull();
      expectPrecedes(solReticle!, solLink);
    });
  });

  describe('PreviewPanel, LayerCard, and DirectionsPanel Reticle Placement', () => {
    it('renders stellar-system reticle on left of preview-target-name in PreviewPanel', () => {
      const previewMock: FocusedPreviewSummary = {
        targetId: 'sol',
        targetName: 'Sol',
        systemId: 'sol',
        systemName: 'Sol',
        focusedKind: 'system',
        previewMode: 'system-orbits',
        orbitElements: [],
      };
      render(<PreviewPanel preview={previewMock} />);

      const targetName = screen.getByTestId('preview-target-name');
      const reticle = targetName.parentElement?.querySelector('[data-celestial-symbol="stellar-system"]');
      expect(reticle).not.toBeNull();
      expectPrecedes(reticle!, targetName);
    });

    it('renders stellar-system reticle on left of layer-card-title in LayerCard item mode', () => {
      const layerMock: ActiveLayerCardModel = {
        mode: 'item',
        layerId: 'recent-discoveries',
        layerSlug: 'recent-discoveries',
        layerTitle: 'Recent Discoveries',
        kind: 'scientific-overlay',
        kindLabel: 'Science & Discovery',
        itemSlug: 'lhs-1140-b',
        itemTitle: 'LHS 1140 b',
        stepIndex: 1,
        totalItems: 5,
        text: 'A promising temperate sub-Neptune / super-Earth.',
        prevHref: '/system/lhs-1140?layer=recent-discoveries:5',
        prevLabel: 'Previous',
        nextHref: '/system/lhs-1140?layer=recent-discoveries:2',
        nextLabel: 'Next',
        overviewHref: '/system/lhs-1140?layer=recent-discoveries',
        closeHref: '/system/lhs-1140',
      };
      render(<LayerCard card={layerMock} />);

      const titleHeading = screen.getByTestId('layer-card-title');
      const reticle = titleHeading.querySelector('[data-celestial-badge="stellar-system"], [data-celestial-symbol="stellar-system"]');
      expect(reticle).not.toBeNull();
      const titleText = within(titleHeading).getByText('LHS 1140 b');
      expectPrecedes(reticle!, titleText);
    });

    it('renders stellar-system reticle on left of directions-route-title in DirectionsPanel', () => {
      const journeyMock = buildJourneyPlan({
        stops: ['sol', 'tau-ceti'],
      });
      render(<DirectionsPanel journey={journeyMock} />);

      const title = screen.getByTestId('directions-route-title');
      const reticle = title.closest('[data-celestial-title]')?.querySelector('[data-celestial-badge="stellar-system"], [data-celestial-symbol="stellar-system"]');
      expect(reticle).not.toBeNull();
      expectPrecedes(reticle!, title);
    });
  });
});
