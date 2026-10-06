import type { Meta, StoryObj } from '@storybook/react-vite';
import { Dock } from './Dock';
import { Cluster } from '../../primitives';

const meta: Meta<typeof Dock> = {
  title: 'POC/Surfaces/Dock',
  component: Dock,
  argTypes: {
    position: {
      control: 'select',
      options: ['floating', 'top', 'bottom', 'left', 'right'],
    },
  },
};

export default meta;
type Story = StoryObj<typeof Dock>;

export const Default: Story = {
  args: {
    position: 'floating',
    children: (
      <Cluster gap="tight">
        <span>Galaxy View</span>
        <span>•</span>
        <span>System View</span>
        <span>•</span>
        <span>Planet View</span>
      </Cluster>
    ),
  },
};
