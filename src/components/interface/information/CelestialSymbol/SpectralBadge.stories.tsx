import type { Meta, StoryObj } from '@storybook/react-vite';
import { SpectralBadge } from './SpectralBadge';
import { Cluster } from '../../layouts/Cluster/Cluster';
import { Stack } from '../../layouts/Stack/Stack';

const meta: Meta<typeof SpectralBadge> = {
  title: 'INTERFACE/Information/SpectralBadge',
  component: SpectralBadge,
  parameters: {
    layout: 'centered',
  },
  argTypes: {
    spectralType: {
      control: 'text',
      description: 'Morgan-Keenan spectral classification',
    },
    interactive: {
      control: 'boolean',
      description: 'Whether badge links to stellar guide',
    },
  },
};

export default meta;
type Story = StoryObj<typeof SpectralBadge>;

export const Default: Story = {
  args: {
    spectralType: 'G2V',
    interactive: true,
  },
};

export const Gallery: Story = {
  render: () => (
    <Stack gap="default">
      <Cluster gap="dense">
        <SpectralBadge spectralType="O5V" />
        <SpectralBadge spectralType="B0V" />
        <SpectralBadge spectralType="A1V" />
        <SpectralBadge spectralType="F5V" />
        <SpectralBadge spectralType="G2V" />
        <SpectralBadge spectralType="K0V" />
        <SpectralBadge spectralType="M4.0V" />
      </Cluster>
    </Stack>
  ),
};
