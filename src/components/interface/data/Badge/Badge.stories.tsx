import type { Meta, StoryObj } from '@storybook/react-vite';
import { Badge } from './Badge';
import { Cluster } from '../../layouts/Cluster/Cluster';
import { Stack } from '../../layouts/Stack/Stack';
import { ConfidencePip } from '../ConfidencePip/ConfidencePip';

import storyStyles from '../dataStories.module.css';

const meta: Meta<typeof Badge> = {
  title: 'INTERFACE/Data',
  component: Badge,
  parameters: {
    layout: 'centered',
  },
  argTypes: {
    status: {
      control: 'select',
      options: [undefined, 'nominal', 'caution', 'critical', 'info', 'neutral'],
    },
    confidence: {
      control: 'select',
      options: [undefined, 'confirmed', 'candidate', 'projected', 'unverified'],
    },
    category: {
      control: 'select',
      options: [undefined, 'star', 'planet', 'nebula', 'constellation'],
    },
  },
};

export default meta;
type Story = StoryObj<typeof Badge>;

export const BadgeStory: Story = {
  name: 'Badge',
  args: {
    children: 'G-Type Main Sequence',
    category: 'star',
  },
  render: (args) => (
    <div className={storyStyles.storyWrapper}>
      <header className={storyStyles.header}>
        <h1 className={storyStyles.title}>Badge</h1>
        <p className={storyStyles.description}>
          Compact status, classification, and telemetry tier indicator.
        </p>
      </header>
      <Stack gap="loose">
        <section className={storyStyles.section}>
          <h2 className={storyStyles.sectionTitle}>Interactive Preview</h2>
          <div>
            <Badge {...args} />
          </div>
        </section>
        <section className={storyStyles.section}>
          <h2 className={storyStyles.sectionTitle}>Telemetry Statuses</h2>
          <Cluster gap="dense">
            <Badge status="nominal">Nominal Lock</Badge>
            <Badge status="info">Calibrating</Badge>
            <Badge status="caution">Perturbation</Badge>
            <Badge status="critical">Attitude Lost</Badge>
            <Badge status="neutral">Standby</Badge>
          </Cluster>
        </section>
        <section className={storyStyles.section}>
          <h2 className={storyStyles.sectionTitle}>Confidence Tiers</h2>
          <Cluster gap="dense">
            <Badge confidence="confirmed">Confirmed Exoplanet</Badge>
            <Badge confidence="candidate">Kepler Candidate</Badge>
            <Badge confidence="projected">Projected Ephemeris</Badge>
            <Badge confidence="unverified">Unverified Signal</Badge>
          </Cluster>
        </section>
        <section className={storyStyles.section}>
          <h2 className={storyStyles.sectionTitle}>Celestial Categories</h2>
          <Cluster gap="dense">
            <Badge category="star">Star</Badge>
            <Badge category="planet">Exoplanet</Badge>
            <Badge category="nebula">Emission Nebula</Badge>
            <Badge category="constellation">Constellation</Badge>
          </Cluster>
        </section>
        <section className={storyStyles.section}>
          <h2 className={storyStyles.sectionTitle}>Composite with ConfidencePip</h2>
          <Cluster gap="dense" align="center">
            <Badge category="planet">
              Kepler-452b
              <ConfidencePip confidence="confirmed" />
            </Badge>
            <Badge category="star">
              Proxima Centauri
              <ConfidencePip confidence="candidate" />
            </Badge>
          </Cluster>
        </section>
      </Stack>
    </div>
  ),
};
