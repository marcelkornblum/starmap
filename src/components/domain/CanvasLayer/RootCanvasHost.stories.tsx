import type { Meta, StoryObj } from '@storybook/react-vite';
import { RootCanvasHost } from './RootCanvasHost';

const meta: Meta<typeof RootCanvasHost> = {
  title: 'Domain/RootCanvasHost',
  component: RootCanvasHost,
};

export default meta;
type Story = StoryObj<typeof RootCanvasHost>;

export const Default: Story = {};
