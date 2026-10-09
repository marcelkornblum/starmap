import type { Meta, StoryObj } from '@storybook/react-vite';
import { Datum } from './Datum';
import { Stack } from '../../layouts/Stack/Stack';
import { Box } from '../../layouts/Box/Box';

import storyStyles from '../informationStories.module.css';

const meta: Meta<typeof Datum> = {
  title: 'INTERFACE/Information',
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

export const DatumStory: Story = {
  name: 'Datum',
  args: {
    label: 'Stellar Mass',
    value: '1.042',
    unit: 'M☉',
    status: 'nominal',
  },
  render: (args) => (
    <div className={storyStyles.storyWrapper}>
      <header className={storyStyles.header}>
        <h1 className={storyStyles.title}>Datum</h1>
        <p className={storyStyles.description}>
          Key-value telemetry pair displaying a label alongside a formatted measurement.
        </p>
      </header>
      <Stack gap="loose">
        <section className={storyStyles.section}>
          <h2 className={storyStyles.sectionTitle}>Interactive Preview</h2>
          <div>
            <Datum {...args} />
          </div>
        </section>
        <section className={storyStyles.section}>
          <h2 className={storyStyles.sectionTitle}>Statuses</h2>
          <Stack gap="dense">
            <Datum label="Tracking Lock" value="99.98" unit="%" status="nominal" />
            <Datum label="Ephemeris Calibration" value="Refining" status="info" />
            <Datum label="Orbital Drift" value="+0.042" unit="AU" status="caution" />
            <Datum label="Signal Loss" value="Lost" status="critical" />
          </Stack>
        </section>
        <section className={storyStyles.section}>
          <h2 className={storyStyles.sectionTitle}>Sizes</h2>
          <Stack gap="default">
            <div>
              <h3 className={storyStyles.subSectionTitle}>Standard (md)</h3>
              <Datum label="Semi-Major Axis" value="1.000" unit="AU" size="md" />
              <Datum label="Eccentricity" value="0.0167" size="md" />
            </div>
            <div>
              <h3 className={storyStyles.subSectionTitle}>Compact (sm)</h3>
              <Datum label="Semi-Major Axis" value="1.000" unit="AU" size="sm" />
              <Datum label="Eccentricity" value="0.0167" size="sm" />
            </div>
          </Stack>
        </section>
        <section className={storyStyles.section}>
          <h2 className={storyStyles.sectionTitle}>Telemetry Group</h2>
          <Box padding="default">
            <Stack gap="dense">
              <Datum label="Distance" value="4.2465" unit="ly" />
              <Datum label="Radial Velocity" value="-22.2" unit="km/s" status="nominal" />
              <Datum label="Parallax" value="768.87" unit="mas" />
            </Stack>
          </Box>
        </section>
      </Stack>
    </div>
  ),
};
