import type { Meta, StoryObj } from '@storybook/react-vite';
import { CelestialTitle } from './CelestialTitle';
import { Stack } from '../../layouts/Stack/Stack';

const meta: Meta<typeof CelestialTitle> = {
  title: 'INTERFACE/Information/CelestialTitle',
  component: CelestialTitle,
  parameters: {
    layout: 'centered',
  },
  argTypes: {
    type: {
      control: 'select',
      options: ['star', 'gas-giant', 'terrestrial', 'habitable-zone', 'black-hole'],
      description: 'Canonical celestial classification symbol',
    },
    title: {
      control: 'text',
      description: 'Entity name or title text',
    },
    href: {
      control: 'text',
      description: 'Optional URL link',
    },
  },
};

export default meta;
type Story = StoryObj<typeof CelestialTitle>;

export const Default: Story = {
  args: {
    type: 'habitable-zone',
    title: 'TRAPPIST-1e',
  },
};

export const WithLink: Story = {
  args: {
    type: 'star',
    title: 'Proxima Centauri',
    href: '/system/proxima-centauri',
  },
};

export const Gallery: Story = {
  render: () => (
    <Stack gap="dense">
      <CelestialTitle type="star" title="Sol" as="h2" size="lg" />
      <CelestialTitle type="terrestrial" title="Earth" size="md" />
      <CelestialTitle type="habitable-zone" title="Kepler-186f" size="sm" />
    </Stack>
  ),
};
