import type { Meta, StoryObj } from '@storybook/react-vite';
import { StoryCanvas } from '../StoryCanvas';
import { Reticle } from './Reticle';
import { BodyMarker } from './BodyMarker';
import { EntityLabel } from './EntityLabel';
import { SpatialEntityProvider, ApertureEvaluator } from './SpatialEntityContext';
import { OcclusionPass } from './OcclusionPass';
import { SpatialFrameProvider, SYSTEM_FRAME } from '../instrument';
import { DEFAULT_RETICLE_SIZE, type CelestialClassification, type PlanetCensusEntry } from '../cartography/reticleGeometry';
import type { CelestialInteractionState } from './types';

interface ReticleTaxonomyStoryArgs {
  state: CelestialInteractionState;
  spacing: number;
}

const meta: Meta<ReticleTaxonomyStoryArgs> = {
  title: 'CANVAS/Entities',
  parameters: {
    layout: 'fullscreen',
  },
  argTypes: {
    state: {
      control: 'select',
      options: ['selected', 'focused', 'active', 'passive'],
      description: 'Interaction state driving reticle attention gating and facet display',
    },
    spacing: {
      control: { type: 'range', min: 3.5, max: 8.0, step: 0.5 },
      description: 'Horizontal and vertical grid spacing between reticles',
    },
  },
};

export default meta;
type Story = StoryObj<ReticleTaxonomyStoryArgs>;

interface TaxonomyDef {
  id: string;
  name: string;
  classification: CelestialClassification;
  spectralType: string;
  multiplicity: number;
  planets?: PlanetCensusEntry[];
  row: number;
  col: number;
}

const TAXONOMY_ENTRIES: TaxonomyDef[] = [
  // Row 1: Stellar & Degenerate Remnants
  {
    id: 'tax-star',
    name: 'Star',
    classification: 'star',
    spectralType: 'star',
    multiplicity: 1,
    row: 0,
    col: 0,
  },
  {
    id: 'tax-system',
    name: 'Stellar System',
    classification: 'stellar-system',
    spectralType: 'stellar-system',
    multiplicity: 2,
    planets: [
      { id: 'p1', name: 'b', classification: 'terrestrial' },
      { id: 'p2', name: 'c', classification: 'gas-giant' },
      { id: 'p3', name: 'd', classification: 'ice-giant' },
    ],
    row: 0,
    col: 1,
  },
  {
    id: 'tax-brown-dwarf',
    name: 'Brown Dwarf',
    classification: 'brown-dwarf',
    spectralType: 'brown-dwarf',
    multiplicity: 1,
    row: 0,
    col: 2,
  },
  {
    id: 'tax-white-dwarf',
    name: 'White Dwarf',
    classification: 'white-dwarf',
    spectralType: 'white-dwarf',
    multiplicity: 1,
    row: 0,
    col: 3,
  },
  {
    id: 'tax-neutron-star',
    name: 'Neutron Star',
    classification: 'neutron-star',
    spectralType: 'neutron-star',
    multiplicity: 1,
    row: 0,
    col: 4,
  },
  {
    id: 'tax-black-hole',
    name: 'Black Hole',
    classification: 'black-hole',
    spectralType: 'black-hole',
    multiplicity: 1,
    row: 0,
    col: 5,
  },

  // Row 2: Non-Stellar & Planetary Bodies
  {
    id: 'tax-barycentre',
    name: 'Barycentre',
    classification: 'barycentre',
    spectralType: 'barycentre',
    multiplicity: 1,
    row: 1,
    col: 0,
  },
  {
    id: 'tax-cluster',
    name: 'Stellar Cluster',
    classification: 'cluster',
    spectralType: 'cluster',
    multiplicity: 1,
    row: 1,
    col: 1,
  },
  {
    id: 'tax-construct',
    name: 'Construct',
    classification: 'construct',
    spectralType: 'construct',
    multiplicity: 1,
    row: 1,
    col: 2,
  },
  {
    id: 'tax-terrestrial',
    name: 'Terrestrial',
    classification: 'terrestrial',
    spectralType: 'terrestrial',
    multiplicity: 1,
    row: 1,
    col: 3,
  },
  {
    id: 'tax-gas-giant',
    name: 'Gas Giant',
    classification: 'gas-giant',
    spectralType: 'gas-giant',
    multiplicity: 1,
    row: 1,
    col: 4,
  },
  {
    id: 'tax-ice-giant',
    name: 'Ice Giant',
    classification: 'ice-giant',
    spectralType: 'ice-giant',
    multiplicity: 1,
    row: 1,
    col: 5,
  },
];

export const ReticleTaxonomyStory: Story = {
  name: 'Reticle Taxonomy & Facets',
  args: {
    state: 'selected',
    spacing: 5.2,
  },
  render: (args) => {
    return (
      <StoryCanvas
        title="Reticle Taxonomy & Facets"
        description="Comprehensive taxonomic gallery exhibiting all 12 celestial reticle geometries with multi-facet annotations: corner brackets, multiplicity pips (TL), planetary census pips (TR), and spectral type tags (BR). Footprints are disabled."
        frame={SYSTEM_FRAME}
        cameraDistance={26}
      >
        <SpatialFrameProvider frame={SYSTEM_FRAME}>
          <SpatialEntityProvider>
            <ApertureEvaluator />
            <OcclusionPass />
            {TAXONOMY_ENTRIES.map((entry) => {
              const x = (entry.col - 2.5) * args.spacing;
              const y = (0.5 - entry.row) * (args.spacing * 0.9);
              return (
                <group key={entry.id} position={[x, y, 0]} name={`reticle-item-${entry.id}`}>
                  {entry.classification !== 'barycentre' && (
                    <BodyMarker
                      id={`marker-${entry.id}`}
                      position={[0, 0, 0]}
                      reticleSize={DEFAULT_RETICLE_SIZE}
                      interactive={false}
                    />
                  )}
                  <Reticle
                    id={entry.id}
                    position={[0, 0, 0]}
                    classification={entry.classification}
                    state={args.state}
                    size={DEFAULT_RETICLE_SIZE}
                    multiplicity={entry.multiplicity}
                    planets={entry.planets}
                    spectralType={entry.spectralType}
                  />
                  <EntityLabel
                    id={`label-${entry.id}`}
                    name={entry.name}
                    position={[0, 0, 0]}
                    spectralType={entry.spectralType}
                    state={args.state}
                    reticleSize={DEFAULT_RETICLE_SIZE}
                  />
                </group>
              );
            })}
          </SpatialEntityProvider>
        </SpatialFrameProvider>
      </StoryCanvas>
    );
  },
};
