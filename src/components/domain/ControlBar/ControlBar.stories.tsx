import type { Meta, StoryObj } from '@storybook/react-vite';
import { ControlBar } from './ControlBar';
import { Stack } from '../../interface/layouts/Stack/Stack';

import storyStyles from '../domainStories.module.css';

interface ControlBarStoryArgs {
  scope: 'galaxy' | 'system' | 'planet';
}

const meta: Meta<ControlBarStoryArgs> = {
  title: 'DOMAIN/Navigation',
  parameters: {
    layout: 'centered',
  },
  argTypes: {
    scope: {
      control: 'radio',
      options: ['galaxy', 'system', 'planet'],
      description: 'Active cartographic view scope controlling camera reset and level actions',
    },
  },
};

export default meta;
type Story = StoryObj<ControlBarStoryArgs>;

export const ControlBarStory: Story = {
  name: 'ControlBar',
  args: {
    scope: 'galaxy',
  },
  render: (args) => (
    <div className={storyStyles.storyWrapper}>
      <header className={storyStyles.header}>
        <h1 className={storyStyles.title}>ControlBar</h1>
        <p className={storyStyles.description}>
          Bottom-anchored primary navigation controls providing scope transitions, camera resets, and search toggling.
        </p>
      </header>

      <Stack gap="loose">
        <section className={storyStyles.section}>
          <h2 className={storyStyles.sectionTitle}>
            Interactive Preview ({args.scope})
          </h2>
          <div className={storyStyles.previewContainer}>
            <ControlBar scope={args.scope} />
          </div>
        </section>

        <section className={storyStyles.section}>
          <h2 className={storyStyles.sectionTitle}>Galaxy Scope</h2>
          <div className={storyStyles.previewContainer}>
            <ControlBar scope="galaxy" />
          </div>
        </section>

        <section className={storyStyles.section}>
          <h2 className={storyStyles.sectionTitle}>System Scope</h2>
          <div className={storyStyles.previewContainer}>
            <ControlBar scope="system" />
          </div>
        </section>

        <section className={storyStyles.section}>
          <h2 className={storyStyles.sectionTitle}>Planet Scope</h2>
          <div className={storyStyles.previewContainer}>
            <ControlBar scope="planet" />
          </div>
        </section>
      </Stack>
    </div>
  ),
};
