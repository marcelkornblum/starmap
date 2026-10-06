import type { Meta, StoryObj } from '@storybook/react-vite';
import { Stack as Component } from './Stack';

const meta: Meta<typeof Component> = {
  title: 'INTERFACE/Layout',
  component: Component,
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
type Story = StoryObj<typeof Component>;

export const Stack: Story = {
  name: 'Stack',
  args: {
    gap: 'default',
    align: 'stretch',
  },
  render: (args) => (
    <div style={{ backgroundColor: '#ffe6cc', padding: '1rem' }}>
      <Component {...args} style={{ border: '4px solid black', backgroundColor: '#e6ccff' }}>
        <div style={{ backgroundColor: '#ff5c5c', padding: '1rem' }}>1</div>
        <div style={{ backgroundColor: '#5cff8a', padding: '1.5rem' }}>2</div>
        <div style={{ backgroundColor: '#5c8aff', padding: '2rem' }}>3</div>
      </Component>
    </div>
  ),
};
