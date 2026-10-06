import type { Meta, StoryObj } from '@storybook/react-vite';
import { Input } from './Input';

const meta: Meta<typeof Input> = {
  title: 'Primitives/Control/Input',
  component: Input,
  argTypes: {
    status: {
      control: 'select',
      options: [undefined, 'error', 'success'],
    },
    sizeVariant: {
      control: 'radio',
      options: ['sm', 'md'],
    },
    tabular: { control: 'boolean' },
  },
};

export default meta;
type Story = StoryObj<typeof Input>;

export const Default: Story = {
  args: {
    placeholder: 'Enter Celestial Target or RA/Dec...',
    sizeVariant: 'md',
    tabular: true,
  },
};
