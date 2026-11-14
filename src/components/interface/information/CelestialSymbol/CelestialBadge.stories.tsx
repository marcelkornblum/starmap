import type { Meta, StoryObj } from '@storybook/react-vite';
import { CelestialBadge } from './CelestialBadge';
import { Cluster } from '../../layouts/Cluster/Cluster';
import { Stack } from '../../layouts/Stack/Stack';

const meta: Meta<typeof CelestialBadge> = {
  title: 'INTERFACE/Information/CelestialBadge',
  component: CelestialBadge,
  parameters: {
    layout: 'centered',
  },
  argTypes: {
    type: {
      control: 'select',
      options: ['star', 'gas-giant', 'terrestrial', 'habitable-zone', 'black-hole'],
      description: 'Canonical celestial classification symbol',
    },
    showLabel: {
      control: 'boolean',
      description: 'Display text label alongside symbol',
    },
    interactive: {
      control: 'boolean',
      description: 'Link to catalog guide definition',
    },
  },
};

export default meta;
type Story = StoryObj<typeof CelestialBadge>;

export const Default: Story = {
  args: {
    type: 'habitable-zone',
    showLabel: true,
  },
};

export const Gallery: Story = {
  render: () => (
    <Stack gap="default">
      <Cluster gap="dense">
        <CelestialBadge type="star" showLabel />
        <CelestialBadge type="terrestrial" showLabel />
        <CelestialBadge type="gas-giant" showLabel />
        <CelestialBadge type="habitable-zone" showLabel />
        <CelestialBadge type="black-hole" showLabel />
      </Cluster>
    </Stack>
  ),
};
