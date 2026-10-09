import type { Meta, StoryObj } from '@storybook/react-vite';
import { Toast } from './Toast';
import { Stack } from '../../layout/Stack/Stack';
import storyStyles from '../surfaceStories.module.css';

const meta: Meta<typeof Toast> = {
  title: 'INTERFACE/Surfaces',
  component: Toast,
  parameters: {
    layout: 'centered',
  },
  argTypes: {
    status: {
      control: 'select',
      options: ['nominal', 'caution', 'critical', 'info', 'neutral'],
    },
  },
};

export default meta;
type Story = StoryObj<typeof Toast>;

export const ToastStory: Story = {
  name: 'Toast',
  args: {
    title: 'Ephemeris Synchronised',
    message: 'J2000 barycentric coordinates updated successfully.',
    status: 'nominal',
  },
  render: (args) => (
    <div className={storyStyles.storyWrapper}>
      <header className={storyStyles.header}>
        <h1 className={storyStyles.title}>Toast</h1>
        <p className={storyStyles.description}>
          Ephemeral notification toast banner with telemetry status variants and dismiss actions.
        </p>
      </header>
      <Stack gap="loose">
        <section className={storyStyles.section}>
          <h2 className={storyStyles.sectionTitle}>Interactive Preview</h2>
          <Toast {...args} onClose={() => {}} />
        </section>
        <section className={storyStyles.section}>
          <h2 className={storyStyles.sectionTitle}>Telemetry Status Variants</h2>
          <Stack gap="dense">
            <Toast
              title="Calibration Complete"
              message="All astrometric sensors locked on target."
              status="nominal"
              onClose={() => {}}
            />
            <Toast
              title="Background Sync"
              message="Fetching Gaia DR3 stellar updates."
              status="info"
              onClose={() => {}}
            />
            <Toast
              title="Tracking Perturbation"
              message="Parallax error exceeds 0.05 mas threshold."
              status="caution"
              onClose={() => {}}
            />
            <Toast
              title="Collision Warning"
              message="Orbital intersection detected in quadrant 4."
              status="critical"
              onClose={() => {}}
            />
            <Toast
              title="Telemetry Standby"
              message="Sublight drive idle."
              status="neutral"
              onClose={() => {}}
            />
          </Stack>
        </section>
      </Stack>
    </div>
  ),
};
