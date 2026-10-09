import type { Meta, StoryObj } from '@storybook/react-vite';
import { StoryCanvas } from '../StoryCanvas';
import { CelestialEntity } from './CelestialEntity';
import { SpatialEntityProvider, ApertureEvaluator } from './SpatialEntityContext';
import { OcclusionPass } from './OcclusionPass';
import { SpatialFrameProvider, GALACTIC_FRAME } from '../instrument';

const meta: Meta<typeof CelestialEntity> = {
  title: 'CANVAS/Entities',
  component: CelestialEntity,
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;
type Story = StoryObj<typeof CelestialEntity>;

export const CelestialEntityStory: Story = {
  name: 'CelestialEntity',
  args: {
    id: 'sol',
    name: 'Sol',
    classification: 'star',
    spectralType: 'G2V',
    multiplicity: 1,
    position: [0, 0, 0],
    stateOverride: 'selected',
  },
  render: (args) => (
    <StoryCanvas
      title="CelestialEntity"
      description="Unified composite composing Layer 1 BodyMarker, Layer 2 Reticle, Layer 3 EntityLabel, with optional DropStalk and KinematicVector."
      frame={GALACTIC_FRAME}
      cameraDistance={32}
    >
      <SpatialFrameProvider frame={GALACTIC_FRAME}>
        <SpatialEntityProvider>
          <ApertureEvaluator />
          <OcclusionPass />
          <CelestialEntity {...args} />
        </SpatialEntityProvider>
      </SpatialFrameProvider>
    </StoryCanvas>
  ),
};
