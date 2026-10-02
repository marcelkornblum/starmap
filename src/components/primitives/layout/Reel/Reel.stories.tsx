import type { Meta, StoryObj } from '@storybook/react-vite';
import { Reel } from './Reel';

const meta: Meta<typeof Reel> = {
  title: 'Primitives/Layout/Reel',
  component: Reel,
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
type Story = StoryObj<typeof Reel>;

export const Default: Story = {
  args: {
    itemWidth: 'md',
    gap: 'default',
    snap: true,
    children: (
      <>
        <div style={{ padding: '24px', background: 'var(--surface-panel-bg)', border: '1px solid var(--surface-panel-border-color)' }}>Reel Item 1</div>
        <div style={{ padding: '24px', background: 'var(--surface-panel-bg)', border: '1px solid var(--surface-panel-border-color)' }}>Reel Item 2</div>
        <div style={{ padding: '24px', background: 'var(--surface-panel-bg)', border: '1px solid var(--surface-panel-border-color)' }}>Reel Item 3</div>
        <div style={{ padding: '24px', background: 'var(--surface-panel-bg)', border: '1px solid var(--surface-panel-border-color)' }}>Reel Item 4</div>
        <div style={{ padding: '24px', background: 'var(--surface-panel-bg)', border: '1px solid var(--surface-panel-border-color)' }}>Reel Item 5</div>
      </>
    ),
  },
};
