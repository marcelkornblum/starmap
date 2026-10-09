import type { Meta, StoryObj } from '@storybook/react-vite';
import { Dock } from './Dock';
import { Stack } from '../../layouts/Stack/Stack';
import { Cluster } from '../../layouts/Cluster/Cluster';
import { Button } from '../../controls/Button/Button';
import storyStyles from '../surfaceStories.module.css';

const meta: Meta<typeof Dock> = {
  title: 'INTERFACE/Surfaces',
  component: Dock,
  parameters: {
    layout: 'centered',
  },
  argTypes: {
    position: {
      control: 'select',
      options: ['floating', 'top', 'bottom', 'left', 'right'],
    },
    padded: {
      control: 'boolean',
    },
  },
};

export default meta;
type Story = StoryObj<typeof Dock>;

export const DockStory: Story = {
  name: 'Dock',
  args: {
    position: 'floating',
    padded: true,
  },
  render: (args) => (
    <div className={storyStyles.storyWrapper}>
      <header className={storyStyles.header}>
        <h1 className={storyStyles.title}>Dock</h1>
        <p className={storyStyles.description}>
          Anchored control chassis surface supporting viewport-edge docking and floating toolbars.
        </p>
      </header>
      <Stack gap="loose">
        <section className={storyStyles.section}>
          <h2 className={storyStyles.sectionTitle}>Interactive Preview</h2>
          <div className={storyStyles.previewContainer}>
            <Dock {...args}>
              <Cluster gap="tight" align="center">
                <Button size="sm" variant="primary">Galaxy View</Button>
                <Button size="sm" variant="default">System View</Button>
                <Button size="sm" variant="subtle">Planet View</Button>
              </Cluster>
            </Dock>
          </div>
        </section>
        <section className={storyStyles.section}>
          <h2 className={storyStyles.sectionTitle}>Floating Dock</h2>
          <Dock position="floating">
            <Cluster gap="dense" align="center">
              <span>✦ NAVIGATION CHASSIS</span>
              <Button size="sm" variant="subtle">Reset View</Button>
              <Button size="sm" variant="default">Lock Target</Button>
            </Cluster>
          </Dock>
        </section>
      </Stack>
    </div>
  ),
};
