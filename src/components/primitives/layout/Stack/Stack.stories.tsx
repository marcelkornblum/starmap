import type { Meta, StoryObj } from '@storybook/react-vite';
import { Stack } from './Stack';

const meta: Meta<typeof Stack> = {
  title: 'Primitives/Layout/Stack',
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
