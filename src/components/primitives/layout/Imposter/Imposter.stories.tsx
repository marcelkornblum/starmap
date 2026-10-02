import type { Meta, StoryObj } from '@storybook/react-vite';
import { Imposter } from './Imposter';
import { Box } from '../Box/Box';

const meta: Meta<typeof Imposter> = {
  title: 'Primitives/Layout/Imposter',
  component: Imposter,
  argTypes: {
    fixed: { control: 'boolean' },
    position: {
      control: 'select',
      options: ['center', 'top-left', 'top-right', 'bottom-left', 'bottom-right', 'top', 'bottom'],
    },
    margin: {
      control: 'select',
      options: ['none', 'tight', 'default', 'loose'],
    },
  },
};

export default meta;
type Story = StoryObj<typeof Imposter>;

export const Default: Story = {
  args: {
    fixed: false,
    position: 'center',
    margin: 'default',
    children: (
      <Box padding="default" border="subtle" background="dock">
        Overlay Imposter Widget
      </Box>
    ),
  },
  decorators: [
    (Story) => (
      <Box padding="none" border="subtle" background="canvas">
        <Story />
      </Box>
    ),
  ],
};
