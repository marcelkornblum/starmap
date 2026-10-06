import type { Meta, StoryObj } from '@storybook/react-vite';
import { Datum } from './Datum';
import { Stack } from '../../layout/Stack/Stack';
import { Card } from '../../../surfaces/Card/Card';
import styles from './Datum.stories.module.css';

const meta: Meta<typeof Datum> = {
  title: 'POC/Primitives/Data/Datum',
  component: Datum,
  parameters: {
    layout: 'centered',
  },
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

export const Statuses: Story = {
  render: () => (
    <div className={styles.listContainer}>
      <Stack gap="dense">
        <Datum label="Tracking Lock" value="99.98" unit="%" status="nominal" />
        <Datum label="Ephemeris Calibration" value="Refining" status="info" />
        <Datum label="Orbital Drift" value="+0.042" unit="AU" status="caution" />
        <Datum label="Signal Loss" value="Lost" status="critical" />
      </Stack>
    </div>
  ),
};

export const Sizes: Story = {
  render: () => (
    <div className={styles.listContainer}>
      <Stack gap="default">
        <div>
          <h4>Standard (md)</h4>
          <Datum label="Semi-Major Axis" value="1.000" unit="AU" size="md" />
          <Datum label="Eccentricity" value="0.0167" size="md" />
          <Datum label="Inclination" value="0.00" unit="°" size="md" />
        </div>
        <div>
          <h4>Compact (sm)</h4>
          <Datum label="Semi-Major Axis" value="1.000" unit="AU" size="sm" />
          <Datum label="Eccentricity" value="0.0167" size="sm" />
          <Datum label="Inclination" value="0.00" unit="°" size="sm" />
        </div>
      </Stack>
    </div>
  ),
};

export const TelemetryCard: Story = {
  render: () => (
    <div className={styles.listContainer}>
      <Card padding="default">
        <Stack gap="dense">
          <Datum label="Distance" value="4.2465" unit="ly" />
          <Datum label="Radial Velocity" value="-22.2" unit="km/s" status="nominal" />
          <Datum label="Proper Motion RA" value="-3781.74" unit="mas/yr" />
          <Datum label="Proper Motion Dec" value="769.46" unit="mas/yr" />
          <Datum label="Parallax" value="768.87" unit="mas" />
          <Datum label="Apparent Magnitude" value="11.05" unit="mag" />
        </Stack>
      </Card>
    </div>
  ),
};
