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
    <div style={{ fontFamily: 'sans-serif', padding: '1rem' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{ margin: '0 0 0.5rem 0' }}>Sidebar</h2>
        <p style={{ margin: 0, color: '#555', maxWidth: '60ch' }}>
          A responsive structural primitive that places a flexible main content area alongside a fixed-width sidebar, stacking them vertically when horizontal space is tight.
        </p>
      </div>
      <div style={{ backgroundColor: '#ffe6cc', padding: '1rem' }}>
        <Component {...args} style={{ border: '4px solid black', backgroundColor: '#e6ccff' }}>
          <div style={{ backgroundColor: '#ff5c5c', padding: '2rem' }}>Sidebar Panel</div>
          <div style={{ backgroundColor: '#5c8aff', padding: '2rem' }}>Main Content</div>
        </Component>
      </div>
    </div>
  ),
};
