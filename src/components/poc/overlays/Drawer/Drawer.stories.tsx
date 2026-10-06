import type { Meta, StoryObj } from '@storybook/react-vite';
import { Drawer } from './Drawer';

const meta: Meta<typeof Drawer> = {
  title: 'POC/Overlays/Drawer',
  component: Drawer,
  argTypes: {
    position: {
      control: 'select',
      options: ['left', 'right', 'top', 'bottom'],
    },
    isOpen: {
      control: 'boolean',
    },
  },
};

export default meta;
type Story = StoryObj<typeof Drawer>;

export const Default: Story = {
  args: {
    isOpen: true,
    title: 'Navigation Systems',
    position: 'right',
    children: 'Telemetry drawer content displaying sublight engine diagnostics and warp manifold pressure.',
    onClose: () => {},
  },
};

export const LeftSidebarDrawer: Story = {
  args: {
    isOpen: true,
    title: 'Cartography Controls',
    position: 'left',
    children: 'Left docked control drawer for celestial filtering and coordinate alignment.',
    onClose: () => {},
  },
};
