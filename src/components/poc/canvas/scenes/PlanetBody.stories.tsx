import type { Meta, StoryObj } from '@storybook/react-vite';
import { StoryCanvas } from '../StoryCanvas';
import { PlanetBody, type PlanetBodyProps } from './PlanetBody';
import { CelestialEntity } from '../entity/CelestialEntity';
import { SpatialEntityProvider } from '../entity/SpatialEntityContext';
import { SpatialFrameProvider, PLANETARY_FRAME } from '../instrument';

const meta: Meta<PlanetBodyProps> = {
  title: 'POC/Canvas/Celestial Entities/Planet Body',
  component: PlanetBody,
  parameters: {
    layout: 'fullscreen',
  },
  argTypes: {
    classification: {
      control: 'select',
      options: ['terrestrial', 'gas-giant', 'ice-giant', 'brown-dwarf', 'star'],
      description: 'Cartographic celestial classification driving surface procedural textures and colors',
    },
    radius: {
      control: { type: 'range', min: 0.5, max: 5.0, step: 0.1 },
      description: 'Physical cartographic radius of the planetary sphere',
    },
    hasAtmosphere: {
      control: 'boolean',
      description: 'Whether to render atmospheric haze layer',
    },
    atmosphereColor: {
      control: 'color',
      description: 'Custom override for atmospheric limb color',
    },
    minPixelSize: {
      control: { type: 'range', min: 4, max: 40, step: 2 },
      description: 'Screen pixel diameter threshold below which the body smoothly fades out',
    },
  },
};

export default meta;
type Story = StoryObj<PlanetBodyProps>;

export const InteractiveInspector: Story = {
  name: '1. Interactive Planet Inspector',
  args: {
    name: 'Earth',
    classification: 'terrestrial',
    radius: 2.0,
    hasAtmosphere: true,
    minPixelSize: 14,
  },
  render: (args) => (
    <StoryCanvas frame={PLANETARY_FRAME} cameraDistance={7}>
      <PlanetBody {...args} />
    </StoryCanvas>
  ),
};

export const DistanceFadeTransition: Story = {
  name: '2. Distance Fade Transition (Zoom Out)',
  args: {
    name: 'Target World',
    classification: 'terrestrial',
    radius: 1.5,
    minPixelSize: 16,
  },
  render: (args) => (
    <StoryCanvas frame={PLANETARY_FRAME} cameraDistance={15}>
      <SpatialFrameProvider frame={PLANETARY_FRAME}>
        <SpatialEntityProvider>
          {/* The physical PlanetBody fades out at distance */}
          <PlanetBody {...args} />
          {/* The invariant Reticle and BodyMarker seamlessly take over */}
          <CelestialEntity
            id="planet-target"
            name="Target World"
            position={[0, 0, 0]}
            classification="terrestrial"
            stateOverride="selected"
            bodyRadius={args.radius}
            bodyMinPixelSize={args.minPixelSize}
            bodyFadeRange={args.fadeRange}
          />
        </SpatialEntityProvider>
      </SpatialFrameProvider>
    </StoryCanvas>
  ),
};

export const SolarSystemBodies: Story = {
  name: '3. Solar System Bodies (Planetary Census)',
  render: () => (
    <StoryCanvas frame={PLANETARY_FRAME} cameraDistance={16}>
      {/* Mercury */}
      <group position={[-9, 0, 0]}>
        <PlanetBody name="Mercury" classification="terrestrial" radius={0.8} hasAtmosphere={false} />
      </group>

      {/* Venus */}
      <group position={[-5.5, 0, 0]}>
        <PlanetBody name="Venus" classification="terrestrial" radius={1.4} atmosphereColor="#d8a860" />
      </group>

      {/* Earth */}
      <group position={[-2, 0, 0]}>
        <PlanetBody name="Earth" classification="terrestrial" radius={1.5} atmosphereColor="#68b4e8" />
      </group>

      {/* Mars */}
      <group position={[1.5, 0, 0]}>
        <PlanetBody name="Mars" classification="terrestrial" radius={1.0} hasAtmosphere={false} />
      </group>

      {/* Jupiter */}
      <group position={[6.5, 0, 0]}>
        <PlanetBody name="Jupiter" classification="gas-giant" radius={2.8} />
      </group>

      {/* Neptune */}
      <group position={[12, 0, 0]}>
        <PlanetBody name="Neptune" classification="ice-giant" radius={2.0} />
      </group>
    </StoryCanvas>
  ),
};
