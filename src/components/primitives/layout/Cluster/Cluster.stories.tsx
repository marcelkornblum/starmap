import type { Meta, StoryObj } from '@storybook/react-vite';
import { Cluster } from './Cluster';

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
        <span style={{ padding: '4px 8px', background: 'var(--surface-dock-bg)', border: '1px solid var(--surface-dock-border-color)' }}>Tag A</span>
        <span style={{ padding: '4px 8px', background: 'var(--surface-dock-bg)', border: '1px solid var(--surface-dock-border-color)' }}>Tag B</span>
        <span style={{ padding: '4px 8px', background: 'var(--surface-dock-bg)', border: '1px solid var(--surface-dock-border-color)' }}>Tag C</span>
      </>
    ),
  },
};
