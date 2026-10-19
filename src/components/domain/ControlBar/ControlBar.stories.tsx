import type { Meta, StoryObj } from '@storybook/react-vite';
import { ControlBar } from './ControlBar';

const meta: Meta<typeof ControlBar> = {
  title: 'Domain/ControlBar',
  component: ControlBar,
};

export default meta;
type Story = StoryObj<typeof ControlBar>;

export const GalaxyScope: Story = {
  args: {
    scope: 'galaxy',
  },
};

export const SystemScope: Story = {
  args: {
    scope: 'system',
  },
};

export const PlanetScope: Story = {
  args: {
    scope: 'planet',
  },
};
