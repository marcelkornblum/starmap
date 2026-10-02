import type { Meta, StoryObj } from '@storybook/react-vite';
import { Imposter } from './Imposter';

const meta: Meta<typeof Imposter> = {
  title: 'Primitives/Layout/Imposter',
  component: Imposter,
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
type Story = StoryObj<typeof Imposter>;

export const Default: Story = {
  args: {
    fixed: false,
    position: 'center',
    margin: 'default',
    children: (
      <div style={{ padding: '16px', background: 'var(--surface-dock-bg)', border: '1px solid var(--surface-dock-border-color)' }}>
        Overlay Imposter Widget
      </div>
    ),
  },
  decorators: [
    (Story) => (
      <div style={{ position: 'relative', width: '100%', height: '300px', background: 'var(--surface-canvas-bg)', border: '1px dashed var(--border-subtle)' }}>
        <Story />
      </div>
    ),
  ],
};
