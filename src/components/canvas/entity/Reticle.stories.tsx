import type { Meta, StoryObj } from '@storybook/react-vite';
import { StoryCanvas } from '../StoryCanvas';
import { CelestialEntity } from './CelestialEntity';
import { SpatialEntityProvider, ApertureEvaluator } from './SpatialEntityContext';
import { OcclusionPass } from './OcclusionPass';
import { SpatialFrameProvider, SYSTEM_FRAME } from '../instrument';
import type { CelestialInteractionState } from './types';
import type { CelestialClassification, PlanetCensusEntry } from '../cartography/reticleGeometry';

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
  { id: 'tax-star', name: 'Sol', classification: 'star', spectralType: 'G2V', multiplicity: 1, row: 0, col: 0 },
  {
    id: 'tax-system',
    name: 'Alpha Centauri',
    classification: 'stellar-system',
    spectralType: 'G2V·K1V',
    multiplicity: 2,
    planets: [
      { id: 'p1', name: 'b', classification: 'terrestrial' },
      { id: 'p2', name: 'c', classification: 'gas-giant' },
      { id: 'p3', name: 'd', classification: 'ice-giant' },
    ],
    row: 0,
    col: 1,
  },
  { id: 'tax-brown-dwarf', name: 'Luhman 16', classification: 'brown-dwarf', spectralType: 'L7.5', multiplicity: 1, row: 0, col: 2 },
  { id: 'tax-white-dwarf', name: 'Sirius B', classification: 'white-dwarf', spectralType: 'DA2', multiplicity: 1, row: 0, col: 3 },
  { id: 'tax-neutron-star', name: 'PSR B1919+21', classification: 'neutron-star', spectralType: 'Pulsar', multiplicity: 1, row: 0, col: 4 },
  { id: 'tax-black-hole', name: 'Sagittarius A*', classification: 'black-hole', spectralType: 'Singularity', multiplicity: 1, row: 0, col: 5 },

  // Row 2: Non-Stellar & Planetary Bodies
  { id: 'tax-barycentre', name: 'Barycentre', classification: 'barycentre', spectralType: 'CM', multiplicity: 1, row: 1, col: 0 },
  { id: 'tax-cluster', name: 'Pleiades', classification: 'cluster', spectralType: 'Cl*', multiplicity: 1, row: 1, col: 1 },
  { id: 'tax-construct', name: 'Gateway Station', classification: 'construct', spectralType: 'Stn', multiplicity: 1, row: 1, col: 2 },
  { id: 'tax-terrestrial', name: 'Proxima b', classification: 'terrestrial', spectralType: 'Terrestrial', multiplicity: 1, row: 1, col: 3 },
  { id: 'tax-gas-giant', name: 'Jupiter', classification: 'gas-giant', spectralType: 'Gas Giant', multiplicity: 1, row: 1, col: 4 },
  { id: 'tax-ice-giant', name: 'Neptune', classification: 'ice-giant', spectralType: 'Ice Giant', multiplicity: 1, row: 1, col: 5 },
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
        description="Comprehensive taxonomic gallery exhibiting all 12 celestial reticle geometries with multi-facet annotations: corner brackets, multiplicity pips (TL), planetary census pips (TR), and spectral type tags (BR)."
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
                <CelestialEntity
                  key={entry.id}
                  id={entry.id}
                  name={entry.name}
                  classification={entry.classification}
                  spectralType={entry.spectralType}
                  multiplicity={entry.multiplicity}
                  planets={entry.planets}
                  position={[x, y, 0]}
                  stateOverride={args.state}
                />
              );
            })}
          </SpatialEntityProvider>
        </SpatialFrameProvider>
      </StoryCanvas>
    );
  },
};
