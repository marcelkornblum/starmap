import type { Meta, StoryObj } from '@storybook/react-vite';
import { Center } from './Center';
import { Box } from '../Box/Box';

const meta: Meta<typeof Center> = {
  title: 'INTERFACE/Layout',
  component: Center,
  argTypes: {
    max: {
      control: 'select',
      options: ['xs', 'sm', 'md', 'lg', 'xl', 'full'],
    },
    andText: { control: 'boolean' },
    gutter: {
      control: 'select',
      options: ['none', 'tight', 'default', 'loose'],
    },
  },
};

export default meta;
type Story = StoryObj<typeof Center>;

export const Default: Story = {
  name: 'Center',
  args: {
    max: 'md',
    andText: false,
    children: (
      <Box padding="loose" border="subtle" background="panel">
        Centred content container restricted to 60ch with fluid guttering.
      </Box>
    ),
  },
};
