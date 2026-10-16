import type { Meta, StoryObj } from '@storybook/react-vite';
import { Box as Component } from './Box';

const meta: Meta<typeof Component> = {
  title: 'INTERFACE/Layouts',
  component: Component,
  argTypes: {
    padding: {
      control: 'select',
      options: ['none', 'tight', 'default', 'loose'],
    },
  },
};

export default meta;
type Story = StoryObj<typeof Component>;

export const Box: Story = {
  name: 'Box',
  args: { padding: 'default' },
  render: (args) => (
    <div style={{ fontFamily: 'sans-serif', padding: '1rem' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{ margin: '0 0 0.5rem 0' }}>Box</h2>
        <p style={{ margin: 0, color: '#555', maxWidth: '60ch' }}>
          A foundational container primitive that controls internal padding, background, and borders. It serves as the primary building block for distinct UI surfaces.
        </p>
      </div>
      <div style={{ backgroundColor: '#ffe6cc', padding: '1rem' }}>
        <Component {...args} style={{ border: '4px solid black', backgroundColor: '#e6ccff' }}>
          <div style={{ backgroundColor: '#ff5c5c', padding: '1rem', color: 'white' }}>Box Content</div>
        </Component>
      </div>
    </div>
  ),
};
