import type { Meta, StoryObj } from '@storybook/react-vite';
import { Cover as Component } from './Cover';

const meta: Meta<typeof Component> = {
  title: 'INTERFACE/Layout',
  component: Component,
  argTypes: {
    minHeight: { control: 'text' },
  },
};

export default meta;
type Story = StoryObj<typeof Component>;

export const Cover: Story = {
  name: 'Cover',
  args: {
    minHeight: 'viewport',
  },
  render: (args) => (
    <div style={{ fontFamily: 'sans-serif', padding: '1rem' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{ margin: '0 0 0.5rem 0' }}>Cover</h2>
        <p style={{ margin: 0, color: '#555', maxWidth: '60ch' }}>
          A vertical layout primitive that centers a principal element while pushing an optional header to the top and an optional footer to the bottom of the container.
        </p>
      </div>
      <div style={{ backgroundColor: '#ffe6cc', padding: '1rem' }}>
        <Component 
          {...args} 
          style={{ border: '4px solid black', backgroundColor: '#e6ccff' }}
          header={<div style={{ backgroundColor: '#5c8aff', padding: '1rem' }}>Header</div>}
          footer={<div style={{ backgroundColor: '#5cff8a', padding: '1rem' }}>Footer</div>}
        >
          <div style={{ backgroundColor: '#ff5c5c', padding: '2rem' }}>Principal Center Content</div>
        </Component>
      </div>
    </div>
  ),
};
