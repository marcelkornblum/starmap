import type { Meta, StoryObj } from '@storybook/react-vite';
import { ConfidencePip } from './ConfidencePip';
import { Cluster } from '../../layouts/Cluster/Cluster';
import { Stack } from '../../layouts/Stack/Stack';

import storyStyles from '../informationStories.module.css';

const meta = {
  title: 'INTERFACE/Information',
  component: ConfidencePip,
  parameters: {
    layout: 'centered',
  },
  argTypes: {
    confidence: {
      control: { type: 'select' },
      options: ['confirmed', 'candidate', 'theoretical', 'projected', 'unverified', 'high', 'medium', 'low'],
      description: 'Observational confidence level',
    },
    size: {
      control: { type: 'inline-radio' },
      options: ['sm', 'md', 'lg'],
      description: 'Pip dot size',
    },
    tooltipPosition: {
      control: { type: 'select' },
      options: ['top', 'bottom', 'left', 'right'],
      description: 'Tooltip placement relative to pip',
    },
    defaultOpen: {
      control: 'boolean',
      description: 'Whether tooltip is open initially',
    },
  },
  args: {
    confidence: 'confirmed',
    size: 'md',
    tooltipPosition: 'top',
    defaultOpen: false,
  },
} satisfies Meta<typeof ConfidencePip>;

export default meta;
type Story = StoryObj<typeof meta>;

export const ConfidencePipStory: Story = {
  name: 'ConfidencePip',
  render: (args) => (
    <div className={storyStyles.storyWrapper}>
      <header className={storyStyles.header}>
        <h1 className={storyStyles.title}>ConfidencePip</h1>
        <p className={storyStyles.description}>
          Observational certainty indicator with interactive tooltip and glow states.
        </p>
      </header>
      <Stack gap="loose">
        <section className={storyStyles.section}>
          <h2 className={storyStyles.sectionTitle}>Interactive Preview</h2>
          <div>
            <ConfidencePip {...args} details="Gaia DR3 astrometric lock" />
          </div>
        </section>
        <section className={storyStyles.section}>
          <h2 className={storyStyles.sectionTitle}>All Confidence Levels</h2>
          <Stack gap="dense">
            <Cluster gap="loose" align="center">
              <span>Confirmed:</span>
              <ConfidencePip confidence="confirmed" defaultOpen />
            </Cluster>
            <Cluster gap="loose" align="center">
              <span>Candidate:</span>
              <ConfidencePip confidence="candidate" defaultOpen />
            </Cluster>
            <Cluster gap="loose" align="center">
              <span>Theoretical:</span>
              <ConfidencePip confidence="theoretical" defaultOpen />
            </Cluster>
            <Cluster gap="loose" align="center">
              <span>Unverified:</span>
              <ConfidencePip confidence="unverified" defaultOpen />
            </Cluster>
          </Stack>
        </section>
        <section className={storyStyles.section}>
          <h2 className={storyStyles.sectionTitle}>In Typographic Row</h2>
          <Stack gap="dense">
            <Cluster gap="dense" align="center">
              <span>Kepler-452b (Cygnus arm Earth analogue)</span>
              <ConfidencePip confidence="confirmed" />
            </Cluster>
            <Cluster gap="dense" align="center">
              <span>Proxima Centauri d (Sub-Earth transit candidate)</span>
              <ConfidencePip confidence="candidate" />
            </Cluster>
            <Cluster gap="dense" align="center">
              <span>Gliese 581 g (Habitable zone theoretical candidate)</span>
              <ConfidencePip confidence="theoretical" />
            </Cluster>
          </Stack>
        </section>
      </Stack>
    </div>
  ),
};
