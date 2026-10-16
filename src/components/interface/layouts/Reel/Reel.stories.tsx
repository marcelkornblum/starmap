import type { Meta, StoryObj } from '@storybook/react-vite';
import { Reel as Component } from './Reel';

const meta: Meta<typeof Component> = {
  title: 'INTERFACE/Layouts',
  component: Component,
  argTypes: {
    itemWidth: {
      control: 'select',
      options: ['sm', 'md', 'lg'],
    },
    gap: {
      control: 'select',
      options: ['none', 'tight', 'default', 'loose'],
    },
    snap: { control: 'boolean' },
  },
};

export default meta;
type Story = StoryObj<typeof Component>;

export const Reel: Story = {
  name: 'Reel',
  args: {
    itemWidth: 'md',
    gap: 'default',
    snap: true,
  },
  render: (args) => (
    <div style={{ fontFamily: 'sans-serif', padding: '1rem' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{ margin: '0 0 0.5rem 0' }}>Reel</h2>
        <p style={{ margin: 0, color: '#555', maxWidth: '60ch' }}>
          A horizontal scrolling primitive that allows content to overflow its container, displaying items in a continuous horizontal track with optional snap points.
        </p>
      </div>
      <div style={{ backgroundColor: '#ffe6cc', padding: '1rem' }}>
        <Component {...args} style={{ border: '4px solid black', backgroundColor: '#e6ccff' }}>
          <div style={{ backgroundColor: '#ff5c5c', padding: '2rem', flexShrink: 0, minWidth: '300px' }}>1</div>
          <div style={{ backgroundColor: '#5cff8a', padding: '2rem', flexShrink: 0, minWidth: '300px' }}>2</div>
          <div style={{ backgroundColor: '#5c8aff', padding: '2rem', flexShrink: 0, minWidth: '300px' }}>3</div>
          <div style={{ backgroundColor: '#ffcc5c', padding: '2rem', flexShrink: 0, minWidth: '300px' }}>4</div>
        </Component>
      </div>
    </div>
  ),
};
