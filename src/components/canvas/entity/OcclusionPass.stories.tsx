import type { Meta, StoryObj } from '@storybook/react-vite';
import { StoryCanvas } from '../StoryCanvas';
import { OcclusionPass } from './OcclusionPass';
import { CelestialEntity } from './CelestialEntity';
import { SpatialEntityProvider, ApertureEvaluator } from './SpatialEntityContext';
import { SpatialFrameProvider, GALACTIC_FRAME } from '../instrument';

const meta: Meta<typeof OcclusionPass> = {
  title: 'CANVAS/Entities',
  component: OcclusionPass,
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;
type Story = StoryObj<typeof OcclusionPass>;

export const OcclusionPassStory: Story = {
  name: 'OcclusionPass',
  args: {
    enabled: true,
  },
  render: (args) => (
    <StoryCanvas
      title="OcclusionPass"
      description="Per-frame screen-space occlusion evaluator resolving spatial crowding, reticle priority masking, and typographic label leader lines."
      frame={GALACTIC_FRAME}
      cameraDistance={32}
    >
      <SpatialFrameProvider frame={GALACTIC_FRAME}>
        <SpatialEntityProvider>
          <ApertureEvaluator />
          <OcclusionPass {...args} />
          <CelestialEntity
            id="cluster-primary"
            name="Alpha Centauri A"
            classification="star"
            spectralType="G2V"
            position={[0, 0, 0]}
            stateOverride="selected"
          />
          <CelestialEntity
            id="cluster-secondary"
            name="Alpha Centauri B"
            classification="star"
            spectralType="K1V"
            position={[0.8, 0.4, 0]}
            stateOverride="active"
          />
          <CelestialEntity
            id="cluster-distant"
            name="Proxima Centauri"
            classification="star"
            spectralType="M5.5Ve"
            position={[-4, 2, -1]}
            stateOverride="active"
          />
        </SpatialEntityProvider>
      </SpatialFrameProvider>
    </StoryCanvas>
  ),
};
