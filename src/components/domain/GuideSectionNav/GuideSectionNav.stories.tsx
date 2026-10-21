import type { Meta, StoryObj } from '@storybook/react-vite';
import { GuideSectionNav } from './GuideSectionNav';
import { Stack } from '../../interface/layouts/Stack/Stack';

import storyStyles from '../domainStories.module.css';

const meta: Meta<typeof GuideSectionNav> = {
  title: 'DOMAIN/Guide',
  component: GuideSectionNav,
  parameters: {
    layout: 'centered',
  },
  argTypes: {
    currentSection: {
      control: 'select',
      options: ['star-types', 'planet-types', 'metrics', 'hazards'],
      description: 'Active guide section navigation pill',
    },
  },
};

export default meta;
type Story = StoryObj<typeof GuideSectionNav>;

export const GuideSectionNavStory: Story = {
  name: 'GuideSectionNav',
  args: {
    currentSection: 'star-types',
  },
  render: (args) => (
    <div className={storyStyles.storyWrapper}>
      <header className={storyStyles.header}>
        <h1 className={storyStyles.title}>GuideSectionNav</h1>
        <p className={storyStyles.description}>
          Horizontal section switcher between Star Types, Planet Types, Metrics, and Hazards guides.
        </p>
      </header>

      <Stack gap="loose">
        <section className={storyStyles.section}>
          <h2 className={storyStyles.sectionTitle}>
            Interactive Preview ({args.currentSection})
          </h2>
          <div className={storyStyles.previewContainer}>
            <GuideSectionNav {...args} />
          </div>
        </section>

        <section className={storyStyles.section}>
          <h2 className={storyStyles.sectionTitle}>All Active States</h2>
          <Stack gap="default">
            <GuideSectionNav currentSection="star-types" />
            <GuideSectionNav currentSection="planet-types" />
            <GuideSectionNav currentSection="metrics" />
            <GuideSectionNav currentSection="hazards" />
          </Stack>
        </section>
      </Stack>
    </div>
  ),
};
