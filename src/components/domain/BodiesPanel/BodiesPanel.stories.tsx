import type { Meta, StoryObj } from '@storybook/react-vite';
import type {
  PlanetaryBodiesSummary,
  SystemBodiesSummary,
} from '../../../services/detailsService';
import { BodiesPanel } from './BodiesPanel';

const meta: Meta<typeof BodiesPanel> = {
  title: 'Domain/BodiesPanel',
  component: BodiesPanel,
};

export default meta;
type Story = StoryObj<typeof BodiesPanel>;

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

export const SystemScope: Story = {
  args: {
    elements: solSystemBodiesFixture,
  },
};

export const PlanetScope: Story = {
  args: {
    elements: earthPlanetaryBodiesFixture,
  },
};
