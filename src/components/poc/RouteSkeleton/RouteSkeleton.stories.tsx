import type { Meta, StoryObj } from '@storybook/react-vite';
import { RouteSkeleton } from './RouteSkeleton';

const meta: Meta<typeof RouteSkeleton> = {
  title: 'POC/RouteSkeleton',
  component: RouteSkeleton,
  parameters: {
    layout: 'centered',
  },
};

export default meta;
type Story = StoryObj<typeof RouteSkeleton>;

export const Default: Story = {
  args: {
    label: 'Loading Target Telemetry...',
  },
};
