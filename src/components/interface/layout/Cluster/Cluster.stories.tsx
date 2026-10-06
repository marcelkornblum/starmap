import type { Meta, StoryObj } from '@storybook/react-vite';
import { Cluster as Component } from './Cluster';

const meta: Meta<typeof Component> = {
  title: 'INTERFACE/Layout',
  component: Component,
  argTypes: {
    gap: {
      control: 'select',
      options: ['none', 'dense', 'tight', 'default', 'loose', 'section'],
    },
    justify: {
      control: 'select',
      options: ['start', 'end', 'center', 'between', 'around', 'evenly'],
    },
    align: {
      control: 'select',
      options: ['start', 'end', 'center', 'stretch', 'baseline'],
    },
  },
};

export default meta;
type Story = StoryObj<typeof Component>;

export const Cluster: Story = {
  name: 'Cluster',
  args: {
    gap: 'default',
    justify: 'start',
    align: 'center',
  },
  render: (args) => (
    <div style={{ fontFamily: 'sans-serif', padding: '1rem' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{ margin: '0 0 0.5rem 0' }}>Cluster</h2>
        <p style={{ margin: 0, color: '#555', maxWidth: '60ch' }}>
          A flexbox primitive that groups elements closely together, wrapping them logically into rows when horizontal space runs out. Ideal for button groups, tags, and inline controls.
        </p>
      </div>
      <div style={{ backgroundColor: '#ffe6cc', padding: '1rem' }}>
        <Component {...args} style={{ border: '4px solid black', backgroundColor: '#e6ccff' }}>
          <div style={{ backgroundColor: '#ff5c5c', padding: '0.5rem 1rem' }}>1</div>
          <div style={{ backgroundColor: '#5cff8a', padding: '0.5rem 2rem' }}>2</div>
          <div style={{ backgroundColor: '#5c8aff', padding: '0.5rem 1.5rem' }}>3</div>
          <div style={{ backgroundColor: '#ffcc5c', padding: '0.5rem 1rem' }}>4</div>
        </Component>
      </div>
    </div>
  ),
};
