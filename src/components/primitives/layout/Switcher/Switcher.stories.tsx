import type { Meta, StoryObj } from '@storybook/react-vite';
import { Switcher } from './Switcher';

const meta: Meta<typeof Switcher> = {
  title: 'Primitives/Layout/Switcher',
  component: Switcher,
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
type Story = StoryObj<typeof Switcher>;

export const Default: Story = {
  args: {
    threshold: 'md',
    gap: 'default',
    children: (
      <>
        <div style={{ padding: '16px', background: 'var(--surface-panel-bg)', border: '1px solid var(--surface-panel-border-color)' }}>
          Switcher Item 1
        </div>
        <div style={{ padding: '16px', background: 'var(--surface-panel-bg)', border: '1px solid var(--surface-panel-border-color)' }}>
          Switcher Item 2
        </div>
        <div style={{ padding: '16px', background: 'var(--surface-panel-bg)', border: '1px solid var(--surface-panel-border-color)' }}>
          Switcher Item 3
        </div>
      </>
    ),
  },
};
