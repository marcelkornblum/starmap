import type { Meta, StoryObj } from '@storybook/react-vite';
import { LayerCard } from './LayerCard';
import type {
  ActiveLayerItemCardModel,
  ActiveLayerOverviewCardModel,
} from '../../../services/layerCardService';
import { Stack } from '../../interface/layouts/Stack/Stack';

import storyStyles from '../domainStories.module.css';

interface LayerCardStoryArgs {
  mode: 'overview' | 'item';
}

const overviewFixture: ActiveLayerOverviewCardModel = {
  mode: 'overview',
  layerId: 'hard-scifi',
  layerSlug: 'hard-scifi',
  title: 'Hard Sci-Fi Canon',
  kind: 'fictional-canon',
  kindLabel: 'Fictional Canon',
  description:
    'Real-sky astronomical systems featured across notable hard science fiction literature, including The Expanse, Project Hail Mary, and The Three-Body Problem.',
  itemCount: 14,
  source: {
    summary: 'Hard Sci-Fi Astronomical Bibliography',
    creator: 'Various Authors',
    url: 'https://en.wikipedia.org/wiki/Hard_science_fiction',
  },
  firstItemTitle: 'Sol (Earth / Mars / Belt)',
  startHref: '/galaxy?select=layer:hard-scifi&layer=hard-scifi:sol',
  closeHref: '/galaxy',
};

const itemFixture: ActiveLayerItemCardModel = {
  mode: 'item',
  layerId: 'hard-scifi',
  layerSlug: 'hard-scifi',
  layerTitle: 'Hard Sci-Fi Canon',
  kind: 'fictional-canon',
  kindLabel: 'Fictional Canon',
  overviewHref: '/galaxy?select=layer:hard-scifi',
  stepIndex: 3,
  totalItems: 14,
  itemSlug: 'tau-ceti',
  itemTitle: 'Tau Ceti (Hail Mary Mission)',
  text:
    'Destination G-type star system of the Hail Mary interstellar mission to harvest Taumoeba and counter Petrova line stellar dimming.',
  confidence: 'confirmed',
  prevHref: '/galaxy?select=layer:hard-scifi&layer=hard-scifi:alpha-centauri',
  prevLabel: 'Alpha Centauri',
  nextHref: '/galaxy?select=layer:hard-scifi&layer=hard-scifi:40-eridani',
  nextLabel: '40 Eridani',
  closeHref: '/galaxy',
};

const meta: Meta<LayerCardStoryArgs> = {
  title: 'DOMAIN/Panels',
  parameters: {
    layout: 'centered',
  },
  argTypes: {
    mode: {
      control: 'radio',
      options: ['overview', 'item'],
      description: 'LayerCard presentation mode',
    },
  },
};

export default meta;
type Story = StoryObj<LayerCardStoryArgs>;

export const LayerCardStory: Story = {
  name: 'LayerCard',
  args: {
    mode: 'overview',
  },
  render: (args) => {
    const card = args.mode === 'overview' ? overviewFixture : itemFixture;

    return (
      <div className={storyStyles.storyWrapper}>
        <header className={storyStyles.header}>
          <h1 className={storyStyles.title}>LayerCard</h1>
          <p className={storyStyles.description}>
            Non-modal HUD overlay displaying layer context in Overview and Item modes with step navigation.
          </p>
        </header>

        <Stack gap="loose">
          <section className={storyStyles.section}>
            <h2 className={storyStyles.sectionTitle}>Interactive Preview</h2>
            <div className={storyStyles.panelContainer}>
              <LayerCard card={card} />
            </div>
          </section>

          <section className={storyStyles.section}>
            <h2 className={storyStyles.sectionTitle}>Overview Mode</h2>
            <div className={storyStyles.panelContainer}>
              <LayerCard card={overviewFixture} />
            </div>
          </section>

          <section className={storyStyles.section}>
            <h2 className={storyStyles.sectionTitle}>Item Mode</h2>
            <div className={storyStyles.panelContainer}>
              <LayerCard card={itemFixture} />
            </div>
          </section>
        </Stack>
      </div>
    );
  },
};
