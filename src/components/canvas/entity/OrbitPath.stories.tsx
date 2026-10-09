import type { Meta, StoryObj } from '@storybook/react-vite';
import { StoryCanvas } from '../../../../.storybook/helpers/StoryCanvas';
import { OrbitPath } from './OrbitPath';
import { SpatialFrameProvider, SYSTEM_FRAME } from '../instrument';

const meta: Meta<typeof OrbitPath> = {
  title: 'CANVAS/Entities',
  component: OrbitPath,
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;
type Story = StoryObj<typeof OrbitPath>;

export const OrbitPathStory: Story = {
  name: 'OrbitPath',
  args: {
    id: 'orbit-demo',
    semiMajorAxis: 8,
    eccentricity: 0.25,
    inclination: 15,
    ascendingNode: 30,
    argumentOfPeriapsis: 45,
    state: 'selected',
    visible: true,
    showPeriapsisTick: true,
    showDirectionIndicator: true,
  },
  render: (args) => (
    <StoryCanvas
      title="OrbitPath"
      description="3D Keplerian elliptical orbit ring with periapsis indicator, direction chevron, and state-driven tactical vector styling."
      frame={SYSTEM_FRAME}
      cameraDistance={24}
    >
      <SpatialFrameProvider frame={SYSTEM_FRAME}>
        <OrbitPath {...args} />
      </SpatialFrameProvider>
    </StoryCanvas>
  ),
};
