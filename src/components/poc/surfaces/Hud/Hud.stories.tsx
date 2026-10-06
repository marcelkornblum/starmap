import type { Meta, StoryObj } from '@storybook/react-vite';
import { Hud } from './Hud';
import { Cluster, Badge, Button } from '../../primitives';

const meta: Meta<typeof Hud> = {
  title: 'Surfaces/Hud',
  component: Hud,
  argTypes: {
    position: {
      control: 'select',
      options: ['top', 'bottom', 'floating', 'static'],
    },
    padded: {
      control: 'boolean',
    },
  },
};

export default meta;
type Story = StoryObj<typeof Hud>;

export const Default: Story = {
  args: {
    position: 'static',
    children: (
      <Cluster justify="between" align="center">
        <Cluster gap="tight" align="center">
          <strong>✦ STARMAP // HUD</strong>
          <Badge status="nominal">ONLINE</Badge>
        </Cluster>
        <span>RA: 18h 36m 56s | Dec: +38° 47′ 01″ | Epoch: J2000.0</span>
        <Cluster gap="tight">
          <Button size="sm" variant="subtle">GRID</Button>
          <Button size="sm" variant="secondary">RESET</Button>
        </Cluster>
      </Cluster>
    ),
  },
};
