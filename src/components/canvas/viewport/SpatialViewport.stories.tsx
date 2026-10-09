import type { Meta, StoryObj } from '@storybook/react-vite';
import { StoryCanvas } from '../StoryCanvas';
import { SpatialViewport, type SpatialViewportProps } from './SpatialViewport';
import { GALACTIC_FRAME } from '../instrument/referenceFrame';
import type { SpatialEntityDefinition } from '../entity';

const SAMPLE_ENTITIES: SpatialEntityDefinition[] = [
  {
    id: 'sol',
    name: 'Sol',
    classification: 'star',
    position: [0, 0, 0],
    spectralType: 'G2V',
    multiplicity: 1,
  },
  {
    id: 'prox-cen',
    name: 'Proxima Centauri',
    classification: 'star',
    position: [1.34, 0.45, -0.62],
    spectralType: 'M5.5V',
    multiplicity: 1,
  },
  {
    id: 'sirius',
    name: 'Sirius',
    classification: 'star',
    position: [-1.61, -2.13, -0.55],
    spectralType: 'A1V',
    multiplicity: 2,
  },
];

const meta: Meta<SpatialViewportProps> = {
  title: 'CANVAS/Viewport',
  component: SpatialViewport,
  parameters: {
    layout: 'fullscreen',
  },
  argTypes: {
    mode: {
      control: 'select',
      options: ['explore', 'focus', 'route', 'filter'],
      description: 'Interaction tier mode influencing instrument prominence',
    },
    showInstrument: {
      control: 'boolean',
      description: 'Toggle cartographic instrument grid and coordinate fins',
    },
    debugHitarea: {
      control: 'boolean',
      description: 'Show debug wireframes for entity click/hover hitareas',
    },
  },
};

export default meta;
type Story = StoryObj<SpatialViewportProps>;

export const SpatialViewportStory: Story = {
  name: 'Spatial Viewport',
  args: {
    frame: GALACTIC_FRAME,
    entities: SAMPLE_ENTITIES,
    mode: 'explore',
    showInstrument: true,
    debugHitarea: false,
  },
  render: (args) => (
    <StoryCanvas
      title="Spatial Viewport"
      description="Canonical composition root for 3D cartography scenes harmonising reference frames, camera rig, and celestial entities."
      frame={args.frame}
      cameraDistance={14}
    >
      <SpatialViewport {...args} />
    </StoryCanvas>
  ),
};
