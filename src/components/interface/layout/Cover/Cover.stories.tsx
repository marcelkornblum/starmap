import type { Meta, StoryObj } from '@storybook/react-vite';
import { Cover as Component } from './Cover';

const meta: Meta<typeof Component> = {
  title: 'INTERFACE/Layout',
  component: Component,
  argTypes: {
    minHeight: { control: 'text' },
  },
};

export default meta;
type Story = StoryObj<typeof Component>;

export const Cover: Story = {
  name: 'Cover',
  args: {
    minHeight: 'viewport',
  },
  render: (args) => (
    <div style={{ backgroundColor: '#ffe6cc', padding: '1rem' }}>
      <Component 
        {...args} 
        style={{ border: '4px solid black', backgroundColor: '#e6ccff' }}
        header={<div style={{ backgroundColor: '#5c8aff', padding: '1rem' }}>Header</div>}
        footer={<div style={{ backgroundColor: '#5cff8a', padding: '1rem' }}>Footer</div>}
      >
        <div style={{ backgroundColor: '#ff5c5c', padding: '2rem' }}>Principal Center Content</div>
      </Component>
    </div>
  ),
};
