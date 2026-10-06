import type { Meta, StoryObj } from '@storybook/react-vite';
import { Sidebar as Component } from './Sidebar';

const meta: Meta<typeof Component> = {
  title: 'INTERFACE/Layout',
  component: Component,
  argTypes: {
    side: {
      control: 'radio',
      options: ['start', 'end'],
    },
    sideWidth: {
      control: 'select',
      options: ['sm', 'md', 'lg'],
    },
    gap: {
      control: 'select',
      options: ['none', 'tight', 'default', 'loose'],
    },
  },
};

export default meta;
type Story = StoryObj<typeof Component>;

export const Sidebar: Story = {
  name: 'Sidebar',
  args: {
    side: 'start',
    sideWidth: 'md',
    gap: 'default',
  },
  render: (args) => (
    <div style={{ backgroundColor: '#ffe6cc', padding: '1rem' }}>
      <Component {...args} style={{ border: '4px solid black', backgroundColor: '#e6ccff' }}>
        <div style={{ backgroundColor: '#ff5c5c', padding: '2rem' }}>Sidebar Panel</div>
        <div style={{ backgroundColor: '#5c8aff', padding: '2rem' }}>Main Content</div>
      </Component>
    </div>
  ),
};
