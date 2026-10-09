import type { Meta, StoryObj } from '@storybook/react-vite';
import { StoryCanvas } from '../../../../.storybook/helpers/StoryCanvas';
import { KinematicVector } from './KinematicVector';
import { SpatialFrameProvider, SYSTEM_FRAME } from '../instrument';

const meta: Meta<typeof KinematicVector> = {
  title: 'CANVAS/Entities',
  component: KinematicVector,
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;
type Story = StoryObj<typeof KinematicVector>;

export const KinematicVectorStory: Story = {
  name: 'KinematicVector',
  args: {
    id: 'vector-demo',
    position: [0, 0, 0],
    velocity: [6, 4, 2],
    deltaTime: 1.0,
    state: 'selected',
    visible: true,
  },
  render: (args) => (
    <StoryCanvas
      title="KinematicVector"
      description="Projected velocity vector line across a fixed time delta Δt displaying directional kinematics in perspective-invariant dashed styling."
      frame={SYSTEM_FRAME}
      cameraDistance={24}
    >
      <SpatialFrameProvider frame={SYSTEM_FRAME}>
        <KinematicVector {...args} />
      </SpatialFrameProvider>
    </StoryCanvas>
  ),
};
