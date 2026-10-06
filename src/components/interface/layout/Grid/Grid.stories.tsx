import type { Meta, StoryObj } from '@storybook/react-vite';
import { Grid as Component } from './Grid';

const meta: Meta<typeof Component> = {
  title: 'INTERFACE/Layout',
  component: Component,
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
type Story = StoryObj<typeof Component>;

export const Grid: Story = {
  name: 'Grid',
  args: {
    minWidth: 'md',
    gap: 'default',
  },
  render: (args) => (
    <div style={{ fontFamily: 'sans-serif', padding: '1rem' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{ margin: '0 0 0.5rem 0' }}>Grid</h2>
        <p style={{ margin: 0, color: '#555', maxWidth: '60ch' }}>
          A responsive layout primitive that distributes items into a strict grid of minimum-width columns, automatically flowing into new rows as needed without media queries.
        </p>
      </div>
      <div style={{ backgroundColor: '#ffe6cc', padding: '1rem' }}>
        <Component {...args} style={{ border: '4px solid black', backgroundColor: '#e6ccff' }}>
          <div style={{ backgroundColor: '#ff5c5c', padding: '2rem' }}>1</div>
          <div style={{ backgroundColor: '#5cff8a', padding: '2rem' }}>2</div>
          <div style={{ backgroundColor: '#5c8aff', padding: '2rem' }}>3</div>
          <div style={{ backgroundColor: '#ffcc5c', padding: '2rem' }}>4</div>
        </Component>
      </div>
    </div>
  ),
};
