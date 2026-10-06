import type { Meta, StoryObj } from '@storybook/react-vite';
import { Box as Component } from './Box';

const meta: Meta<typeof Component> = {
  title: 'INTERFACE/Layout',
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
    <div style={{ backgroundColor: '#ffe6cc', padding: '1rem' }}>
      <Component {...args} style={{ border: '4px solid black', backgroundColor: '#e6ccff' }}>
        <div style={{ backgroundColor: '#ff5c5c', padding: '1rem', color: 'white' }}>Box Content</div>
      </Component>
    </div>
  ),
};
