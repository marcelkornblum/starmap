import type { Meta, StoryObj } from '@storybook/react-vite';
import { Tooltip } from './Tooltip';
import { Stack } from '../../layouts/Stack/Stack';
import { Cluster } from '../../layouts/Cluster/Cluster';
import { Button } from '../../controls/Button/Button';
import storyStyles from '../surfaceStories.module.css';

const meta: Meta<typeof Tooltip> = {
  title: 'INTERFACE/Surfaces',
  component: Tooltip,
  parameters: {
    layout: 'centered',
  },
  argTypes: {
    position: {
      control: 'select',
      options: ['top', 'bottom', 'left', 'right'],
    },
  },
};

export default meta;
type Story = StoryObj<typeof Tooltip>;

export const TooltipStory: Story = {
  name: 'Tooltip',
  args: {
    text: 'Right Ascension: 14h 29m 42.95s',
    position: 'top',
  },
  render: (args) => (
    <div className={storyStyles.storyWrapper}>
      <header className={storyStyles.header}>
        <h1 className={storyStyles.title}>Tooltip</h1>
        <p className={storyStyles.description}>
          Lightweight floating label triggered on hover or focus for supplemental descriptions and shortcuts.
        </p>
      </header>
      <Stack gap="loose">
        <section className={storyStyles.section}>
          <h2 className={storyStyles.sectionTitle}>Interactive Preview</h2>
          <Cluster gap="default">
            <Tooltip {...args}>
              <Button variant="default">Hover or Focus for Coordinates</Button>
            </Tooltip>
          </Cluster>
        </section>
        <section className={storyStyles.section}>
          <h2 className={storyStyles.sectionTitle}>Directional Placements</h2>
          <Cluster gap="default">
            <Tooltip text="Tooltip placed on top" position="top">
              <Button size="sm" variant="subtle">Top</Button>
            </Tooltip>
            <Tooltip text="Tooltip placed on bottom" position="bottom">
              <Button size="sm" variant="subtle">Bottom</Button>
            </Tooltip>
            <Tooltip text="Tooltip placed on left" position="left">
              <Button size="sm" variant="subtle">Left</Button>
            </Tooltip>
            <Tooltip text="Tooltip placed on right" position="right">
              <Button size="sm" variant="subtle">Right</Button>
            </Tooltip>
          </Cluster>
        </section>
        <section className={storyStyles.section}>
          <h2 className={storyStyles.sectionTitle}>Screen Edge Clamping & Auto-Flipping</h2>
          <p className={storyStyles.description}>
            Tooltips automatically clamp to maintain a 12px margin from viewport edges and flip axes when clipped.
          </p>
          <Cluster justify="between" gap="loose">
            <Tooltip text="Clamped to viewport left edge" position="top">
              <Button size="sm" variant="subtle">Far Left Edge</Button>
            </Tooltip>
            <Tooltip text="Auto-flipped from bottom if near screen bottom" position="bottom">
              <Button size="sm" variant="subtle">Viewport Center</Button>
            </Tooltip>
            <Tooltip text="Clamped to viewport right edge" position="top">
              <Button size="sm" variant="subtle">Far Right Edge</Button>
            </Tooltip>
          </Cluster>
        </section>
      </Stack>
    </div>
  ),
};
