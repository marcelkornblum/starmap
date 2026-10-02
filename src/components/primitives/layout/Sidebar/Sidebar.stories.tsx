import type { Meta, StoryObj } from '@storybook/react-vite';
import { Sidebar } from './Sidebar';

const meta: Meta<typeof Sidebar> = {
  title: 'Primitives/Layout/Sidebar',
  component: Sidebar,
  argTypes: {
    side: {
      control: 'radio',
      options: ['start', 'end'],
    },
    sideWidth: {
      control: 'select',
      options: ['sm', 'md', 'lg'],
    },
    gap: {
      control: 'select',
      options: ['none', 'tight', 'default', 'loose'],
    },
  },
};

export default meta;
type Story = StoryObj<typeof Sidebar>;

export const Default: Story = {
  args: {
    side: 'start',
    sideWidth: 'md',
    gap: 'default',
    children: (
      <>
        <div style={{ padding: '16px', background: 'var(--surface-dock-bg)', border: '1px solid var(--surface-dock-border-color)' }}>
          Sidebar Panel
        </div>
        <div style={{ padding: '16px', background: 'var(--surface-panel-bg)', border: '1px solid var(--surface-panel-border-color)' }}>
          Main Content Area
        </div>
      </>
    ),
  },
};
