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
    <div style={{ backgroundColor: '#ffe6cc', padding: '1rem' }}>
      <Component {...args} style={{ border: '4px solid black', backgroundColor: '#e6ccff' }}>
        <div style={{ backgroundColor: '#ff5c5c', padding: '1rem', color: 'white', textAlign: 'center' }}>
          Centered Content (Max Width Constrained)
        </div>
      </Component>
    </div>
  ),
};
