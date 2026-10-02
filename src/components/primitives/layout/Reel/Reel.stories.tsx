import type { Meta, StoryObj } from '@storybook/react-vite';
import { Reel } from './Reel';
import { Box } from '../Box/Box';

const meta: Meta<typeof Reel> = {
  title: 'Primitives/Layout/Reel',
  component: Reel,
  argTypes: {
    itemWidth: {
      control: 'select',
      options: ['sm', 'md', 'lg'],
    },
    gap: {
      control: 'select',
      options: ['none', 'tight', 'default', 'loose'],
    },
    snap: { control: 'boolean' },
  },
};

export default meta;
type Story = StoryObj<typeof Reel>;

export const Default: Story = {
  args: {
    itemWidth: 'md',
    gap: 'default',
    snap: true,
    children: (
      <>
        <Box padding="loose" border="subtle" background="panel">Reel Item 1</Box>
        <Box padding="loose" border="subtle" background="panel">Reel Item 2</Box>
        <Box padding="loose" border="subtle" background="panel">Reel Item 3</Box>
        <Box padding="loose" border="subtle" background="panel">Reel Item 4</Box>
        <Box padding="loose" border="subtle" background="panel">Reel Item 5</Box>
      </>
    ),
  },
};
