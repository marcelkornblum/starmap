import type { Meta, StoryObj } from '@storybook/react-vite';
import { Box } from './Box';

const meta: Meta<typeof Box> = {
  title: 'Primitives/Layout/Box',
  component: Box,
  argTypes: {
    padding: {
      control: 'select',
      options: ['none', 'tight', 'default', 'loose'],
    },
    border: {
      control: 'select',
      options: ['none', 'subtle', 'default', 'accent'],
    },
    background: {
      control: 'select',
      options: ['canvas', 'sunken', 'panel', 'dock', 'overlay'],
    },
  },
};

export default meta;
type Story = StoryObj<typeof Box>;

export const Default: Story = {
  args: {
    padding: 'default',
    border: 'subtle',
    background: 'panel',
    children: 'Token-driven box container with standard padding and border styling.',
  },
};
