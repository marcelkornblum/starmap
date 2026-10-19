import type { Meta, StoryObj } from '@storybook/react-vite';
import type { CompactSearchEntry } from '../../utils/compactDataCodec';
import { Search } from './index';

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

const meta: Meta = {
  title: 'Domain/Search',
};

export default meta;

export const GalaxySearchPanel: StoryObj = {
  render: () => (
    <Search.Root
      syncUrl={false}
      initialCorpus={sampleSearchCorpus}
      initialQuery=""
    >
      <Search.Panel scope="galaxy" />
      <Search.Results />
    </Search.Root>
  ),
};

export const SystemSearchPanel: StoryObj = {
  render: () => (
    <Search.Root
      syncUrl={false}
      initialCorpus={sampleSearchCorpus}
      initialQuery="earth"
    >
      <Search.Panel scope="system" />
      <Search.Results />
    </Search.Root>
  ),
};

export const PlanetSearchPanel: StoryObj = {
  render: () => (
    <Search.Root
      syncUrl={false}
      initialCorpus={sampleSearchCorpus}
      initialQuery="moon"
    >
      <Search.Panel scope="planet" />
      <Search.Results />
    </Search.Root>
  ),
};
