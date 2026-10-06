import type { Meta, StoryObj } from '@storybook/react-vite';
import { SystemControls } from './SystemControls';

const meta: Meta<typeof SystemControls> = {
  title: 'POC/Domain/SystemControls',
  component: SystemControls,
  argTypes: {
    showOrbits: { control: 'boolean' },
    showGrid: { control: 'boolean' },
    showLabels: { control: 'boolean' },
    isPlaying: { control: 'boolean' },
    timeSpeed: { control: { type: 'range', min: 0, max: 100, step: 1 } },
    projection: { control: 'select', options: ['3d', 'top-down'] },
  },
};

export default meta;
type Story = StoryObj<typeof SystemControls>;

export const Default: Story = {
  args: {
    showOrbits: true,
    showGrid: true,
    showLabels: true,
    isPlaying: true,
    timeSpeed: 10,
    projection: '3d',
    onResetView: () => console.log('Reset view'),
  },
};
