import type { Meta, StoryObj } from '@storybook/react-vite';
import { Panel } from './Panel';
import { Stack } from '../../layouts/Stack/Stack';
import { Cluster } from '../../layouts/Cluster/Cluster';
import storyStyles from '../surfaceStories.module.css';

const meta: Meta<typeof Panel> = {
  title: 'INTERFACE/Surfaces',
  component: Panel,
  parameters: {
    layout: 'centered',
  },
  argTypes: {
    status: {
      control: 'select',
      options: [undefined, 'nominal', 'caution', 'critical', 'info', 'neutral'],
    },
    padding: {
      control: 'select',
      options: ['none', 'tight', 'default', 'loose'],
    },
  },
};

export default meta;
type Story = StoryObj<typeof Panel>;

export const PanelStory: Story = {
  name: 'Panel',
  args: {
    header: 'Orion Sector Navigation',
    footer: 'Ready for astrometric synchronization',
    padding: 'default',
    status: 'nominal',
    children: 'Telemetry stream synchronized with Gaia DR3 star catalog. 12 candidate exoplanets detected.',
  },
  render: (args) => (
    <div className={storyStyles.storyWrapper}>
      <header className={storyStyles.header}>
        <h1 className={storyStyles.title}>Panel</h1>
        <p className={storyStyles.description}>
          Segmented container surface with dedicated header, scrollable body, and action footer slots.
        </p>
      </header>
      <Stack gap="loose">
        <section className={storyStyles.section}>
          <h2 className={storyStyles.sectionTitle}>Interactive Preview</h2>
          <Panel {...args} />
        </section>
        <section className={storyStyles.section}>
          <h2 className={storyStyles.sectionTitle}>Telemetry Status Variants</h2>
          <Stack gap="dense">
            <Panel header="Nominal Status" status="nominal">
              All sublight thrusters firing within normal thermal limits.
            </Panel>
            <Panel header="Caution Status" status="caution">
              Astrometric parallax variance exceeds threshold (sigma &gt; 2.5).
            </Panel>
            <Panel header="Critical Status" status="critical">
              Attitude control lost: inertial dampeners offline.
            </Panel>
          </Stack>
        </section>
        <section className={storyStyles.section}>
          <h2 className={storyStyles.sectionTitle}>Padding Densities</h2>
          <Cluster gap="dense">
            <Panel padding="tight" header="Tight">Compact data view</Panel>
            <Panel padding="loose" header="Loose">Spacious layout view</Panel>
          </Cluster>
        </section>
      </Stack>
    </div>
  ),
};
