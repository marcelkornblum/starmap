import type { Meta, StoryObj } from '@storybook/react-vite';
import { InteractiveNavigator } from './SpatialScenes';
import styles from '../StoryCanvas.module.css';

const meta: Meta<typeof InteractiveNavigator> = {
  title: 'CANVAS/Scenes',
  component: InteractiveNavigator,
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;
type Story = StoryObj<typeof InteractiveNavigator>;

export const SpatialScenesStory: Story = {
  name: 'Multi-Scale Interactive Navigator',
  render: () => (
    <div className={styles.canvasContainer}>
      <aside className={styles.storyBanner}>
        <h1 className={styles.storyTitle}>Multi-Scale Interactive Navigator</h1>
        <p className={styles.storyDescription}>
          Cross-scale navigation orchestrator. Click a stellar system or planet to zoom in; press Escape to zoom back out.
        </p>
      </aside>
      <InteractiveNavigator />
    </div>
  ),
};

