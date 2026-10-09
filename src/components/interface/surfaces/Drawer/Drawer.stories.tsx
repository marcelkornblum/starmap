import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { Drawer } from './Drawer';
import { Stack } from '../../layout/Stack/Stack';
import { Cluster } from '../../layout/Cluster/Cluster';
import { Button } from '../../control/Button/Button';
import storyStyles from '../surfaceStories.module.css';

const meta: Meta<typeof Drawer> = {
  title: 'INTERFACE/Surfaces',
  component: Drawer,
  parameters: {
    layout: 'centered',
  },
  argTypes: {
    position: {
      control: 'select',
      options: ['left', 'right', 'top', 'bottom'],
    },
    isOpen: {
      control: 'boolean',
    },
    isModal: {
      control: 'boolean',
    },
  },
};

export default meta;
type Story = StoryObj<typeof Drawer>;

const DrawerDemo = () => {
  const [openRight, setOpenRight] = useState(false);
  const [openLeft, setOpenLeft] = useState(false);

  return (
    <div className={storyStyles.storyWrapper}>
      <header className={storyStyles.header}>
        <h1 className={storyStyles.title}>Drawer</h1>
        <p className={storyStyles.description}>
          Off-canvas dialog surface sliding from any viewport edge for contextual navigation and inspect panels.
        </p>
      </header>
      <Stack gap="loose">
        <section className={storyStyles.section}>
          <h2 className={storyStyles.sectionTitle}>Interactive Trigger</h2>
          <Cluster gap="dense">
            <Button variant="primary" onClick={() => setOpenRight(true)}>
              Open Right Drawer
            </Button>
            <Button variant="default" onClick={() => setOpenLeft(true)}>
              Open Left Drawer
            </Button>
          </Cluster>

          <Drawer
            isOpen={openRight}
            onClose={() => setOpenRight(false)}
            position="right"
            title="Telemetry Diagnostics"
          >
            <Stack gap="default">
              <p>Sublight engine manifold pressure: 98.4 kPa.</p>
              <p>Inertial dampener synchronization: nominal.</p>
              <Button size="sm" variant="subtle" onClick={() => setOpenRight(false)}>
                Close Panel
              </Button>
            </Stack>
          </Drawer>

          <Drawer
            isOpen={openLeft}
            onClose={() => setOpenLeft(false)}
            position="left"
            title="Cartography Filters"
          >
            <Stack gap="default">
              <p>Filter by stellar class (O, B, A, F, G, K, M).</p>
              <p>Exclude unconfirmed candidates.</p>
              <Button size="sm" variant="subtle" onClick={() => setOpenLeft(false)}>
                Close Panel
              </Button>
            </Stack>
          </Drawer>
        </section>
      </Stack>
    </div>
  );
};

export const DrawerStory: Story = {
  name: 'Drawer',
  render: () => <DrawerDemo />,
};
