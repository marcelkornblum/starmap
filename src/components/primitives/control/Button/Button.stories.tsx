import type { Meta, StoryObj } from '@storybook/react-vite';
import { Button } from './Button';

const meta: Meta<typeof Button> = {
  title: 'Primitives/Control/Button',
  component: Button,
  argTypes: {
    variant: {
      control: 'select',
      options: ['primary', 'secondary', 'subtle', 'danger'],
    },
    size: {
      control: 'radio',
      options: ['sm', 'md', 'lg'],
    },
    disabled: { control: 'boolean' },
  },
};

export default meta;
type Story = StoryObj<typeof Button>;

export const Primary: Story = {
  args: {
    children: 'Engage Propulsion',
    variant: 'primary',
    size: 'md',
  },
};

export const Secondary: Story = {
  args: {
    children: 'Calibrate Sensors',
    variant: 'secondary',
    size: 'md',
  },
};
