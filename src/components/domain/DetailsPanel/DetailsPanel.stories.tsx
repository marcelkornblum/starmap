import type { Meta, StoryObj } from '@storybook/react-vite';
import type {
  FocusedEntityDetails,
  FocusedMinorBodyEntityDetails,
  FocusedPlanetEntityDetails,
  FocusedStarEntityDetails,
  FocusedStructureEntityDetails,
  FocusedSystemEntityDetails,
} from '../../../services/detailsService';
import type { DetentLevel } from '../../interface/surfaces/DetentSheet';
import { DetailsPanel } from './DetailsPanel';
import { Stack } from '../../interface/layouts/Stack/Stack';

import storyStyles from '../domainStories.module.css';

const systemDetailsFixture: FocusedSystemEntityDetails = {
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
  planetCount: 4,
  planetCompositionBreakdown: [
    { composition: 'terrestrial', count: 3 },
    { composition: 'ice-giant', count: 1 },
  ],
  planetCompositionSummary: '3 terrestrial · 1 ice-giant',
  hasHabitableCandidate: true,
  systemSummary:
    'Single G-type star with 4 planets including potential habitable candidates',
  systemSummarySegments: [
    { kind: 'spectral-badge', spectralType: 'G8.5V' },
    { kind: 'text', text: '· 4 planets · ' },
    { kind: 'habitable-badge', label: 'habitable zone candidate' },
  ],
  coordinatesPc: [-0.94, 2.37, -2.93],
  sectorId: 'sector_-000_+002_-003',
  sectorName: 'sector_-000_+002_-003',
  tags: ['SolarNeighborhood10pc', 'ExoplanetHost', 'HabitableCandidate'],
  systemDetailsHref: '/system/tau-ceti',
  directionsHref: '/galaxy/tau-ceti?anchor=sol',
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
      discoveryYear: 2017,
      discoveryMethod: 'Radial Velocity',
      isHabitableCandidate: true,
    },
    {
      id: 'tau-ceti-f',
      name: 'Tau Ceti f',
      composition: 'terrestrial',
      semiMajorAxisAu: 1.334,
      periodDays: 636.1,
      eccentricity: 0.16,
      inclinationDeg: 14.1,
      massMearth: 3.93,
      isHabitableCandidate: false,
    },
  ],
  canonAnnotations: [
    {
      layerId: 'hard-scifi',
      layerTitle: 'Hard Sci-Fi Canon',
      layerHref: '/galaxy?select=layer:hard-scifi&layer=hard-scifi',
      href: '/galaxy/tau-ceti?select=layer:hard-scifi&layer=hard-scifi:tau-ceti',
      kind: 'fictional-canon',
      targetId: 'tau-ceti',
      targetType: 'system',
      inUniverseName: 'Tau Ceti',
      workTitle: 'Project Hail Mary (Andy Weir)',
      text: 'Destination star system of the Hail Mary mission to synthesize Taumoeba.',
      tags: ['Project Hail Mary', 'Adrian'],
    },
  ],
};

const starDetailsFixture: FocusedStarEntityDetails = {
  id: 'alpha-centauri-a',
  systemId: 'alpha-centauri',
  name: 'Alpha Centauri A',
  systemName: 'Alpha Centauri',
  focusedKind: 'star',
  hazardCount: 0,
  hazards: [],
  hazardSummaryLabel: '0 hazards',
  spectralType: 'G2V',
  reticleType: 'star',
  starCount: 3,
  planetCount: 2,
  planetCompositionBreakdown: [{ composition: 'terrestrial', count: 2 }],
  planetCompositionSummary: '2 terrestrial',
  hasHabitableCandidate: true,
  systemSummary: 'Triple star system (Rigil Kentaurus / Toliman / Proxima)',
  systemSummarySegments: [
    { kind: 'spectral-badge', spectralType: 'G2V' },
    { kind: 'text', text: '· Component A' },
  ],
  coordinatesPc: [-0.47, 1.32, -0.33],
  sectorId: 'sector_-000_+001_-000',
  sectorName: 'sector_-000_+001_-000',
  tags: ['HomeNeighborhood', 'NakedEye', 'SolarNeighborhood10pc'],
  directionsHref: '/galaxy/alpha-centauri?anchor=sol',
  centerHref: '/galaxy?center=alpha-centauri-a&focus=alpha-centauri-a',
  stars: [
    {
      id: 'alpha-centauri-a',
      name: 'Alpha Centauri A',
      componentDesignation: 'A',
      spectralType: 'G2V',
      mag: -0.01,
      absmag: 4.38,
      massMsun: 1.1,
      radiusRsun: 1.22,
      luminosityLsun: 1.519,
      effectiveTempK: 5790,
    },
    {
      id: 'alpha-centauri-b',
      name: 'Alpha Centauri B',
      componentDesignation: 'B',
      spectralType: 'K1V',
      mag: 1.33,
      absmag: 5.71,
      massMsun: 0.907,
      radiusRsun: 0.86,
      luminosityLsun: 0.5,
      effectiveTempK: 5260,
    },
  ],
  planets: [],
  canonAnnotations: [
    {
      layerId: 'hard-scifi',
      layerTitle: 'Hard Sci-Fi Canon',
      layerHref: '/galaxy?select=layer:hard-scifi&layer=hard-scifi',
      href: '/galaxy/alpha-centauri?select=layer:hard-scifi&layer=hard-scifi:alpha-centauri',
      kind: 'fictional-canon',
      targetId: 'alpha-centauri-a',
      targetType: 'system',
      inUniverseName: 'Rigil Kentaurus',
      workTitle: 'The Three-Body Problem (Liu Cixin)',
      text: 'Primary G2V component of the chaotic trisolar system.',
      tags: ['Trisolaris', 'Three-Body'],
    },
  ],
  starTelemetry: {
    componentDesignation: 'A',
    spectralType: 'G2V',
    mag: -0.01,
    absmag: 4.38,
    massMsun: 1.1,
    radiusRsun: 1.22,
    luminosityLsun: 1.519,
    effectiveTempK: 5790,
  },
};

const planetDetailsFixture: FocusedPlanetEntityDetails = {
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
  planetCompositionBreakdown: [
    { composition: 'terrestrial', count: 4 },
    { composition: 'gas-giant', count: 2 },
    { composition: 'ice-giant', count: 2 },
  ],
  planetCompositionSummary: '4 terrestrial · 2 gas-giant · 2 ice-giant',
  hasHabitableCandidate: true,
  systemSummary: 'The Solar System · Third planet from the Sun',
  systemSummarySegments: [
    { kind: 'planet-type-badge', composition: 'terrestrial' },
    { kind: 'text', text: '· ' },
    { kind: 'habitable-badge', label: 'habitable zone candidate' },
  ],
  coordinatesPc: [0, 0, 0],
  sectorId: 'sector_+000_+000_+000',
  sectorName: 'sector_+000_+000_+000',
  tags: ['HomeSystem', 'SolarNeighborhood10pc', 'HabitableCandidate'],
  systemDetailsHref: '/planet/earth',
  directionsHref: '/galaxy/sol?anchor=sol',
  centerHref: '/system/sol?center=earth&focus=earth',
  stars: [
    {
      id: 'sol',
      name: 'Sol',
      componentDesignation: 'A',
      spectralType: 'G2V',
      mag: -26.74,
      absmag: 4.83,
      massMsun: 1,
      radiusRsun: 1,
      luminosityLsun: 1,
      effectiveTempK: 5778,
    },
  ],
  planets: [
    {
      id: 'earth',
      name: 'Earth',
      composition: 'terrestrial',
      semiMajorAxisAu: 1.0,
      periodDays: 365.256,
      eccentricity: 0.0167,
      inclinationDeg: 0.0,
      massMearth: 1.0,
      radiusRearth: 1.0,
      equilibriumTempK: 255,
      isHabitableCandidate: true,
    },
  ],
  orbitingBodies: [
    {
      id: 'moon',
      name: 'Moon',
      href: '/planet/earth?focus=moon',
      categoryLabel: 'Moon',
    },
    {
      id: 'iss',
      name: 'International Space Station',
      href: '/planet/earth?focus=iss',
      categoryLabel: 'Spacecraft',
    },
  ],
  canonAnnotations: [
    {
      layerId: 'hard-scifi',
      layerTitle: 'Hard Sci-Fi Canon',
      layerHref: '/galaxy?select=layer:hard-scifi&layer=hard-scifi',
      href: '/system/sol?focus=earth&select=layer:hard-scifi&layer=hard-scifi:earth',
      kind: 'fictional-canon',
      targetId: 'earth',
      targetType: 'planet',
      inUniverseName: 'Earth',
      workTitle: 'The Expanse (James S.A. Corey)',
      text: 'Home world of humanity and the United Nations governing body.',
      tags: ['The Expanse'],
    },
  ],
  planetTelemetry: {
    composition: 'terrestrial',
    semiMajorAxisAu: 1.0,
    periodDays: 365.256,
    eccentricity: 0.0167,
    inclinationDeg: 0.0,
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

const minorBodyDetailsFixture: FocusedMinorBodyEntityDetails = {
  id: 'ceres',
  systemId: 'sol',
  name: '1 Ceres',
  systemName: 'Sol',
  focusedKind: 'minor-body',
  hazardCount: 0,
  hazards: [],
  hazardSummaryLabel: '0 hazards',
  spectralType: 'G2V',
  reticleType: 'terrestrial',
  starCount: 1,
  planetCount: 8,
  planetCompositionBreakdown: [{ composition: 'terrestrial', count: 4 }],
  planetCompositionSummary: '4 terrestrial',
  hasHabitableCandidate: false,
  systemSummary: 'Dwarf planet and largest object in the asteroid belt',
  systemSummarySegments: [
    { kind: 'text', text: 'Asteroid Belt · Dwarf Planet' },
  ],
  coordinatesPc: [0, 0, 0],
  sectorId: 'sector_+000_+000_+000',
  sectorName: 'sector_+000_+000_+000',
  tags: ['AsteroidBelt', 'SolarSystem'],
  directionsHref: '/galaxy/sol?anchor=sol',
  centerHref: '/system/sol?center=ceres&focus=ceres',
  stars: [],
  planets: [],
  canonAnnotations: [
    {
      layerId: 'hard-scifi',
      layerTitle: 'Hard Sci-Fi Canon',
      layerHref: '/galaxy?select=layer:hard-scifi&layer=hard-scifi',
      href: '/system/sol?focus=ceres&select=layer:hard-scifi&layer=hard-scifi:ceres',
      kind: 'fictional-canon',
      targetId: 'ceres',
      targetType: 'minor-body',
      inUniverseName: 'Ceres Station',
      workTitle: 'The Expanse (James S.A. Corey)',
      text: 'Spun-up dwarf planet serving as the primary trade hub of the Asteroid Belt.',
      tags: ['The Expanse', 'Belt'],
    },
  ],
  minorBodyTelemetry: {
    classification: 'dwarf-planet',
    categoryLabel: 'Dwarf Planet',
    parentBodyName: 'Sol',
  },
};

const structureDetailsFixture: FocusedStructureEntityDetails = {
  id: 'orion-nebula',
  systemId: 'orion-nebula',
  name: 'Orion Nebula',
  systemName: 'Orion Nebula',
  focusedKind: 'structure',
  hazardCount: 0,
  hazards: [],
  hazardSummaryLabel: '0 hazards',
  reticleType: 'stellar-cluster',
  starCount: 0,
  planetCount: 0,
  planetCompositionBreakdown: [],
  planetCompositionSummary: '',
  hasHabitableCandidate: false,
  systemSummary:
    'Diffuse nebula situated in the Milky Way south of Orion’s Belt',
  systemSummarySegments: [
    { kind: 'text', text: 'H II region · Diffuse Nebula' },
  ],
  coordinatesPc: [-160, -380, -110],
  sectorId: 'sector_-006_-015_-004',
  sectorName: 'sector_-006_-015_-004',
  tags: ['MessierObject', 'StarFormingRegion'],
  directionsHref: '/galaxy/orion-nebula?anchor=sol',
  centerHref: '/galaxy?center=orion-nebula&focus=orion-nebula',
  stars: [],
  planets: [],
  canonAnnotations: [
    {
      layerId: 'scientific-overlays',
      layerTitle: 'Astrophysical Overlays',
      layerHref: '/galaxy?select=layer:scientific-overlays&layer=scientific-overlays',
      href: '/galaxy/orion-nebula?select=layer:scientific-overlays&layer=scientific-overlays:orion-nebula',
      kind: 'scientific-overlay',
      targetId: 'orion-nebula',
      targetType: 'structure',
      inUniverseName: 'M42 / NGC 1976',
      workTitle: 'Messier Catalog',
      text: 'Closest massive star-formation region to Earth containing the Trapezium cluster.',
      tags: ['StarFormation', 'HII'],
    },
  ],
  structureTelemetry: {
    structureType: 'Diffuse Nebula',
    symbolType: 'nebula',
    radiusPc: 3.68,
    dimensionsPc: [7.36, 7.36, 4.2],
  },
};

const DETAILS_BY_KIND: Record<string, FocusedEntityDetails> = {
  system: systemDetailsFixture,
  star: starDetailsFixture,
  planet: planetDetailsFixture,
  'minor-body': minorBodyDetailsFixture,
  structure: structureDetailsFixture,
};

interface DetailsPanelStoryArgs {
  entityType: 'system' | 'star' | 'planet' | 'minor-body' | 'structure';
  detent: DetentLevel;
}

const meta: Meta<DetailsPanelStoryArgs> = {
  title: 'DOMAIN/Panels',
  parameters: {
    layout: 'centered',
  },
  argTypes: {
    entityType: {
      control: 'select',
      options: ['system', 'star', 'planet', 'minor-body', 'structure'],
      description: 'Entity classification of the focused celestial target',
    },
    detent: {
      control: 'radio',
      options: ['peek', 'partial', 'full'],
      description: 'Vertical detent height state of the details sheet',
    },
  },
};

export default meta;
type Story = StoryObj<DetailsPanelStoryArgs>;

export const DetailsPanelStory: Story = {
  name: 'DetailsPanel',
  args: {
    entityType: 'system',
    detent: 'partial',
  },
  render: (args) => {
    const activeDetails =
      DETAILS_BY_KIND[args.entityType] ?? systemDetailsFixture;

    return (
      <div className={storyStyles.storyWrapper}>
        <header className={storyStyles.header}>
          <h1 className={storyStyles.title}>DetailsPanel</h1>
          <p className={storyStyles.description}>
            Comprehensive multi-detent inspection sheet presenting telemetry, composition, hazards, and canon layers.
          </p>
        </header>

        <Stack gap="loose">
          <section className={storyStyles.section}>
            <h2 className={storyStyles.sectionTitle}>
              Interactive Preview ({args.entityType} · {args.detent})
            </h2>
            <div className={storyStyles.panelContainer}>
              <DetailsPanel
                details={activeDetails}
                activeDetent={args.detent}
              />
            </div>
          </section>
        </Stack>
      </div>
    );
  },
};
