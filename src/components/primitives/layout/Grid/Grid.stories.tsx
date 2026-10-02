import type { Meta, StoryObj } from '@storybook/react-vite';
import { Grid } from './Grid';
import { Box } from '../Box/Box';

const meta: Meta<typeof Grid> = {
  title: 'Primitives/Layout/Grid',
  component: Grid,
  argTypes: {
    minWidth: {
      control: 'select',
      options: ['xs', 'sm', 'md', 'lg', 'xl'],
    },
    gap: {
      control: 'select',
      options: ['none', 'tight', 'default', 'loose'],
    },
  },
};

export default meta;
type Story = StoryObj<typeof Grid>;

export const Default: Story = {
  args: {
    minWidth: 'md',
    gap: 'default',
    children: (
      <>
        <Box padding="default" border="subtle" background="panel">Tile 1</Box>
        <Box padding="default" border="subtle" background="panel">Tile 2</Box>
        <Box padding="default" border="subtle" background="panel">Tile 3</Box>
        <Box padding="default" border="subtle" background="panel">Tile 4</Box>
      </>
    ),
  },
};
