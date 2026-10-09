import type { Meta, StoryObj } from '@storybook/react-vite';
import { Quantity } from './Quantity';
import { Stack } from '../../layouts/Stack/Stack';
import { Cluster } from '../../layouts/Cluster/Cluster';

import storyStyles from '../dataStories.module.css';

const meta = {
  title: 'INTERFACE/Data',
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

export const QuantityStory: Story = {
  name: 'Quantity',
  render: (args) => (
    <div className={storyStyles.storyWrapper}>
      <header className={storyStyles.header}>
        <h1 className={storyStyles.title}>Quantity</h1>
        <p className={storyStyles.description}>
          Formatted numeric magnitude coupled to its astronomical unit with wrapping protection.
        </p>
      </header>
      <Stack gap="loose">
        <section className={storyStyles.section}>
          <h2 className={storyStyles.sectionTitle}>Interactive Preview</h2>
          <div>
            <Quantity {...args} />
          </div>
        </section>
        <section className={storyStyles.section}>
          <h2 className={storyStyles.sectionTitle}>Angular Degrees (Automatic noGap)</h2>
          <div>
            <Quantity value="45.2" unit="°" />
          </div>
        </section>
        <section className={storyStyles.section}>
          <h2 className={storyStyles.sectionTitle}>Astronomical Measurements</h2>
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
          </Stack>
        </section>
      </Stack>
    </div>
  ),
};
