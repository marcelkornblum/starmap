import type { Meta, StoryObj } from '@storybook/react-vite';
import { Icon as Component } from './Icon';

const meta: Meta<typeof Component> = {
  title: 'INTERFACE/Layout',
  component: Component,
  argTypes: {
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg', 'xl'],
    },
  },
};

export default meta;
type Story = StoryObj<typeof Component>;

export const Icon: Story = {
  name: 'Icon',
  args: {
    size: 'lg',
  },
  render: (args) => (
    <div style={{ backgroundColor: '#ffe6cc', padding: '1rem', display: 'inline-block' }}>
      <Component {...args} style={{ border: '4px solid black', backgroundColor: '#e6ccff' }}>
        <svg viewBox="0 0 24 24" fill="none" stroke="#ff5c5c" strokeWidth="2">
          <circle cx="12" cy="12" r="10" />
        </svg>
      </Component>
    </div>
  ),
};
