import type { Meta, StoryObj } from '@storybook/react-vite';
import type {
  GalaxyBodiesSummary,
  PlanetaryBodiesSummary,
  SystemBodiesSummary,
} from '../../../services/detailsService';
import { BodiesPanel } from './BodiesPanel';
import { Stack } from '../../interface/layouts/Stack/Stack';

import storyStyles from '../domainStories.module.css';

const solSystemBodiesFixture: SystemBodiesSummary = {
  scope: 'system',
  systemId: 'sol',
  systemName: 'Sol',
  systemHref: '/system/sol',
  focusedEntityId: 'earth',
  selectedEntityIds: ['earth'],
  stars: [
    {
      id: 'sol',
      name: 'Sol',
      componentDesignation: 'A',
      spectralType: 'G2V',
      mag: -26.74,
      absmag: 4.83,
      massMsun: 1.0,
      radiusRsun: 1.0,
      luminosityLsun: 1.0,
      effectiveTempK: 5778,
      href: '/system/sol?focus=sol',
    },
  ],
  planets: [
    {
      id: 'mercury',
      name: 'Mercury',
      composition: 'terrestrial',
      semiMajorAxisAu: 0.387,
      periodDays: 87.97,
      massMearth: 0.055,
      isHabitableCandidate: false,
      href: '/planet/mercury',
    },
    {
      id: 'venus',
      name: 'Venus',
      composition: 'terrestrial',
      semiMajorAxisAu: 0.723,
      periodDays: 224.7,
      massMearth: 0.815,
      isHabitableCandidate: false,
      href: '/planet/venus',
    },
    {
      id: 'earth',
      name: 'Earth',
      composition: 'terrestrial',
      semiMajorAxisAu: 1.0,
      periodDays: 365.256,
      massMearth: 1.0,
      equilibriumTempK: 255,
      isHabitableCandidate: true,
      href: '/planet/earth',
    },
    {
      id: 'mars',
      name: 'Mars',
      composition: 'terrestrial',
      semiMajorAxisAu: 1.524,
      periodDays: 686.98,
      massMearth: 0.107,
      isHabitableCandidate: false,
      href: '/planet/mars',
    },
    {
      id: 'jupiter',
      name: 'Jupiter',
      composition: 'gas-giant',
      semiMajorAxisAu: 5.204,
      periodDays: 4332.59,
      massMearth: 317.8,
      isHabitableCandidate: false,
      href: '/planet/jupiter',
    },
    {
      id: 'saturn',
      name: 'Saturn',
      composition: 'gas-giant',
      semiMajorAxisAu: 9.582,
      periodDays: 10759.22,
      massMearth: 95.2,
      isHabitableCandidate: false,
      href: '/planet/saturn',
    },
    {
      id: 'uranus',
      name: 'Uranus',
      composition: 'ice-giant',
      semiMajorAxisAu: 19.2,
      periodDays: 30685.4,
      massMearth: 14.5,
      isHabitableCandidate: false,
      href: '/planet/uranus',
    },
    {
      id: 'neptune',
      name: 'Neptune',
      composition: 'ice-giant',
      semiMajorAxisAu: 30.05,
      periodDays: 60189.0,
      massMearth: 17.1,
      isHabitableCandidate: false,
      href: '/planet/neptune',
    },
  ],
  moonsAndDwarfPlanets: [
    {
      id: 'moon',
      name: 'Moon (Luna)',
      href: '/planet/earth?focus=moon',
      categoryLabel: 'Moon',
    },
    {
      id: 'europa',
      name: 'Europa',
      href: '/planet/jupiter?focus=europa',
      categoryLabel: 'Moon',
    },
    {
      id: 'ganymede',
      name: 'Ganymede',
      href: '/planet/jupiter?focus=ganymede',
      categoryLabel: 'Moon',
    },
    {
      id: 'titan',
      name: 'Titan',
      href: '/planet/saturn?focus=titan',
      categoryLabel: 'Moon',
    },
    {
      id: 'pluto',
      name: '134340 Pluto',
      href: '/system/sol?focus=pluto',
      categoryLabel: 'Dwarf Planet',
    },
    {
      id: 'ceres',
      name: '1 Ceres',
      href: '/system/sol?focus=ceres',
      categoryLabel: 'Dwarf Planet',
    },
  ],
  minorBodiesAndSpacecraft: [
    {
      id: 'voyager-1',
      name: 'Voyager 1',
      href: '/system/sol?focus=voyager-1',
      categoryLabel: 'Spacecraft',
    },
    {
      id: 'iss',
      name: 'International Space Station',
      href: '/planet/earth?focus=iss',
      categoryLabel: 'Spacecraft',
    },
  ],
  canonAnnotations: [],
};

const earthPlanetaryBodiesFixture: PlanetaryBodiesSummary = {
  scope: 'planet',
  planetId: 'earth',
  planetName: 'Earth',
  planetHref: '/planet/earth',
  systemId: 'sol',
  systemName: 'Sol',
  systemHref: '/system/sol',
  focusedEntityId: 'moon',
  selectedEntityIds: ['moon'],
  planetDetail: {
    id: 'earth',
    name: 'Earth',
    composition: 'terrestrial',
    semiMajorAxisAu: 1.0,
    periodDays: 365.256,
    massMearth: 1.0,
    equilibriumTempK: 255,
    isHabitableCandidate: true,
    href: '/planet/earth',
  },
  moons: [
    {
      id: 'moon',
      name: 'Moon',
      href: '/planet/earth?focus=moon',
      categoryLabel: 'Moon',
    },
  ],
  minorBodiesAndSpacecraft: [
    {
      id: 'iss',
      name: 'International Space Station',
      href: '/planet/earth?focus=iss',
      categoryLabel: 'Spacecraft',
    },
    {
      id: 'hubble',
      name: 'Hubble Space Telescope',
      href: '/planet/earth?focus=hubble',
      categoryLabel: 'Spacecraft',
    },
  ],
  canonAnnotations: [],
};

const solGalaxyBodiesFixture: GalaxyBodiesSummary = {
  scope: 'galaxy',
  centerId: 'sol',
  centerName: 'Sol',
  centerCoordinatesPc: [0, 0, 0],
  apertureRadiusPc: 10,
  apertureRadiusLy: 32.62,
  focusedSystemId: 'sol',
  focusedSystemName: 'Sol',
  systems: [
    {
      id: 'sol',
      name: 'Sol',
      href: '/galaxy/sol',
      tier: 'focused',
      reticleType: 'stellar-system',
      spectralType: 'G2V',
      starTypeGuideHref: '/guide/star-types/G2V',
      planetCount: 8,
      hasHabitableCandidate: true,
      habitableZoneGuideHref: '/galaxy?select=tag:habitable-candidate',
      hazardCount: 0,
      hazardSummaryLabel: '0 hazards',
      hasCriticalHazard: false,
      distanceFromFocusPc: 0,
      distanceFromFocusLy: 0,
      distanceGuideHref: '/guide/metrics/distance?focus=sol',
    },
    {
      id: 'alpha-centauri',
      name: 'Alpha Centauri',
      href: '/galaxy/alpha-centauri',
      tier: 'active',
      reticleType: 'stellar-system',
      spectralType: 'G2V',
      starTypeGuideHref: '/guide/star-types/G2V',
      planetCount: 1,
      hasHabitableCandidate: true,
      habitableZoneGuideHref: '/galaxy?select=tag:habitable-candidate',
      hazardCount: 1,
      hazardSummaryLabel: '1 hazard',
      hasCriticalHazard: false,
      distanceFromFocusPc: 1.44,
      distanceFromFocusLy: 4.7,
      distanceGuideHref: '/guide/metrics/distance?focus=alpha-centauri',
    },
    {
      id: 'tau-ceti',
      name: 'Tau Ceti',
      href: '/galaxy/tau-ceti',
      tier: 'selected',
      reticleType: 'stellar-system',
      spectralType: 'G8V',
      starTypeGuideHref: '/guide/star-types/G8V',
      planetCount: 4,
      hasHabitableCandidate: true,
      habitableZoneGuideHref: '/galaxy?select=tag:habitable-candidate',
      hazardCount: 0,
      hazardSummaryLabel: '0 hazards',
      hasCriticalHazard: false,
      distanceFromFocusPc: 3.71,
      distanceFromFocusLy: 12.1,
      distanceGuideHref: '/guide/metrics/distance?focus=tau-ceti',
    },
  ],
};

interface BodiesPanelStoryArgs {
  scope: 'system' | 'planet' | 'galaxy';
}

const meta: Meta<BodiesPanelStoryArgs> = {
  title: 'DOMAIN/Panels',
  parameters: {
    layout: 'centered',
  },
  argTypes: {
    scope: {
      control: 'radio',
      options: ['system', 'planet', 'galaxy'],
      description: 'Cartographic view scope',
    },
  },
};

export default meta;
type Story = StoryObj<BodiesPanelStoryArgs>;

export const BodiesPanelStory: Story = {
  name: 'BodiesPanel',
  args: {
    scope: 'system',
  },
  render: (args) => {
    const fixture =
      args.scope === 'planet'
        ? earthPlanetaryBodiesFixture
        : args.scope === 'galaxy'
          ? solGalaxyBodiesFixture
          : solSystemBodiesFixture;

    return (
      <div className={storyStyles.storyWrapper}>
        <header className={storyStyles.header}>
          <h1 className={storyStyles.title}>BodiesPanel</h1>
          <p className={storyStyles.description}>
            Hierarchical catalog panel showing stars, planets, moons, and minor bodies for the current view scope.
          </p>
        </header>

        <Stack gap="loose">
          <section className={storyStyles.section}>
            <h2 className={storyStyles.sectionTitle}>Interactive Preview ({args.scope})</h2>
            <div className={storyStyles.panelContainer}>
              <BodiesPanel elements={fixture} />
            </div>
          </section>

          <section className={storyStyles.section}>
            <h2 className={storyStyles.sectionTitle}>System Scope (Sol)</h2>
            <div className={storyStyles.panelContainer}>
              <BodiesPanel elements={solSystemBodiesFixture} />
            </div>
          </section>

          <section className={storyStyles.section}>
            <h2 className={storyStyles.sectionTitle}>Planetary Scope (Earth)</h2>
            <div className={storyStyles.panelContainer}>
              <BodiesPanel elements={earthPlanetaryBodiesFixture} />
            </div>
          </section>

          <section className={storyStyles.section}>
            <h2 className={storyStyles.sectionTitle}>Galaxy Scope (Sol Neighborhood)</h2>
            <div className={storyStyles.panelContainer}>
              <BodiesPanel elements={solGalaxyBodiesFixture} />
            </div>
          </section>
        </Stack>
      </div>
    );
  },
};
