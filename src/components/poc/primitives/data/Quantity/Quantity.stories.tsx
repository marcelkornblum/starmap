import type { Meta, StoryObj } from '@storybook/react';
import { Quantity } from './Quantity';
import { Stack } from '../../layout/Stack/Stack';
import { Cluster } from '../../layout/Cluster/Cluster';
import styles from './Quantity.stories.module.css';

const meta = {
  title: 'Primitives/Data/Quantity',
  component: Quantity,
  parameters: {
    layout: 'centered',
  },
  argTypes: {
    value: {
      control: 'text',
      description: 'The numeric or textual value',
    },
    unit: {
      control: 'text',
      description: 'The unit symbol or string',
    },
    noGap: {
      control: 'boolean',
      description: 'Whether to omit the gap between value and unit',
    },
  },
  args: {
    value: '1.000',
    unit: 'AU',
    noGap: false,
  },
} satisfies Meta<typeof Quantity>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    value: '1.000',
    unit: 'AU',
  },
};

export const AngularDegreesWithoutGap: Story = {
  args: {
    value: '45.2',
    unit: '°',
  },
};

export const InNarrowContainer: Story = {
  parameters: {
    docs: {
      description: {
        story:
          'Demonstrates that when space is severely constrained (width: 80px), the unit NEVER wraps separately onto a line below the number.',
      },
    },
  },
  render: () => (
    <div className={styles.narrowContainer}>
      <Stack gap="tight">
        <span className={styles.caption}>
          Constrained Column:
        </span>
        <Quantity value="149,597,870.7" unit="km" />
        <Quantity value="299,792.458" unit="km/s" />
        <Quantity value="4.246" unit="ly" />
      </Stack>
    </div>
  ),
};

export const InTableHeadingsWithoutBrackets: Story = {
  render: () => (
    <Cluster gap="loose" align="baseline">
      <div>
        <span className={styles.headingWrapper}>
          <Quantity value="Semi-Major Axis" unit="AU" />
        </span>
      </div>
      <div>
        <span className={styles.headingWrapper}>
          <Quantity value="Period" unit="d" />
        </span>
      </div>
      <div>
        <span className={styles.headingWrapper}>
          <Quantity value="Inclination" unit="°" />
        </span>
      </div>
    </Cluster>
  ),
};

export const AstronomicalMeasurements: Story = {
  render: () => (
    <Stack gap="dense">
      <Cluster gap="dense" align="baseline">
        <span>Stellar Distance:</span>
        <Quantity value="8.12" unit="kpc" />
      </Cluster>
      <Cluster gap="dense" align="baseline">
        <span>Radial Velocity:</span>
        <Quantity value="-220.4" unit="km/s" />
      </Cluster>
      <Cluster gap="dense" align="baseline">
        <span>Stellar Mass:</span>
        <Quantity value="1.04" unit="M☉" />
      </Cluster>
      <Cluster gap="dense" align="baseline">
        <span>Exoplanet Radius:</span>
        <Quantity value="1.17" unit="R⊕" />
      </Cluster>
      <Cluster gap="dense" align="baseline">
        <span>Position Angle:</span>
        <Quantity value="137.5" unit="°" />
      </Cluster>
    </Stack>
  ),
};
