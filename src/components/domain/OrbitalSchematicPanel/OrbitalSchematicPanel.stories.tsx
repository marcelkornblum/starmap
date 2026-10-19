import type { Meta, StoryObj } from '@storybook/react-vite';
import type { OrbitalSchematicSummary } from '../../../services/detailsService';
import { OrbitalSchematicPanel } from './OrbitalSchematicPanel';

const meta: Meta<typeof OrbitalSchematicPanel> = {
  title: 'Domain/OrbitalSchematicPanel',
  component: OrbitalSchematicPanel,
};

export default meta;
type Story = StoryObj<typeof OrbitalSchematicPanel>;

const solSystemSchematicFixture: OrbitalSchematicSummary = {
  scope: 'system',
  systemId: 'sol',
  systemName: 'Sol',
  habitableZoneAu: [0.95, 1.37],
  items: [
    {
      id: 'sol',
      name: 'Sol',
      href: '/system/sol?focus=sol',
      kind: 'star',
      orbitRank: 0,
      summaryLabel: 'G2V Star',
      inHabitableZone: false,
      isFocused: false,
      isSelected: false,
    },
    {
      id: 'mercury',
      name: 'Mercury',
      href: '/planet/mercury',
      kind: 'planet',
      orbitRank: 1,
      summaryLabel: '0.387 AU · Terrestrial',
      inHabitableZone: false,
      isFocused: false,
      isSelected: false,
    },
    {
      id: 'venus',
      name: 'Venus',
      href: '/planet/venus',
      kind: 'planet',
      orbitRank: 2,
      summaryLabel: '0.723 AU · Terrestrial',
      inHabitableZone: false,
      isFocused: false,
      isSelected: false,
    },
    {
      id: 'earth',
      name: 'Earth',
      href: '/planet/earth',
      kind: 'planet',
      orbitRank: 3,
      summaryLabel: '1.000 AU · Terrestrial',
      inHabitableZone: true,
      region: 'habitable-zone',
      isFocused: true,
      isSelected: true,
      children: [
        {
          id: 'moon',
          name: 'Moon',
          href: '/planet/earth?focus=moon',
          kind: 'moon',
          orbitRank: 1,
          summaryLabel: 'Moon',
          inHabitableZone: true,
          region: 'habitable-zone',
          isFocused: false,
          isSelected: false,
        },
      ],
    },
    {
      id: 'mars',
      name: 'Mars',
      href: '/planet/mars',
      kind: 'planet',
      orbitRank: 4,
      summaryLabel: '1.524 AU · Terrestrial',
      inHabitableZone: false,
      isFocused: false,
      isSelected: false,
    },
    {
      id: 'ceres',
      name: '1 Ceres',
      href: '/system/sol?focus=ceres',
      kind: 'minor-body',
      orbitRank: 5,
      summaryLabel: '2.767 AU · Asteroid Belt',
      inHabitableZone: false,
      region: 'asteroid-belt',
      isFocused: false,
      isSelected: false,
    },
    {
      id: 'jupiter',
      name: 'Jupiter',
      href: '/planet/jupiter',
      kind: 'planet',
      orbitRank: 6,
      summaryLabel: '5.204 AU · Gas Giant',
      inHabitableZone: false,
      isFocused: false,
      isSelected: false,
    },
    {
      id: 'saturn',
      name: 'Saturn',
      href: '/planet/saturn',
      kind: 'planet',
      orbitRank: 7,
      summaryLabel: '9.582 AU · Gas Giant',
      inHabitableZone: false,
      isFocused: false,
      isSelected: false,
    },
    {
      id: 'uranus',
      name: 'Uranus',
      href: '/planet/uranus',
      kind: 'planet',
      orbitRank: 8,
      summaryLabel: '19.20 AU · Ice Giant',
      inHabitableZone: false,
      isFocused: false,
      isSelected: false,
    },
    {
      id: 'neptune',
      name: 'Neptune',
      href: '/planet/neptune',
      kind: 'planet',
      orbitRank: 9,
      summaryLabel: '30.05 AU · Ice Giant',
      inHabitableZone: false,
      isFocused: false,
      isSelected: false,
    },
    {
      id: 'pluto',
      name: '134340 Pluto',
      href: '/system/sol?focus=pluto',
      kind: 'minor-body',
      orbitRank: 10,
      summaryLabel: '39.48 AU · Kuiper Belt',
      inHabitableZone: false,
      region: 'kuiper-belt',
      isFocused: false,
      isSelected: false,
    },
  ],
};

const earthPlanetSchematicFixture: OrbitalSchematicSummary = {
  scope: 'planet',
  systemId: 'sol',
  systemName: 'Sol',
  planetId: 'earth',
  planetName: 'Earth',
  habitableZoneAu: [0.95, 1.37],
  items: [
    {
      id: 'earth',
      name: 'Earth',
      href: '/planet/earth',
      kind: 'planet',
      orbitRank: 0,
      summaryLabel: '1.000 M⊕ · Terrestrial',
      inHabitableZone: true,
      region: 'habitable-zone',
      isFocused: false,
      isSelected: false,
    },
    {
      id: 'moon',
      name: 'Moon',
      href: '/planet/earth?focus=moon',
      kind: 'moon',
      orbitRank: 1,
      summaryLabel: '384,400 km · Natural Satellite',
      inHabitableZone: true,
      isFocused: true,
      isSelected: true,
    },
  ],
};

export const SystemSchematic: Story = {
  args: {
    elements: solSystemSchematicFixture,
  },
};

export const PlanetSchematic: Story = {
  args: {
    elements: earthPlanetSchematicFixture,
  },
};
