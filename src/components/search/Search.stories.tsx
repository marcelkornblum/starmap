import type { Meta, StoryObj } from '@storybook/react-vite';
import type { CompactSearchEntry } from '../../utils/compactDataCodec';
import { Search } from './index';
import { Stack } from '../interface/layouts/Stack/Stack';

import storyStyles from '../domain/domainStories.module.css';

const sampleSearchCorpus: readonly CompactSearchEntry[] = [
  {
    i: 'sol',
    n: 'Sol',
    m: [-26.74, 'G2V', 8, 1],
    h: 1,
    a: 'sol sun',
  },
  {
    i: 'alpha-centauri-a',
    n: 'Alpha Centauri A',
    p: [-0.47, 1.32, -0.33],
    m: [-0.01, 'G2V', 2],
    a: 'rigilkentaurus toliman',
  },
  {
    i: 'tau-ceti',
    n: 'Tau Ceti',
    p: [-3.1, -0.4, -2.0],
    m: [3.5, 'G8V', 4, 1],
    a: 'tauceti hd10700 hip8102 gl71',
  },
  {
    i: 'earth',
    k: 2,
    n: 'Earth',
    s: 'sol',
    h: 1,
    r: 3,
    z: 1,
    a: 'earth sol3',
  },
  {
    i: 'moon',
    k: 3,
    n: 'Moon',
    s: 'sol',
    o: 'earth',
    h: 1,
    r: 1,
    a: 'moon luna',
  },
  {
    i: 'ceres',
    k: 4,
    n: '1 Ceres',
    s: 'sol',
    h: 1,
    r: 5,
    e: 'belt',
    a: 'ceres',
  },
  {
    i: 'orion-nebula',
    k: 5,
    n: 'Orion Nebula',
    p: [-160, -380, -110],
    a: 'm42 ngc1976 orion',
  },
];

interface SearchStoryArgs {
  scope: 'galaxy' | 'system' | 'planet';
  initialQuery: string;
}

const meta: Meta<SearchStoryArgs> = {
  title: 'DOMAIN/Search',
  parameters: {
    layout: 'centered',
  },
  argTypes: {
    scope: {
      control: 'radio',
      options: ['galaxy', 'system', 'planet'],
      description: 'Search scoping context',
    },
    initialQuery: {
      control: 'text',
      description: 'Initial search query string',
    },
  },
};

export default meta;
type Story = StoryObj<SearchStoryArgs>;

export const SearchStory: Story = {
  name: 'Search',
  args: {
    scope: 'galaxy',
    initialQuery: '',
  },
  render: (args) => (
    <div className={storyStyles.storyWrapper}>
      <header className={storyStyles.header}>
        <h1 className={storyStyles.title}>Search</h1>
        <p className={storyStyles.description}>
          Universal and scoped search interface with real-time fuzzy matching, category badges, and quick jump navigation.
        </p>
      </header>

      <Stack gap="loose">
        <section className={storyStyles.section}>
          <h2 className={storyStyles.sectionTitle}>
            Interactive Preview ({args.scope})
          </h2>
          <div className={storyStyles.panelContainer}>
            <Search.Root
              key={`${args.scope}-${args.initialQuery}`}
              syncUrl={false}
              initialCorpus={sampleSearchCorpus}
              initialQuery={args.initialQuery}
            >
              <Search.Panel scope={args.scope} />
              <Search.Results />
            </Search.Root>
          </div>
        </section>

        <section className={storyStyles.section}>
          <h2 className={storyStyles.sectionTitle}>System Scope with Active Query</h2>
          <div className={storyStyles.panelContainer}>
            <Search.Root
              syncUrl={false}
              initialCorpus={sampleSearchCorpus}
              initialQuery="earth"
            >
              <Search.Panel scope="system" />
              <Search.Results />
            </Search.Root>
          </div>
        </section>
      </Stack>
    </div>
  ),
};
