import type { Meta, StoryObj } from '@storybook/react-vite';
import type { DatasetLayerIndexEntry } from '../../../types/datasetLayers';
import { Stack } from '../../interface';
import storyStyles from '../domainStories.module.css';
import { DiscoverPanel } from './DiscoverPanel';

const STORY_LAYERS: readonly DatasetLayerIndexEntry[] = [
  {
    layerId: 'overlay-recent-discoveries',
    title: 'Recent Discoveries',
    kind: 'scientific-overlay',
    description: 'Confirmed nearby exoplanet discoveries within 100 parsecs.',
    source: {
      summary: 'NASA Exoplanet Archive',
      creator: 'NASA Exoplanet Science Institute',
    },
    entryCount: 12,
    path: '/data/overlays/layers/overlay-recent-discoveries.json',
  },
  {
    layerId: 'overlay-jwst-targets',
    title: 'JWST Targets',
    kind: 'scientific-overlay',
    description: 'Exoplanet atmospheres characterised by the James Webb Space Telescope.',
    entryCount: 7,
    path: '/data/overlays/layers/overlay-jwst-targets.json',
  },
  {
    layerId: 'canon-project-hail-mary',
    title: 'Project Hail Mary',
    kind: 'fictional-canon',
    description: 'Interstellar expedition to study Astrophage and save humanity.',
    source: {
      summary: 'Novel',
      creator: 'Andy Weir',
    },
    entryCount: 4,
    path: '/data/overlays/layers/canon-project-hail-mary.json',
  },
  {
    layerId: 'canon-three-body',
    title: 'Remembrance of Earth’s Past',
    kind: 'fictional-canon',
    description: 'First contact, dark forest deterrence, and interstellar fleet routes.',
    source: {
      summary: 'Novel Trilogy',
      creator: 'Cixin Liu',
    },
    entryCount: 6,
    path: '/data/overlays/layers/canon-three-body.json',
  },
];

const meta: Meta<typeof DiscoverPanel> = {
  title: 'DOMAIN/Panels',
  component: DiscoverPanel,
  parameters: {
    layout: 'centered',
  },
};

export default meta;
type Story = StoryObj<typeof DiscoverPanel>;

export const DiscoverPanelStory: Story = {
  name: 'DiscoverPanel',
  render: () => (
    <div className={storyStyles.storyWrapper}>
      <header className={storyStyles.header}>
        <h1 className={storyStyles.title}>DiscoverPanel</h1>
        <p className={storyStyles.description}>
          Curated directory of scientific overlays, fictional canon universes, and saved user collections.
        </p>
      </header>
      <Stack gap="loose">
        <section className={storyStyles.section}>
          <h2 className={storyStyles.sectionTitle}>Active Universe Highlighted</h2>
          <div className={storyStyles.panelContainer}>
            <DiscoverPanel
              layers={STORY_LAYERS}
              activeLayerSlug="project-hail-mary"
              onClose={() => {}}
            />
          </div>
        </section>
      </Stack>
    </div>
  ),
};
