import type { Meta, StoryObj } from '@storybook/react-vite';
import { StoryCanvas } from '../StoryCanvas';
import { CelestialEntity } from './CelestialEntity';
import { SpatialEntityProvider, ApertureEvaluator } from './SpatialEntityContext';
import { OcclusionPass } from './OcclusionPass';
import { SpatialFrameProvider, GALACTIC_FRAME } from '../instrument';
import type { CelestialClassification } from '../cartography/reticleGeometry';
import type { CelestialInteractionState } from './types';

interface FullEntityStoryArgs {
  name: string;
  classification: CelestialClassification;
  spectralType: string;
  state: CelestialInteractionState;
  multiplicity: number;
  planets: number;
  elevationZ: number;
  showKinematicVector: boolean;
  showOrbit: boolean;
  orbitSemiMajorAxis: number;
  orbitEccentricity: number;
  orbitInclination: number;
}

const meta: Meta<FullEntityStoryArgs> = {
  title: 'CANVAS/Entities',
  parameters: {
    layout: 'fullscreen',
  },
  argTypes: {
    classification: {
      control: 'select',
      options: [
        'star',
        'stellar-system',
        'brown-dwarf',
        'white-dwarf',
        'neutron-star',
        'black-hole',
        'barycentre',
        'cluster',
        'construct',
        'terrestrial',
        'gas-giant',
        'ice-giant',
      ],
      description: 'Taxonomic celestial classification driving reticle geometry and bracket morphology',
    },
    state: {
      control: 'select',
      options: ['passive', 'active', 'selected', 'focused'],
      description: 'Visual tier & interaction state driving attention gating and element activation',
    },
    spectralType: {
      control: 'text',
      description: 'Stellar spectral classification tag displayed in reticle facet and label',
    },
    multiplicity: {
      control: { type: 'range', min: 1, max: 4, step: 1 },
      description: 'Number of stellar multiplicity pips along the top-left facet',
    },
    planets: {
      control: { type: 'range', min: 0, max: 9, step: 1 },
      description: 'Number of planetary census indicator pips along the facet',
    },
    elevationZ: {
      control: { type: 'range', min: -10, max: 10, step: 0.5 },
      description: 'Elevation above/below the cartographic reference plane driving drop stalk height',
    },
    showKinematicVector: {
      control: 'boolean',
      description: 'Toggle projected kinematic velocity vector',
    },
    showOrbit: {
      control: 'boolean',
      description: 'Toggle Keplerian orbital path',
    },
    orbitSemiMajorAxis: {
      control: { type: 'range', min: 4, max: 24, step: 1 },
      description: 'Keplerian semi-major axis',
    },
    orbitEccentricity: {
      control: { type: 'range', min: 0, max: 0.85, step: 0.05 },
      description: 'Keplerian orbital eccentricity',
    },
    orbitInclination: {
      control: { type: 'range', min: 0, max: 1.57, step: 0.05 },
      description: 'Orbital plane inclination in radians',
    },
  },
};

export default meta;
type Story = StoryObj<FullEntityStoryArgs>;

export const FullEntityAssemblyStory: Story = {
  name: 'Full Entity Assembly',
  args: {
    name: 'HD 10180',
    classification: 'star',
    spectralType: 'G1V',
    state: 'selected',
    multiplicity: 2,
    planets: 6,
    elevationZ: 4.5,
    showKinematicVector: true,
    showOrbit: true,
    orbitSemiMajorAxis: 12,
    orbitEccentricity: 0.35,
    orbitInclination: 0.25,
  },
  render: (args) => {
    const primaryZ = args.elevationZ;
    const censusPlanets = Array.from({ length: args.planets }, (_, i) => {
      const types: Array<'terrestrial' | 'gas-giant' | 'ice-giant'> = ['terrestrial', 'gas-giant', 'ice-giant'];
      return {
        id: `planet-${i + 1}`,
        name: String.fromCharCode(98 + i),
        classification: types[i % types.length],
      };
    });

    return (
      <StoryCanvas
        title="Full Entity Assembly"
        description="Unified celestial entity composite demonstrating Layer 1 BodyMarker, Layer 2 Reticle with taxonomic brackets and facets, Layer 3 EntityLabel, vertical DropStalk to reference plane, KinematicVector, and Keplerian OrbitPath."
        frame={GALACTIC_FRAME}
        cameraDistance={28}
      >
        <SpatialFrameProvider frame={GALACTIC_FRAME}>
          <SpatialEntityProvider>
            <ApertureEvaluator />
            <OcclusionPass />
            <CelestialEntity
              id="full-assembly-demo"
              name={args.name}
              classification={args.classification}
              spectralType={args.spectralType}
              multiplicity={args.multiplicity}
              planets={censusPlanets}
              position={[0, 1.5, args.elevationZ]}
              stateOverride={args.state}
              velocity={args.showKinematicVector ? [2.8, 1.2, -0.9] : undefined}
              orbit={
                args.showOrbit
                  ? {
                      primaryPosition: [0, 0, primaryZ],
                      semiMajorAxis: args.orbitSemiMajorAxis,
                      eccentricity: args.orbitEccentricity,
                      inclination: args.orbitInclination,
                      ascendingNode: 0.4,
                      argumentOfPeriapsis: 0.6,
                      color: 'var(--color-accent, #40b0ff)',
                      showDirectionArrow: true,
                      showPeriapsisTick: true,
                    }
                  : undefined
              }
            />
          </SpatialEntityProvider>
        </SpatialFrameProvider>
      </StoryCanvas>
    );
  },
};
