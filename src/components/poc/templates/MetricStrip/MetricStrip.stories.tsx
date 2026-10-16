import type { Meta, StoryObj } from '@storybook/react-vite';
import { MetricStrip } from './MetricStrip';
import { Metric } from '../../primitives';

const meta: Meta<typeof MetricStrip> = {
  title: 'POC/Templates/MetricStrip',
  component: MetricStrip,
};

export default meta;
type Story = StoryObj<typeof MetricStrip>;

export const Default: Story = {
  render: () => (
    <MetricStrip minWidth="sm">
      <Metric label="Apparent Magnitude" value="+0.03" />
      <Metric label="Parallax" value="768.87" unit="mas" />
      <Metric label="Distance" value="4.246" unit="ly" />
      <Metric label="Radial Velocity" value="-22.2" unit="km/s" />
    </MetricStrip>
  ),
};
