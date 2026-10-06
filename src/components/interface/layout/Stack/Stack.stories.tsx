import type { Meta, StoryObj } from '@storybook/react-vite';
import { Stack } from './Stack';
import { Box } from '../Box/Box';

const meta: Meta<typeof Stack> = {
  title: 'INTERFACE/Layout',
  component: Stack,
  argTypes: {
    gap: {
      control: 'select',
      options: ['none', 'dense', 'tight', 'default', 'loose', 'section', 'fib-1', 'fib-2', 'fib-3', 'fib-4', 'fib-5', 'fib-6', 'fib-7'],
    },
    align: {
      control: 'select',
      options: ['start', 'center', 'end', 'stretch', 'baseline'],
    },
  },
};

export default meta;
type Story = StoryObj<typeof Stack>;

export const Default: Story = {
  name: 'Stack',
  args: {
    gap: 'default',
    align: 'stretch',
    children: (
      <>
        <Box padding="tight" border="subtle" background="panel">Stack Item 1</Box>
        <Box padding="tight" border="subtle" background="panel">Stack Item 2</Box>
        <Box padding="tight" border="subtle" background="panel">Stack Item 3</Box>
      </>
    ),
  },
};
