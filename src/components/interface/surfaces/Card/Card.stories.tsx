import type { Meta, StoryObj } from '@storybook/react-vite';
import { Card } from './Card';
import { Stack } from '../../layouts/Stack/Stack';
import { Cluster } from '../../layouts/Cluster/Cluster';
import storyStyles from '../surfaceStories.module.css';

const meta: Meta<typeof Card> = {
  title: 'INTERFACE/Surfaces',
  component: Card,
  parameters: {
    layout: 'centered',
  },
  argTypes: {
    status: {
      control: 'select',
      options: [undefined, 'nominal', 'caution', 'critical', 'info', 'neutral'],
    },
    interactive: { control: 'boolean' },
    padding: {
      control: 'select',
      options: ['none', 'tight', 'default', 'loose'],
    },
  },
};

export default meta;
type Story = StoryObj<typeof Card>;

export const CardStory: Story = {
  name: 'Card',
  args: {
    status: 'nominal',
    interactive: true,
    padding: 'default',
    children: 'Kepler-186f: Potentially habitable Earth-sized exoplanet orbiting within the habitable zone.',
  },
  render: (args) => (
    <div className={storyStyles.storyWrapper}>
      <header className={storyStyles.header}>
        <h1 className={storyStyles.title}>Card</h1>
        <p className={storyStyles.description}>
          Structured container surface with status exceptions, interactive hover feedback, and padding densities.
        </p>
      </header>
      <Stack gap="loose">
        <section className={storyStyles.section}>
          <h2 className={storyStyles.sectionTitle}>Interactive Preview</h2>
          <Card {...args} />
        </section>
        <section className={storyStyles.section}>
          <h2 className={storyStyles.sectionTitle}>Telemetry Statuses</h2>
          <Stack gap="dense">
            <Card status="nominal">
              <strong>Nominal:</strong> Astrometric lock confirmed.
            </Card>
            <Card status="info">
              <strong>Info:</strong> Radial velocity calibration pending.
            </Card>
            <Card status="caution">
              <strong>Caution:</strong> Gravitational microlensing perturbation.
            </Card>
            <Card status="critical">
              <strong>Critical:</strong> Periastron passage proximity breach.
            </Card>
            <Card status="neutral">
              <strong>Neutral:</strong> Uncatalogued sensor reading.
            </Card>
          </Stack>
        </section>
        <section className={storyStyles.section}>
          <h2 className={storyStyles.sectionTitle}>Padding Densities</h2>
          <Cluster gap="dense">
            <Card padding="tight">Tight</Card>
            <Card padding="default">Default</Card>
            <Card padding="loose">Loose</Card>
          </Cluster>
        </section>
      </Stack>
    </div>
  ),
};
