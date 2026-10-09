import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { Modal } from './Modal';
import { Stack } from '../../layout/Stack/Stack';
import { Cluster } from '../../layout/Cluster/Cluster';
import { Button } from '../../control/Button/Button';
import storyStyles from '../surfaceStories.module.css';

const meta: Meta<typeof Modal> = {
  title: 'INTERFACE/Surfaces',
  component: Modal,
  parameters: {
    layout: 'centered',
  },
};

export default meta;
type Story = StoryObj<typeof Modal>;

const ModalDemo = () => {
  const [open, setOpen] = useState(false);

  return (
    <div className={storyStyles.storyWrapper}>
      <header className={storyStyles.header}>
        <h1 className={storyStyles.title}>Modal</h1>
        <p className={storyStyles.description}>
          Centered modal dialog surface with backdrop scrim and focus trapping for critical confirmations.
        </p>
      </header>
      <Stack gap="loose">
        <section className={storyStyles.section}>
          <h2 className={storyStyles.sectionTitle}>Interactive Trigger</h2>
          <div>
            <Button variant="primary" onClick={() => setOpen(true)}>
              Open Astrometric Calibration
            </Button>
          </div>
          <Modal
            isOpen={open}
            onClose={() => setOpen(false)}
            title="Astrometric Calibration Dialog"
          >
            <Stack gap="default">
              <p>Confirm sensor baseline calibration against ICRF3 quasar grid.</p>
              <Cluster justify="end" gap="tight">
                <Button variant="subtle" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button variant="primary" onClick={() => setOpen(false)}>
                  Confirm Calibration
                </Button>
              </Cluster>
            </Stack>
          </Modal>
        </section>
      </Stack>
    </div>
  );
};

export const ModalStory: Story = {
  name: 'Modal',
  render: () => <ModalDemo />,
};
