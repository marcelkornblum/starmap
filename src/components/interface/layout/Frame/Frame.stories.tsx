import type { Meta, StoryObj } from '@storybook/react-vite';
import { Frame as Component } from './Frame';

const meta: Meta<typeof Component> = {
  title: 'INTERFACE/Layout',
  component: Component,
  argTypes: {
    ratio: {
      control: 'select',
      options: ['1:1', '16:9', '4:3', '21:9'],
    },
  },
};

export default meta;
type Story = StoryObj<typeof Component>;

export const Frame: Story = {
  name: 'Frame',
  args: {
    ratio: '16:9',
  },
  render: (args) => (
    <div style={{ backgroundColor: '#ffe6cc', padding: '1rem', width: '300px' }}>
      <Component {...args} style={{ border: '4px solid black', backgroundColor: '#e6ccff' }}>
        <div style={{ width: '100%', height: '100%', backgroundColor: '#ff5c5c', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          Cropped Content
        </div>
      </Component>
    </div>
  ),
};
