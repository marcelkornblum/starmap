import type { Meta, StoryObj } from '@storybook/react-vite';
import { Datum } from './Datum';

const meta: Meta<typeof Datum> = {
  title: 'Primitives/Data/Datum',
  component: Datum,
  argTypes: {
    status: {
      control: 'select',
      options: [undefined, 'nominal', 'caution', 'critical', 'info'],
    },
    size: {
      control: 'radio',
      options: ['sm', 'md'],
    },
  },
};

export default meta;
type Story = StoryObj<typeof Datum>;

export const Default: Story = {
  args: {
    label: 'Stellar Mass',
    value: '1.042',
    unit: 'M☉',
    status: 'nominal',
  },
};
