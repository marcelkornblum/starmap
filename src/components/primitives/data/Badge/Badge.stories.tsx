import type { Meta, StoryObj } from '@storybook/react-vite';
import { Badge } from './Badge';
import { Cluster } from '../../layout/Cluster/Cluster';
import { Stack } from '../../layout/Stack/Stack';
import { ConfidencePip } from '../ConfidencePip/ConfidencePip';

const meta: Meta<typeof Badge> = {
  title: 'Primitives/Data/Badge',
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

export const Default: Story = {
  args: {
    children: 'G-Type Main Sequence',
    category: 'star',
  },
};

export const TelemetryStatuses: Story = {
  render: () => (
    <Cluster gap="dense">
      <Badge status="nominal">Nominal Lock</Badge>
      <Badge status="info">Calibrating</Badge>
      <Badge status="caution">Perturbation</Badge>
      <Badge status="critical">Attitude Lost</Badge>
      <Badge status="neutral">Standby</Badge>
    </Cluster>
  ),
};

export const ConfidenceTiers: Story = {
  render: () => (
    <Cluster gap="dense">
      <Badge confidence="confirmed">Confirmed Exoplanet</Badge>
      <Badge confidence="candidate">Kepler Candidate</Badge>
      <Badge confidence="projected">Projected Ephemeris</Badge>
      <Badge confidence="unverified">Unverified Signal</Badge>
    </Cluster>
  ),
};

export const CelestialCategories: Story = {
  render: () => (
    <Cluster gap="dense">
      <Badge category="star">Star</Badge>
      <Badge category="planet">Exoplanet</Badge>
      <Badge category="nebula">Emission Nebula</Badge>
      <Badge category="constellation">Constellation</Badge>
    </Cluster>
  ),
};

export const CompositeWithConfidencePip: Story = {
  render: () => (
    <Stack gap="default">
      <Cluster gap="dense" align="center">
        <Badge category="planet">
          Kepler-452b
          <ConfidencePip confidence="confirmed" />
        </Badge>
        <Badge category="star">
          Proxima Centauri
          <ConfidencePip confidence="confirmed" />
        </Badge>
      </Cluster>
      <Cluster gap="dense" align="center">
        <Badge category="planet">
          TOI-700 d
          <ConfidencePip confidence="candidate" />
        </Badge>
        <Badge category="nebula">
          Tabby's Star Cloud
          <ConfidencePip confidence="unverified" />
        </Badge>
      </Cluster>
    </Stack>
  ),
};
