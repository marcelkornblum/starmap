import type { Meta, StoryObj } from '@storybook/react-vite';
import { HazardBadge } from './HazardBadge';
import { Cluster } from '../../layouts/Cluster/Cluster';
import { Stack } from '../../layouts/Stack/Stack';

const meta: Meta<typeof HazardBadge> = {
  title: 'INTERFACE/Information/HazardBadge',
  component: HazardBadge,
  parameters: {
    layout: 'centered',
  },
  argTypes: {
    label: {
      control: 'text',
      description: 'Hazard description text',
    },
    severity: {
      control: 'select',
      options: ['caution', 'warning', 'critical'],
      description: 'Hazard severity level',
    },
    code: {
      control: 'text',
      description: 'Astrophysical hazard code',
    },
  },
};

export default meta;
type Story = StoryObj<typeof HazardBadge>;

export const Default: Story = {
  args: {
    label: 'High Radiation',
    severity: 'warning',
    code: 'RAD-01',
  },
};

export const Critical: Story = {
  args: {
    label: 'Supernova Remnant Shockwave',
    severity: 'critical',
    code: 'SN-04',
  },
};

export const Gallery: Story = {
  render: () => (
    <Stack gap="default">
      <Cluster gap="dense">
        <HazardBadge severity="caution" label="Solar Flare Activity" code="SOL-02" />
        <HazardBadge severity="warning" label="High Tidal Forces" code="TID-01" />
        <HazardBadge severity="critical" label="Relativistic Jet" code="BH-01" />
      </Cluster>
    </Stack>
  ),
};
