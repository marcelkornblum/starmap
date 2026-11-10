import type { Meta, StoryObj } from '@storybook/react-vite';
import type { DetentLevel } from '../../interface/surfaces/DetentSheet';
import { DetailsPanel } from './DetailsPanel';
import { Stack } from '../../interface/layouts/Stack/Stack';
import {
  DETAILS_BY_KIND,
  systemDetailsFixture,
} from './DetailsPanel.stories.fixtures';

import storyStyles from '../domainStories.module.css';

interface DetailsPanelStoryArgs {
  entityType: 'system' | 'star' | 'planet' | 'minor-body' | 'structure';
  detent: DetentLevel;
}

const meta: Meta<DetailsPanelStoryArgs> = {
  title: 'DOMAIN/Panels',
  parameters: {
    layout: 'centered',
  },
  argTypes: {
    entityType: {
      control: 'select',
      options: ['system', 'star', 'planet', 'minor-body', 'structure'],
      description: 'Entity classification of the focused celestial target',
    },
    detent: {
      control: 'radio',
      options: ['peek', 'partial', 'full'],
      description: 'Vertical detent height state of the details sheet',
    },
  },
};

export default meta;
type Story = StoryObj<DetailsPanelStoryArgs>;

export const DetailsPanelStory: Story = {
  name: 'DetailsPanel',
  args: {
    entityType: 'system',
    detent: 'partial',
  },
  render: (args) => {
    const activeDetails =
      DETAILS_BY_KIND[args.entityType] ?? systemDetailsFixture;

    return (
      <div className={storyStyles.storyWrapper}>
        <header className={storyStyles.header}>
          <h1 className={storyStyles.title}>DetailsPanel</h1>
          <p className={storyStyles.description}>
            Comprehensive multi-detent inspection sheet presenting telemetry, composition, hazards, and canon layers.
          </p>
        </header>

        <Stack gap="loose">
          <section className={storyStyles.section}>
            <h2 className={storyStyles.sectionTitle}>
              Interactive Preview ({args.entityType} · {args.detent})
            </h2>
            <div className={storyStyles.panelContainer}>
              <DetailsPanel
                details={activeDetails}
                activeDetent={args.detent}
              />
            </div>
          </section>
        </Stack>
      </div>
    );
  },
};
