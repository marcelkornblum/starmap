import type { Meta, StoryObj } from '@storybook/react-vite';
import { Sidebar } from './Sidebar';
import { Box } from '../Box/Box';

const meta: Meta<typeof Sidebar> = {
  title: 'INTERFACE/Layout',
  component: Sidebar,
  argTypes: {
    side: {
      control: 'radio',
      options: ['start', 'end'],
    },
    sideWidth: {
      control: 'select',
      options: ['sm', 'md', 'lg'],
    },
    gap: {
      control: 'select',
      options: ['none', 'tight', 'default', 'loose'],
    },
  },
};

export default meta;
type Story = StoryObj<typeof Sidebar>;

export const Default: Story = {
  name: 'Sidebar',
  args: {
    side: 'start',
    sideWidth: 'md',
    gap: 'default',
    children: (
      <>
        <Box padding="default" border="subtle" background="dock">
          Sidebar Panel
        </Box>
        <Box padding="default" border="subtle" background="panel">
          Main Content Area
        </Box>
      </>
    ),
  },
};
