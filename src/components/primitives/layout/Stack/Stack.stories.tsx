import type { Meta, StoryObj } from '@storybook/react-vite';
import { Stack } from './Stack';

const meta: Meta<typeof Stack> = {
  title: 'Primitives/Layout/Stack',
  component: Stack,
  argTypes: {
    gap: {
      control: 'select',
      options: ['none', 'tight', 'default', 'loose', 'space-1', 'space-2', 'space-3', 'space-4', 'space-5', 'space-6', 'space-7', 'space-8', 'space-9'],
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
  args: {
    gap: 'default',
    align: 'stretch',
    children: (
      <>
        <div style={{ padding: '8px', background: 'var(--surface-panel-bg)', border: '1px solid var(--surface-panel-border-color)' }}>Stack Item 1</div>
        <div style={{ padding: '8px', background: 'var(--surface-panel-bg)', border: '1px solid var(--surface-panel-border-color)' }}>Stack Item 2</div>
        <div style={{ padding: '8px', background: 'var(--surface-panel-bg)', border: '1px solid var(--surface-panel-border-color)' }}>Stack Item 3</div>
      </>
    ),
  },
};
