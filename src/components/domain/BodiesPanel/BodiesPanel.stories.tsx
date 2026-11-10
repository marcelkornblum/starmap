import type { Meta, StoryObj } from '@storybook/react-vite';
import { BodiesPanel } from './BodiesPanel';
import { Stack } from '../../interface/layouts/Stack/Stack';
import {
  earthPlanetaryBodiesFixture,
  solGalaxyBodiesFixture,
  solSystemBodiesFixture,
} from './BodiesPanel.stories.fixtures';

import storyStyles from '../domainStories.module.css';

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
