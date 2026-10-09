import type { Meta, StoryObj } from '@storybook/react-vite';
import { Stack as Component } from './Stack';

const meta: Meta<typeof Component> = {
  title: 'INTERFACE/Layouts',
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
    <div style={{ fontFamily: 'sans-serif', padding: '1rem' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{ margin: '0 0 0.5rem 0' }}>Stack</h2>
        <p style={{ margin: 0, color: '#555', maxWidth: '60ch' }}>
          A vertical flow primitive that stacks elements on top of each other, managing the vertical gap between them. It forms the backbone of standard document layouts.
        </p>
      </div>
      <div style={{ backgroundColor: '#ffe6cc', padding: '1rem' }}>
        <Component {...args} style={{ border: '4px solid black', backgroundColor: '#e6ccff' }}>
          <div style={{ backgroundColor: '#ff5c5c', padding: '1rem' }}>1</div>
          <div style={{ backgroundColor: '#5cff8a', padding: '1.5rem' }}>2</div>
          <div style={{ backgroundColor: '#5c8aff', padding: '2rem' }}>3</div>
        </Component>
      </div>
    </div>
  ),
};
