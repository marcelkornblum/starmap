import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { Modal } from './Modal';
import { Button, Cluster } from '../../primitives';

const meta: Meta<typeof Modal> = {
  title: 'POC/Overlays/Modal',
  component: Modal,
};

export default meta;
type Story = StoryObj<typeof Modal>;

const ModalDemo = () => {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <Button variant="primary" onClick={() => setOpen(true)}>
        Open Astrometric Calibration
      </Button>
      <Modal
        isOpen={open}
        onClose={() => setOpen(false)}
        title="Astrometric Calibration Dialog"
      >
        <p>Confirm sensor baseline calibration against ICRF3 quasar grid.</p>
        <Cluster justify="end" gap="tight">
          <Button variant="subtle" onClick={() => setOpen(false)}>Cancel</Button>
          <Button variant="primary" onClick={() => setOpen(false)}>Confirm</Button>
        </Cluster>
      </Modal>
    </div>
  );
};

export const Default: Story = {
  render: () => <ModalDemo />,
};
