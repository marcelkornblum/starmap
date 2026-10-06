import type { Meta, StoryObj } from '@storybook/react-vite';
import { Cluster } from './Cluster';
import { Badge } from '../../data/Badge/Badge';

const meta: Meta<typeof Cluster> = {
  title: 'Primitives/Layout/Cluster',
  component: Cluster,
  argTypes: {
    gap: {
      control: 'select',
      options: ['none', 'dense', 'tight', 'default', 'loose', 'section', 'fib-1', 'fib-2', 'fib-3', 'fib-4', 'fib-5', 'fib-6', 'fib-7'],
    },
    align: {
      control: 'select',
      options: ['start', 'center', 'end', 'stretch', 'baseline'],
    },
    justify: {
      control: 'select',
      options: ['start', 'center', 'end', 'between', 'around', 'evenly'],
    },
  },
};

export default meta;
type Story = StoryObj<typeof Cluster>;

export const Default: Story = {
  args: {
    gap: 'default',
    align: 'center',
    justify: 'start',
    children: (
      <>
        <Badge>Tag A</Badge>
        <Badge>Tag B</Badge>
        <Badge>Tag C</Badge>
      </>
    ),
  },
};
