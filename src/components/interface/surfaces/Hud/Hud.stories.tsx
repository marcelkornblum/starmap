import type { Meta, StoryObj } from '@storybook/react-vite';
import { Hud } from './Hud';
import { Stack } from '../../layouts/Stack/Stack';
import { Cluster } from '../../layouts/Cluster/Cluster';
import { Badge } from '../../data/Badge/Badge';
import { Button } from '../../controls/Button/Button';
import storyStyles from '../surfaceStories.module.css';

const meta: Meta<typeof Hud> = {
  title: 'INTERFACE/Surfaces',
  component: Hud,
  parameters: {
    layout: 'centered',
  },
  argTypes: {
    position: {
      control: 'select',
      options: ['static', 'top', 'bottom', 'floating'],
    },
    padded: {
      control: 'boolean',
    },
  },
};

export default meta;
type Story = StoryObj<typeof Hud>;

export const HudStory: Story = {
  name: 'Hud',
  args: {
    position: 'static',
    padded: true,
  },
  render: (args) => (
    <div className={storyStyles.storyWrapper}>
      <header className={storyStyles.header}>
        <h1 className={storyStyles.title}>Hud</h1>
        <p className={storyStyles.description}>
          High-priority heads-up display banner surface for telemetry streams and global status monitoring.
        </p>
      </header>
      <Stack gap="loose">
        <section className={storyStyles.section}>
          <h2 className={storyStyles.sectionTitle}>Interactive Preview</h2>
          <Hud {...args}>
            <Cluster justify="between" align="center">
              <Cluster gap="dense" align="center">
                <strong>✦ STARMAP // HUD</strong>
                <Badge status="nominal">ONLINE</Badge>
              </Cluster>
              <span>RA: 18h 36m 56s | Dec: +38° 47′ 01″</span>
              <Cluster gap="dense">
                <Button size="sm" variant="subtle">GRID</Button>
                <Button size="sm" variant="default">RESET</Button>
              </Cluster>
            </Cluster>
          </Hud>
        </section>
        <section className={storyStyles.section}>
          <h2 className={storyStyles.sectionTitle}>Floating Overlay HUD</h2>
          <div className={storyStyles.previewContainer}>
            <Hud position="floating">
              <Cluster justify="between" align="center">
                <span>SIMULATION EPOCH: J2000.0</span>
                <Badge status="info">100x TIME-WARP</Badge>
              </Cluster>
            </Hud>
          </div>
        </section>
      </Stack>
    </div>
  ),
};
