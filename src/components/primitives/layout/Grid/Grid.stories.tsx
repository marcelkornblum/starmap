import type { Meta, StoryObj } from '@storybook/react-vite';
import { Grid } from './Grid';

const meta: Meta<typeof Grid> = {
  title: 'Primitives/Layout/Grid',
  component: Grid,
  argTypes: {
    minWidth: {
      control: 'select',
      options: ['xs', 'sm', 'md', 'lg', 'xl'],
    },
    gap: {
      control: 'select',
      options: ['none', 'tight', 'default', 'loose'],
    },
  },
};

export default meta;
type Story = StoryObj<typeof Grid>;

export const Default: Story = {
  args: {
    minWidth: 'md',
    gap: 'default',
    children: (
      <>
        <div style={{ padding: '16px', background: 'var(--surface-panel-bg)', border: '1px solid var(--surface-panel-border-color)' }}>Tile 1</div>
        <div style={{ padding: '16px', background: 'var(--surface-panel-bg)', border: '1px solid var(--surface-panel-border-color)' }}>Tile 2</div>
        <div style={{ padding: '16px', background: 'var(--surface-panel-bg)', border: '1px solid var(--surface-panel-border-color)' }}>Tile 3</div>
        <div style={{ padding: '16px', background: 'var(--surface-panel-bg)', border: '1px solid var(--surface-panel-border-color)' }}>Tile 4</div>
      </>
    ),
  },
};
