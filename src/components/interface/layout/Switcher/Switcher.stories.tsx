import type { Meta, StoryObj } from '@storybook/react-vite';
import { Switcher as Component } from './Switcher';

const meta: Meta<typeof Component> = {
  title: 'INTERFACE/Layout',
  component: Component,
  argTypes: {
    threshold: {
      control: 'select',
      options: ['sm', 'md', 'lg', 'xl'],
    },
    limit: {
      control: 'select',
      options: [2, 3, 4],
    },
    gap: {
      control: 'select',
      options: ['none', 'tight', 'default', 'loose'],
    },
  },
};

export default meta;
type Story = StoryObj<typeof Component>;

export const Switcher: Story = {
  name: 'Switcher',
  args: {
    threshold: 'md',
    gap: 'default',
  },
  render: (args) => (
    <div style={{ backgroundColor: '#ffe6cc', padding: '1rem' }}>
      <Component {...args} style={{ border: '4px solid black', backgroundColor: '#e6ccff' }}>
        <div style={{ backgroundColor: '#ff5c5c', padding: '1.5rem' }}>1</div>
        <div style={{ backgroundColor: '#5cff8a', padding: '1.5rem' }}>2</div>
        <div style={{ backgroundColor: '#5c8aff', padding: '1.5rem' }}>3</div>
      </Component>
    </div>
  ),
};
