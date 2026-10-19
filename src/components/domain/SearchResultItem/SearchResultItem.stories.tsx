import type { Meta, StoryObj } from '@storybook/react-vite';
import type { SearchResultItem as SearchResultItemModel } from '../../../services/searchService';
import { SearchResultItem } from './SearchResultItem';

const meta: Meta<typeof SearchResultItem> = {
  title: 'Domain/SearchResultItem',
  component: SearchResultItem,
  decorators: [
    (Story) => (
      <ul>
        <Story />
      </ul>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof SearchResultItem>;

const systemResultFixture: SearchResultItemModel = {
  id: 'sol',
  name: 'Sol System',
  category: 'stars',
  entityKind: 'star-system',
  reticleType: 'stellar-system',
  targetView: 'system',
  href: '/system/sol',
  systemId: 'sol',
  systemName: 'Sol',
  position: [0, 0, 0],
  distancePc: 0,
  magnitude: -26.74,
  spectralType: 'G2V',
  planetCount: 8,
  hasHabitableCandidate: true,
  isSolarSystem: true,
  score: 1.0,
};

const starResultFixture: SearchResultItemModel = {
  id: 'alpha-centauri-a',
  name: 'Alpha Centauri A',
  category: 'stars',
  entityKind: 'star-system',
  reticleType: 'star',
  targetView: 'system',
  href: '/system/alpha-centauri?focus=alpha-centauri-a',
  systemId: 'alpha-centauri',
  systemName: 'Alpha Centauri',
  position: [-0.47, 1.32, -0.33],
  distancePc: 1.34,
  magnitude: -0.01,
  spectralType: 'G2V',
  score: 0.95,
};

const planetResultFixture: SearchResultItemModel = {
  id: 'earth',
  name: 'Earth (Sol III)',
  category: 'planets',
  entityKind: 'planet',
  reticleType: 'terrestrial',
  targetView: 'system',
  href: '/planet/earth',
  systemId: 'sol',
  systemName: 'Sol',
  hasHabitableCandidate: true,
  score: 0.9,
};

const minorBodyResultFixture: SearchResultItemModel = {
  id: 'ceres',
  name: '1 Ceres',
  category: 'minor-bodies',
  entityKind: 'minor-body',
  reticleType: 'terrestrial',
  targetView: 'system',
  href: '/system/sol?focus=ceres',
  systemId: 'sol',
  systemName: 'Sol',
  score: 0.85,
};

const structureResultFixture: SearchResultItemModel = {
  id: 'orion-nebula',
  name: 'Orion Nebula (M42)',
  category: 'structures',
  entityKind: 'galactic-structure',
  reticleType: 'cluster',
  targetView: 'galaxy',
  href: '/galaxy?focus=orion-nebula',
  distancePc: 412,
  score: 0.8,
};

export const SystemResult: Story = {
  args: {
    result: systemResultFixture,
  },
};

export const StarResult: Story = {
  args: {
    result: starResultFixture,
  },
};

export const PlanetResult: Story = {
  args: {
    result: planetResultFixture,
  },
};

export const MinorBodyResult: Story = {
  args: {
    result: minorBodyResultFixture,
  },
};

export const StructureResult: Story = {
  args: {
    result: structureResultFixture,
  },
};
