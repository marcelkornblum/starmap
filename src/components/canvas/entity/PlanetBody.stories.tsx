import type { Meta, StoryObj } from '@storybook/react-vite';
import { StoryCanvas } from '../StoryCanvas';
import { PlanetBody } from './PlanetBody';
import { CelestialEntity } from './CelestialEntity';
import { SpatialEntityProvider, ApertureEvaluator } from './SpatialEntityContext';
import { OcclusionPass } from './OcclusionPass';
import { SpatialFrameProvider, PLANETARY_FRAME } from '../instrument';
import type { CelestialClassification } from '../cartography/reticleGeometry';

interface PlanetCrossfadeStoryArgs {
  radius: number;
  minPixelSize: number;
  fadeRange: number;
  hasAtmosphere: boolean;
  spacing: number;
}

const meta: Meta<PlanetCrossfadeStoryArgs> = {
  title: 'CANVAS/Entities',
  parameters: {
    layout: 'fullscreen',
  },
  argTypes: {
    radius: {
      control: { type: 'range', min: 0.8, max: 2.8, step: 0.1 },
      description: 'Cartographic physical sphere radius in world units',
    },
    minPixelSize: {
      control: { type: 'range', min: 14, max: 60, step: 2 },
      description: 'Projected screen pixel diameter threshold below which 3D sphere fades out to reticle',
    },
    fadeRange: {
      control: { type: 'range', min: 8, max: 40, step: 2 },
      description: 'Pixel diameter transition range for the smooth reciprocal cross-fade',
    },
    hasAtmosphere: {
      control: 'boolean',
      description: 'Toggle atmospheric haze and limb scattering envelope',
    },
    spacing: {
      control: { type: 'range', min: 4.0, max: 10.0, step: 0.5 },
      description: 'Horizontal separation between planetary bodies',
    },
  },
};

export default meta;
type Story = StoryObj<PlanetCrossfadeStoryArgs>;

interface BodySpec {
  id: string;
  name: string;
  classification: CelestialClassification;
  spectralType?: string;
  col: number;
}

const BODIES: BodySpec[] = [
  { id: 'body-terrestrial', name: 'Terrestrial World', classification: 'terrestrial', spectralType: 'Telluric', col: 0 },
  { id: 'body-gas-giant', name: 'Gas Giant', classification: 'gas-giant', spectralType: 'Jovian', col: 1 },
  { id: 'body-ice-giant', name: 'Ice Giant', classification: 'ice-giant', spectralType: 'Neptunian', col: 2 },
  { id: 'body-brown-dwarf', name: 'Brown Dwarf', classification: 'brown-dwarf', spectralType: 'Sub-stellar', col: 3 },
  { id: 'body-star', name: 'Stellar Core', classification: 'star', spectralType: 'Luminous', col: 4 },
];

export const PlanetaryBodiesCrossfadeStory: Story = {
  name: 'Planetary Bodies & Reticle Cross-fade',
  args: {
    radius: 1.4,
    minPixelSize: 34,
    fadeRange: 22,
    hasAtmosphere: true,
    spacing: 5.6,
  },
  render: (args) => {
    return (
      <StoryCanvas
        title="Planetary Bodies & Reticle Cross-fade"
        description="Procedural planetary surface textures and atmospheric envelopes. Zoom in close to inspect high-fidelity procedural cartographic spheres; zoom out with mouse wheel to observe the seamless distance-dependent cross-fade into non-spherical tactical reticles."
        frame={PLANETARY_FRAME}
        cameraDistance={18}
      >
        <SpatialFrameProvider frame={PLANETARY_FRAME}>
          <SpatialEntityProvider>
            <ApertureEvaluator />
            <OcclusionPass />
            {BODIES.map((body) => {
              const x = (body.col - 2) * args.spacing;
              return (
                <CelestialEntity
                  key={body.id}
                  id={body.id}
                  name={body.name}
                  classification={body.classification}
                  spectralType={body.spectralType}
                  position={[x, 0, 0]}
                  stateOverride="selected"
                  bodyRadius={args.radius}
                  bodyMinPixelSize={args.minPixelSize}
                  bodyFadeRange={args.fadeRange}
                >
                  <PlanetBody
                    name={body.name}
                    classification={body.classification}
                    radius={args.radius}
                    hasAtmosphere={args.hasAtmosphere}
                    minPixelSize={args.minPixelSize}
                    fadeRange={args.fadeRange}
                  />
                </CelestialEntity>
              );
            })}
          </SpatialEntityProvider>
        </SpatialFrameProvider>
      </StoryCanvas>
    );
  },
};
