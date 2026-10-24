import { describe, it, expect } from 'vitest';
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
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

describe('CelestialTitle Component & Reticle-on-Left Standard', () => {
  describe('<CelestialTitle /> Primitives', () => {
    it('renders inline-flex wrapper with data-celestial-title and reticle badge on left', () => {
      const html = renderToString(
        createElement(CelestialTitle, {
          type: 'star',
          title: 'Sol',
          'data-testid': 'celestial-title-sol',
        }),
      );

      expect(html).toContain('data-testid="celestial-title-sol"');
      expect(html).toContain('data-celestial-title="star"');
      expect(html).toContain('data-celestial-badge="star"');
      expect(html).toContain('Sol');

      const badgeIdx = html.indexOf('data-celestial-badge="star"');
      const titleIdx = html.indexOf('Sol');
      expect(badgeIdx).toBeGreaterThan(-1);
      expect(titleIdx).toBeGreaterThan(-1);
      expect(badgeIdx).toBeLessThan(titleIdx);
    });

    it('renders link when href is supplied, forwarding titleTestId and link attributes', () => {
      const html = renderToString(
        createElement(CelestialTitle, {
          type: 'terrestrial',
          title: 'Earth',
          href: '/planet/earth',
          titleTestId: 'earth-title-link',
        }),
      );

      expect(html).toContain('href="/planet/earth"');
      expect(html).toContain('data-testid="earth-title-link"');
      expect(html).toContain('Earth');

      const badgeIdx = html.indexOf('data-celestial-badge="terrestrial"');
      const linkIdx = html.indexOf('data-testid="earth-title-link"');
      expect(badgeIdx).toBeLessThan(linkIdx);
    });

    it('renders specified semantic heading or tag via "as" prop', () => {
      const html = renderToString(
        createElement(CelestialTitle, {
          type: 'stellar-system',
          title: 'Alpha Centauri',
          as: 'h2',
          titleTestId: 'alpha-title-heading',
        }),
      );

      expect(html).toMatch(/<h2[^>]*data-testid="alpha-title-heading"[^>]*>Alpha Centauri<\/h2>/);
    });

    it('forwards symbolHref and symbolTestId to reticle badge', () => {
      const html = renderToString(
        createElement(CelestialTitle, {
          type: 'gas-giant',
          title: 'Jupiter',
          symbolHref: '/guide/planet-types/gas-giant',
          symbolTestId: 'jupiter-symbol',
          titleTestId: 'jupiter-title',
        }),
      );

      expect(html).toContain('data-testid="jupiter-symbol"');
      expect(html).toContain('href="/guide/planet-types/gas-giant"');
      expect(html).toContain('data-testid="jupiter-title"');
      expect(html.indexOf('data-testid="jupiter-symbol"')).toBeLessThan(
        html.indexOf('data-testid="jupiter-title"'),
      );
    });

    it('respects showTooltip={false} by suppressing Tooltip wrapper', () => {
      const withTooltipHtml = renderToString(
        createElement(CelestialTitle, {
          type: 'star',
          title: 'Vega',
          showTooltip: true,
        }),
      );
      const withoutTooltipHtml = renderToString(
        createElement(CelestialTitle, {
          type: 'star',
          title: 'Vega',
          showTooltip: false,
        }),
      );

      expect(withTooltipHtml).toContain('role="tooltip"');
      expect(withoutTooltipHtml).not.toContain('role="tooltip"');
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
      const html = renderToString(
        createElement(DetailsPanel, { details: mockSystemFixture }),
      );

      const reticleIdx = html.indexOf('data-testid="details-reticle-type"');
      const nameIdx = html.indexOf('data-testid="details-peek-name"');
      expect(reticleIdx).toBeGreaterThan(-1);
      expect(nameIdx).toBeGreaterThan(-1);
      expect(reticleIdx).toBeLessThan(nameIdx);
    });

    it('renders reticle on the left of star link in Stars table', () => {
      const html = renderToString(
        createElement(DetailsPanel, { details: mockSystemFixture }),
      );

      expect(html).toContain('data-testid="details-star-name-link"');
      const starLinkIdx = html.indexOf('data-testid="details-star-name-link"');
      const starReticleIdx = html.lastIndexOf('data-celestial-badge="star"', starLinkIdx);
      expect(starReticleIdx).toBeGreaterThan(-1);
      expect(starReticleIdx).toBeLessThan(starLinkIdx);
    });

    it('renders reticle on left of planet link in first cell, with no separate Type column header', () => {
      const html = renderToString(
        createElement(DetailsPanel, { details: mockSystemFixture }),
      );

      expect(html).toContain('data-testid="details-planet-type-link"');
      expect(html).toContain('data-testid="details-planet-name-link"');
      expect(html).toContain('data-testid="details-planet-habitable-link"');

      const planetReticleIdx = html.indexOf('data-testid="details-planet-type-link"');
      const planetNameIdx = html.indexOf('data-testid="details-planet-name-link"');
      expect(planetReticleIdx).toBeLessThan(planetNameIdx);

      // Verify that the table header contains "Planet" but NOT a separate "Type" header cell
      const planetsTableStart = html.indexOf('data-testid="details-planets-list"');
      const planetsTableHead = html.substring(
        planetsTableStart,
        html.indexOf('</thead>', planetsTableStart),
      );
      expect(planetsTableHead).toContain('>Planet<');
      expect(planetsTableHead).not.toContain('>Type<');
    });

    it('renders reticle on left of disk link in first cell, with no separate Classification column header', () => {
      const html = renderToString(
        createElement(DetailsPanel, { details: mockSystemFixture }),
      );

      expect(html).toContain('data-testid="details-disk-name-link"');
      const diskLinkIdx = html.indexOf('data-testid="details-disk-name-link"');
      const diskReticleIdx = html.lastIndexOf('data-celestial-badge="asteroid-belt"', diskLinkIdx);
      expect(diskReticleIdx).toBeGreaterThan(-1);
      expect(diskReticleIdx).toBeLessThan(diskLinkIdx);

      const disksTableStart = html.indexOf('data-testid="details-disks-list"');
      const disksTableHead = html.substring(
        disksTableStart,
        html.indexOf('</thead>', disksTableStart),
      );
      expect(disksTableHead).not.toContain('>Classification<');
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

      const html = renderToString(
        createElement(DetailsPanel, { details: mockPlanetWithMoons }),
      );

      expect(html).toContain('data-testid="details-orbiting-body-link"');
      const bodyLinkIdx = html.indexOf('data-testid="details-orbiting-body-link"');
      const bodyReticleIdx = html.lastIndexOf('data-celestial-badge="moon"', bodyLinkIdx);
      expect(bodyReticleIdx).toBeGreaterThan(-1);
      expect(bodyReticleIdx).toBeLessThan(bodyLinkIdx);

      const orbitingTableStart = html.indexOf('data-testid="details-orbiting-bodies-list"');
      const orbitingTableHead = html.substring(
        orbitingTableStart,
        html.indexOf('</thead>', orbitingTableStart),
      );
      expect(orbitingTableHead).not.toContain('>Category<');
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
      const html = renderToString(
        createElement(BodiesPanel, { elements: mockGalaxySummary }),
      );

      expect(html).toContain('data-testid="bodies-galaxy-system-reticle"');
      expect(html).toContain('data-testid="bodies-galaxy-system-link"');

      const reticleIdx = html.indexOf('data-testid="bodies-galaxy-system-reticle"');
      const linkIdx = html.indexOf('data-testid="bodies-galaxy-system-link"');
      expect(reticleIdx).toBeLessThan(linkIdx);

      // Verify header does not contain "Reticle"
      const tableHead = html.substring(
        html.indexOf('data-testid="bodies-galaxy-systems-list"'),
        html.indexOf('</thead'),
      );
      expect(tableHead).not.toContain('>Reticle<');
    });

    it('renders minor body reticle on left of bodies-minor-body-link in first cell', () => {
      const html = renderToString(
        createElement(BodiesPanel, { elements: mockSystemBodiesSummary }),
      );

      expect(html).toContain('data-testid="bodies-minor-body-link"');
      const bodyLinkIdx = html.indexOf('data-testid="bodies-minor-body-link"');
      const bodyBadgeIdx = html.lastIndexOf('data-celestial-badge="construct"', bodyLinkIdx);
      expect(bodyBadgeIdx).toBeGreaterThan(-1);
      expect(bodyBadgeIdx).toBeLessThan(bodyLinkIdx);

      const tableHead = html.substring(
        html.indexOf('data-testid="bodies-minor-bodies-list"'),
        html.indexOf('</thead'),
      );
      expect(tableHead).not.toContain('>Classification<');
    });
  });

  describe('Breadcrumbs Reticle Placement', () => {
    it('infers stellar-system for system and terrestrial for planet under Galaxy context', () => {
      const html = renderToString(
        createElement(Breadcrumbs, {
          items: [
            { label: 'Galaxy', href: '/galaxy' },
            { label: 'Sol', href: '/system/sol' },
            { label: 'Earth' },
          ],
        }),
      );

      expect(html).toContain('data-testid="view-breadcrumbs"');

      const solLinkIdx = html.indexOf('>Sol<');
      const earthCurrentIdx = html.indexOf('>Earth<');

      const solReticleIdx = html.lastIndexOf('data-celestial-symbol="stellar-system"', solLinkIdx);
      const earthReticleIdx = html.lastIndexOf('data-celestial-symbol="terrestrial"', earthCurrentIdx);

      expect(solReticleIdx).toBeGreaterThan(-1);
      expect(solReticleIdx).toBeLessThan(solLinkIdx);

      expect(earthReticleIdx).toBeGreaterThan(solLinkIdx);
      expect(earthReticleIdx).toBeLessThan(earthCurrentIdx);
    });

    it('respects explicit reticleType on breadcrumb item', () => {
      const html = renderToString(
        createElement(Breadcrumbs, {
          items: [
            { label: 'Galaxy', href: '/galaxy' },
            { label: 'Ceres', reticleType: 'dwarf-planet' },
          ],
        }),
      );

      const ceresIdx = html.indexOf('>Ceres<');
      const dwarfPlanetReticleIdx = html.lastIndexOf('data-celestial-symbol="dwarf-planet"', ceresIdx);
      expect(dwarfPlanetReticleIdx).toBeGreaterThan(-1);
      expect(dwarfPlanetReticleIdx).toBeLessThan(ceresIdx);
    });
  });

  describe('GuideExamplesList Reticle Placement', () => {
    it('renders terrestrial reticle for planet links and star reticle for star links', () => {
      const html = renderToString(
        createElement(GuideExamplesList, {
          examples: [
            { name: 'Earth', href: '/planet/earth', note: 'Standard terrestrial' },
            { name: 'Sol', href: '/system/sol', note: 'G2V main sequence' },
          ],
        }),
      );

      expect(html).toContain('data-testid="guide-examples-list"');
      const earthIdx = html.indexOf('>Earth<');
      const solIdx = html.indexOf('>Sol<');

      const earthReticleIdx = html.lastIndexOf('data-celestial-symbol="terrestrial"', earthIdx);
      const solReticleIdx = html.lastIndexOf('data-celestial-symbol="star"', solIdx);

      expect(earthReticleIdx).toBeGreaterThan(-1);
      expect(earthReticleIdx).toBeLessThan(earthIdx);

      expect(solReticleIdx).toBeGreaterThan(earthIdx);
      expect(solReticleIdx).toBeLessThan(solIdx);
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
      const html = renderToString(createElement(PreviewPanel, { preview: previewMock }));

      const reticleIdx = html.indexOf('data-celestial-symbol="stellar-system"');
      const nameIdx = html.indexOf('data-testid="preview-target-name"');
      expect(reticleIdx).toBeGreaterThan(-1);
      expect(reticleIdx).toBeLessThan(nameIdx);
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
      const html = renderToString(createElement(LayerCard, { card: layerMock }));

      const titleIdx = html.indexOf('data-testid="layer-card-title"');
      const reticleIdx = html.indexOf('data-celestial-symbol="stellar-system"', titleIdx);
      const textIdx = html.indexOf('LHS 1140 b', titleIdx);
      expect(reticleIdx).toBeGreaterThan(-1);
      expect(reticleIdx).toBeLessThan(textIdx);
    });

    it('renders stellar-system reticle on left of directions-route-title in DirectionsPanel', () => {
      const journeyMock = buildJourneyPlan({
        stops: ['sol', 'tau-ceti'],
      });
      const html = renderToString(createElement(DirectionsPanel, { journey: journeyMock }));

      const titleIdx = html.indexOf('data-testid="directions-route-title"');
      const reticleIdx = html.indexOf('data-celestial-symbol="stellar-system"', titleIdx);
      const nameIdx = html.indexOf('Sol → Tau Ceti', titleIdx);
      expect(reticleIdx).toBeGreaterThan(-1);
      expect(reticleIdx).toBeLessThan(nameIdx);
    });
  });
});
