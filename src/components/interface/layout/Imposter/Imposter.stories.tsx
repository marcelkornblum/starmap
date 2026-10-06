import type { Meta, StoryObj } from '@storybook/react-vite';
import { Imposter as Component } from './Imposter';

const meta: Meta<typeof Component> = {
  title: 'INTERFACE/Layout',
  component: Component,
  argTypes: {
    fixed: { control: 'boolean' },
    position: {
      control: 'select',
      options: ['center', 'top-left', 'top-right', 'bottom-left', 'bottom-right', 'top', 'bottom'],
    },
    margin: {
      control: 'select',
      options: ['none', 'tight', 'default', 'loose'],
    },
  },
};

export default meta;
type Story = StoryObj<typeof Component>;

export const Imposter: Story = {
  name: 'Imposter',
  args: {
    fixed: false,
    position: 'center',
    margin: 'default',
  },
  render: (args) => (
    <div style={{ position: 'relative', width: '100%', height: '300px', backgroundColor: '#ffe6cc', overflow: 'hidden' }}>
      <Component {...args} style={{ border: '4px solid black', backgroundColor: '#e6ccff', padding: '1rem' }}>
        <div style={{ backgroundColor: '#ff5c5c', padding: '1rem', color: 'white' }}>Imposter Element</div>
      </Component>
    </div>
  ),
};
