import type { Meta, StoryObj } from '@storybook/react-vite';
import { CanvasLayer } from './CanvasLayer';

const meta: Meta<typeof CanvasLayer> = {
  title: 'Domain/CanvasLayer',
  component: CanvasLayer,
};

export default meta;
type Story = StoryObj<typeof CanvasLayer>;

export const GalaxyCanvas: Story = {
  args: {
    scope: 'galaxy',
    centerId: 'sol',
    centerCoordinates: [0, 0, 0],
    cameraAzimuthDeg: 45,
    cameraElevationDeg: 30,
    cameraDistance: 1200,
  },
};

export const SystemCanvas: Story = {
  args: {
    scope: 'system',
    targetId: 'sol',
    centerId: 'sol',
    cameraAzimuthDeg: 20,
    cameraElevationDeg: 45,
    cameraDistance: 60,
  },
};

export const PlanetCanvas: Story = {
  args: {
    scope: 'planet',
    targetId: 'earth',
    centerId: 'earth',
    cameraAzimuthDeg: 15,
    cameraElevationDeg: 25,
    cameraDistance: 8,
  },
};
