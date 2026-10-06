import type { Meta, StoryObj } from '@storybook/react-vite';
import { Switcher } from './Switcher';
import { Box } from '../Box/Box';

const meta: Meta<typeof Switcher> = {
  title: 'INTERFACE/Layout',
  component: Switcher,
  argTypes: {
    threshold: {
      control: 'select',
      options: ['sm', 'md', 'lg', 'xl'],
    },
    limit: {
      control: 'select',
      options: [2, 3, 4],
    },
    gap: {
      control: 'select',
      options: ['none', 'tight', 'default', 'loose'],
    },
  },
};

export default meta;
type Story = StoryObj<typeof Switcher>;

export const Default: Story = {
  name: 'Switcher',
  args: {
    threshold: 'md',
    gap: 'default',
    children: (
      <>
        <Box padding="default" border="subtle" background="panel">
          Switcher Item 1
        </Box>
        <Box padding="default" border="subtle" background="panel">
          Switcher Item 2
        </Box>
        <Box padding="default" border="subtle" background="panel">
          Switcher Item 3
        </Box>
      </>
    ),
  },
};
