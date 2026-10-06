import type { Meta, StoryObj } from '@storybook/react-vite';
import { Center as Component } from './Center';

const meta: Meta<typeof Component> = {
  title: 'INTERFACE/Layout',
  component: Component,
  argTypes: {
    max: {
      control: 'select',
      options: ['xs', 'sm', 'md', 'lg', 'xl', 'full'],
    },
    andText: { control: 'boolean' },
    gutter: {
      control: 'select',
      options: ['none', 'tight', 'default', 'loose'],
    },
  },
};

export default meta;
type Story = StoryObj<typeof Component>;

export const Center: Story = {
  name: 'Center',
  args: {
    max: 'md',
    andText: false,
  },
  render: (args) => (
    <div style={{ fontFamily: 'sans-serif', padding: '1rem' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{ margin: '0 0 0.5rem 0' }}>Center</h2>
        <p style={{ margin: 0, color: '#555', maxWidth: '60ch' }}>
          A layout primitive that centers its content horizontally and enforces a maximum inline width. Used for readable text blocks and constrained content areas.
        </p>
      </div>
      <div style={{ backgroundColor: '#ffe6cc', padding: '1rem' }}>
        <Component {...args} style={{ border: '4px solid black', backgroundColor: '#e6ccff' }}>
          <div style={{ backgroundColor: '#ff5c5c', padding: '1rem', color: 'white', textAlign: 'center' }}>
            Centered Content (Max Width Constrained)
          </div>
        </Component>
      </div>
    </div>
  ),
};
