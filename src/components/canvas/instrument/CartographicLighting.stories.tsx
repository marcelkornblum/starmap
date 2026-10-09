import type { Meta, StoryObj } from '@storybook/react-vite';
import { StoryCanvas } from '../../../../.storybook/helpers/StoryCanvas';
import { CartographicLighting } from './CartographicLighting';
import { SpatialFrameProvider, PLANETARY_FRAME } from './index';

const meta: Meta<typeof CartographicLighting> = {
  title: 'CANVAS/Instrument',
  component: CartographicLighting,
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;
type Story = StoryObj<typeof CartographicLighting>;

export const CartographicLightingStory: Story = {
  name: 'CartographicLighting',
  render: (args) => (
    <StoryCanvas
      title="CartographicLighting"
      description="Provides ambient and directional illumination calibrated to the active reference frame lighting configuration."
      frame={PLANETARY_FRAME}
      cameraDistance={12}
    >
      <SpatialFrameProvider frame={PLANETARY_FRAME}>
        <CartographicLighting {...args} />
        <mesh position={[0, 0, 0]}>
          <sphereGeometry args={[2, 32, 32]} />
          <meshStandardMaterial color="#4a90e2" roughness={0.7} metalness={0.1} />
        </mesh>
      </SpatialFrameProvider>
    </StoryCanvas>
  ),
};
