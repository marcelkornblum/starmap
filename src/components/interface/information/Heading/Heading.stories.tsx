import type { Meta, StoryObj } from '@storybook/react-vite';
import { Heading } from './Heading';
import { Badge } from '../Badge/Badge';
import { ConfidencePip } from '../ConfidencePip/ConfidencePip';
import { Stack } from '../../layouts/Stack/Stack';
import { Cluster } from '../../layouts/Cluster/Cluster';

import storyStyles from '../informationStories.module.css';

const meta: Meta<typeof Heading> = {
  title: 'INTERFACE/Information',
  component: Heading,
  parameters: {
    layout: 'centered',
  },
  argTypes: {
    as: {
      control: 'select',
      options: ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'],
      description: 'Underlying HTML semantic heading element',
    },
    size: {
      control: 'select',
      options: ['hero', 'title', 'section', 'lead', 'eyebrow'],
      description: 'Visual typographic scale override',
    },
    eyebrow: {
      control: 'text',
      description: 'Preceding contextual label',
    },
    subtitle: {
      control: 'text',
      description: 'Subordinate description or secondary metadata',
    },
    children: {
      control: 'text',
      description: 'Heading text content',
    },
  },
};

export default meta;
type Story = StoryObj<typeof Heading>;

export const HeadingStory: Story = {
  name: 'Heading',
  args: {
    as: 'h2',
    size: 'title',
    eyebrow: 'Host Star · Solar Neighborhood',
    subtitle:
      'Spectral class G2V main-sequence yellow dwarf star hosting 8 confirmed planets.',
    children: 'Alpha Centauri A',
  },
  render: (args) => (
    <div className={storyStyles.storyWrapper}>
      <header className={storyStyles.header}>
        <h1 className={storyStyles.title}>Heading</h1>
        <p className={storyStyles.description}>
          Semantic typographic headings with hierarchy scaling and decorated context groups.
        </p>
      </header>
      <Stack gap="loose">
        <section className={storyStyles.section}>
          <h2 className={storyStyles.sectionTitle}>Interactive Preview</h2>
          <Heading {...args} />
        </section>

        <section className={storyStyles.section}>
          <h2 className={storyStyles.sectionTitle}>Typographic Sizes</h2>
          <Stack gap="default">
            <Heading as="h1" size="hero">
              Hero Scale (40px / 2.5rem)
            </Heading>
            <Heading as="h2" size="title">
              Title Scale (28px / 1.75rem)
            </Heading>
            <Heading as="h3" size="section">
              Section Scale (20px / 1.25rem)
            </Heading>
            <Heading as="h4" size="lead">
              Lead Scale (16px / 1.0rem)
            </Heading>
            <Heading as="h5" size="eyebrow">
              Eyebrow Scale (11px / 0.6875rem)
            </Heading>
          </Stack>
        </section>

        <section className={storyStyles.section}>
          <h2 className={storyStyles.sectionTitle}>Decorated Heading Groups</h2>
          <Stack gap="loose">
            <Heading
              as="h2"
              size="title"
              eyebrow="Sector +000 +002 -003"
              subtitle="Stellar coordinates relative to galactic origin reference frame."
              badge={<Badge status="nominal">Active Lock</Badge>}
            >
              Tau Ceti System
            </Heading>

            <Heading
              as="h3"
              size="section"
              eyebrow="Exoplanetary Target"
              subtitle="Potential habitable zone candidate with semi-major axis of 0.538 AU."
              badge={
                <Cluster gap="dense" align="center">
                  <Badge category="planet">Exoplanet</Badge>
                  <ConfidencePip confidence="confirmed" />
                </Cluster>
              }
            >
              Tau Ceti e
            </Heading>
          </Stack>
        </section>
      </Stack>
    </div>
  ),
};
