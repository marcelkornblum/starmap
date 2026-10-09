import type { Meta, StoryObj } from '@storybook/react-vite';
import { GlobalCanvas, type GlobalCanvasProps } from './GlobalCanvas';
import { SceneProvider } from './SceneBridge';
import styles from '../../../../.storybook/helpers/StoryCanvas.module.css';

const meta: Meta<GlobalCanvasProps> = {
  title: 'CANVAS/Viewport',
  component: GlobalCanvas,
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;
type Story = StoryObj<GlobalCanvasProps>;

export const GlobalCanvasStory: Story = {
  name: 'Global Canvas',
  render: (args) => (
    <div className={styles.canvasContainer}>
      <aside className={styles.storyBanner}>
        <h1 className={styles.storyTitle}>Global Canvas</h1>
        <p className={styles.storyDescription}>
          Application-wide singleton R3F Canvas container with camera rig, OrbitControls, and SceneBridge outlet.
        </p>
      </aside>
      <SceneProvider>
        <GlobalCanvas {...args} />
      </SceneProvider>
    </div>
  ),
};

