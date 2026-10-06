import type { Meta, StoryObj } from '@storybook/react-vite';
import { Metric } from './Metric';
import styles from './Metric.stories.module.css';

const meta: Meta<typeof Metric> = {
  title: 'Primitives/Data/Metric',
  component: Metric,
  parameters: {
    layout: 'centered',
  },
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

export const Statuses: Story = {
  render: () => (
    <div className={styles.gridContainer}>
      <Metric
        label="Orbital Velocity"
        value="29.78"
        unit="km/s"
        trend="Nominal flight path"
        status="nominal"
      />
      <Metric
        label="Sensor Noise"
        value="0.14"
        unit="mJy"
        trend="Calibrating detectors"
        status="info"
      />
      <Metric
        label="Surface Temp"
        value="742"
        unit="K"
        trend="+14 K thermal peak"
        status="caution"
      />
      <Metric
        label="Radiation Flux"
        value="1,420"
        unit="W/m²"
        trend="Exceeds safe limits"
        status="critical"
      />
    </div>
  ),
};

export const WithoutTrend: Story = {
  render: () => (
    <div className={styles.gridContainer}>
      <Metric label="Semi-Major Axis" value="1.000" unit="AU" />
      <Metric label="Orbital Period" value="365.25" unit="d" />
    </div>
  ),
};
