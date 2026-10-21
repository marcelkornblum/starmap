import type { Meta, StoryObj } from '@storybook/react-vite';
import type { SearchResultItem as SearchResultItemModel } from '../../../services/searchService';
import { SearchResultItem } from './SearchResultItem';
import { Stack } from '../../interface/layouts/Stack/Stack';

import storyStyles from '../domainStories.module.css';

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
  reticleType: 'stellar-cluster',
  targetView: 'galaxy',
  href: '/galaxy?focus=orion-nebula',
  distancePc: 412,
  score: 0.8,
};

const FIXTURES_BY_ENTITY: Record<string, SearchResultItemModel> = {
  system: systemResultFixture,
  star: starResultFixture,
  planet: planetResultFixture,
  'minor-body': minorBodyResultFixture,
  structure: structureResultFixture,
};

interface SearchResultItemStoryArgs {
  entityType: 'system' | 'star' | 'planet' | 'minor-body' | 'structure';
}

const meta: Meta<SearchResultItemStoryArgs> = {
  title: 'DOMAIN/Search',
  parameters: {
    layout: 'centered',
  },
  argTypes: {
    entityType: {
      control: 'select',
      options: ['system', 'star', 'planet', 'minor-body', 'structure'],
      description: 'Entity classification of the search result',
    },
  },
};

export default meta;
type Story = StoryObj<SearchResultItemStoryArgs>;

export const SearchResultItemStory: Story = {
  name: 'SearchResultItem',
  args: {
    entityType: 'system',
  },
  render: (args) => {
    const activeResult =
      FIXTURES_BY_ENTITY[args.entityType] ?? systemResultFixture;

    return (
      <div className={storyStyles.storyWrapper}>
        <header className={storyStyles.header}>
          <h1 className={storyStyles.title}>SearchResultItem</h1>
          <p className={storyStyles.description}>
            Individual search hit row displaying reticle iconography, spectral badges, distances, and category cues.
          </p>
        </header>

        <Stack gap="loose">
          <section className={storyStyles.section}>
            <h2 className={storyStyles.sectionTitle}>
              Interactive Preview ({args.entityType})
            </h2>
            <ul className={storyStyles.listContainer}>
              <SearchResultItem result={activeResult} />
            </ul>
          </section>

          <section className={storyStyles.section}>
            <h2 className={storyStyles.sectionTitle}>All Result Kinds</h2>
            <ul className={storyStyles.listContainer}>
              <SearchResultItem result={systemResultFixture} />
              <SearchResultItem result={starResultFixture} />
              <SearchResultItem result={planetResultFixture} />
              <SearchResultItem result={minorBodyResultFixture} />
              <SearchResultItem result={structureResultFixture} />
            </ul>
          </section>
        </Stack>
      </div>
    );
  },
};
