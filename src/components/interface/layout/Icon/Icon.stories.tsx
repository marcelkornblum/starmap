import type { Meta, StoryObj } from '@storybook/react-vite';
import { Icon } from './Icon';

const meta: Meta<typeof Icon> = {
  title: 'INTERFACE/Layout',
  component: Icon,
  argTypes: {
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg', 'xl'],
    },
  },
};

export default meta;
type Story = StoryObj<typeof Icon>;

export const Default: Story = {
  name: 'Icon',
  args: {
    size: 'md',
    children: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
    ),
  },
};
