import type { Meta, StoryObj } from '@storybook/react-vite';
import { Metric } from './Metric';

const meta: Meta<typeof Metric> = {
  title: 'Primitives/Data/Metric',
  component: Metric,
  argTypes: {
    status: {
      control: 'select',
      options: [undefined, 'nominal', 'caution', 'critical', 'info'],
    },
  },
};

export default meta;
type Story = StoryObj<typeof Metric>;

export const Default: Story = {
  args: {
    label: 'Orbital Velocity',
    value: '29.78',
    unit: 'km/s',
    trend: '+0.02 km/s at perihelion',
    status: 'nominal',
  },
};
