import type { Meta, StoryObj } from '@storybook/react-vite';
import { Badge } from './Badge';

const meta: Meta<typeof Badge> = {
  title: 'Primitives/Data/Badge',
  component: Badge,
  argTypes: {
    status: {
      control: 'select',
      options: [undefined, 'nominal', 'caution', 'critical', 'info'],
    },
    confidence: {
      control: 'select',
      options: [undefined, 'confirmed', 'candidate', 'projected', 'unverified'],
    },
    category: {
      control: 'select',
      options: [undefined, 'star', 'planet', 'nebula', 'constellation'],
    },
  },
};

export default meta;
type Story = StoryObj<typeof Badge>;

export const Default: Story = {
  args: {
    children: 'G-Type Main Sequence',
    category: 'star',
  },
};
