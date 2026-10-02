import type { Meta, StoryObj } from '@storybook/react-vite';
import { Cluster } from './Cluster';

const meta: Meta<typeof Cluster> = {
  title: 'Primitives/Layout/Cluster',
  component: Cluster,
  argTypes: {
    gap: {
      control: 'select',
      options: ['none', 'tight', 'default', 'loose', 'space-1', 'space-2', 'space-3', 'space-4', 'space-5', 'space-6', 'space-7', 'space-8', 'space-9'],
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
