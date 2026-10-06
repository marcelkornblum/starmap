import type { Meta, StoryObj } from '@storybook/react-vite';
import { Frame } from './Frame';
import { Box } from '../Box/Box';

const meta: Meta<typeof Frame> = {
  title: 'Primitives/Layout/Frame',
  component: Frame,
  argTypes: {
    ratio: {
      control: 'select',
      options: ['1:1', '16:9', '4:3', '21:9'],
    },
  },
};

export default meta;
type Story = StoryObj<typeof Frame>;

export const Default: Story = {
  args: {
    ratio: '16:9',
    children: (
      <Box padding="default" border="subtle" background="sunken">
        Frame 16:9 Target
      </Box>
    ),
  },
};
