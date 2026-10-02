import type { Meta, StoryObj } from '@storybook/react-vite';
import { Center } from './Center';

const meta: Meta<typeof Center> = {
  title: 'Primitives/Layout/Center',
  component: Center,
  argTypes: {
    max: {
      control: 'select',
      options: ['xs', 'sm', 'md', 'lg', 'xl', 'full'],
    },
    andText: { control: 'boolean' },
    gutter: {
      control: 'select',
      options: ['none', 'tight', 'default', 'loose'],
    },
  },
};

export default meta;
type Story = StoryObj<typeof Center>;

export const Default: Story = {
  args: {
    max: 'md',
    andText: false,
    children: (
      <div style={{ padding: '24px', background: 'var(--surface-panel-bg)', border: '1px solid var(--surface-panel-border-color)' }}>
        Centred content container restricted to 60ch with fluid guttering.
      </div>
    ),
  },
};
