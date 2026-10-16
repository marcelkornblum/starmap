import type { Meta, StoryObj } from '@storybook/react-vite';
import { Toast } from './Toast';

const meta: Meta<typeof Toast> = {
  title: 'POC/Overlays/Toast',
  component: Toast,
  argTypes: {
    status: {
      control: 'select',
      options: ['nominal', 'caution', 'critical', 'info'],
    },
  },
};

export default meta;
type Story = StoryObj<typeof Toast>;

export const Default: Story = {
  args: {
    title: 'Ephemeris Synchronised',
    message: 'J2000 barycentric coordinates updated successfully.',
    status: 'nominal',
  },
};

export const CriticalAlert: Story = {
  args: {
    title: 'Keplerian Anomaly Detected',
    message: 'Eccentricity exceeds stability threshold e > 0.85.',
    status: 'critical',
  },
};
