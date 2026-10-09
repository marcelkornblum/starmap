import type { Meta, StoryObj } from '@storybook/react-vite';
import { StoryCanvas } from '../StoryCanvas';
import {
  GALACTIC_FRAME,
  SYSTEM_FRAME,
  PLANETARY_FRAME,
} from '../instrument/referenceFrame';
import { GalaxyScene } from './GalaxyScene';
import { SystemScene } from './SystemScene';
import { PlanetScene } from './PlanetScene';
import { PlanetBody } from './PlanetBody';

const meta: Meta = {
  title: 'POC/Canvas/Production Scenes/Canonical Scenes',
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;
type Story = StoryObj;

export const GalacticScale: Story = {
  name: '1. Galaxy Scene (Parsec Scale)',
  render: () => (
    <StoryCanvas frame={GALACTIC_FRAME} cameraDistance={14}>
      <GalaxyScene />
    </StoryCanvas>
  ),
};

export const SystemScale: Story = {
  name: '2. System Scene (AU Scale)',
  render: () => (
    <StoryCanvas frame={SYSTEM_FRAME} cameraDistance={8}>
      <SystemScene systemId="sol" />
    </StoryCanvas>
  ),
};

export const PlanetaryScale: Story = {
  name: '3. Planet Scene (Kilometre Scale)',
  render: () => (
    <StoryCanvas frame={PLANETARY_FRAME} cameraDistance={6}>
      <PlanetScene planetId="earth" planetName="Earth" classification="terrestrial" />
    </StoryCanvas>
  ),
};

export const PlanetBodyManifest: Story = {
  name: '4. PlanetBody Surface Manifest (Uniform Lighting)',
  render: () => (
    <StoryCanvas frame={PLANETARY_FRAME} cameraDistance={12}>
      {/* Terrestrial (Earth-like) */}
      <group position={[-6, 0, 0]}>
        <PlanetBody name="Terrestrial" classification="terrestrial" radius={1.8} />
      </group>

      {/* Gas Giant (Jupiter-like) */}
      <group position={[-1.5, 0, 0]}>
        <PlanetBody name="Gas Giant" classification="gas-giant" radius={2.2} />
      </group>

      {/* Ice Giant (Neptune-like) */}
      <group position={[3.2, 0, 0]}>
        <PlanetBody name="Ice Giant" classification="ice-giant" radius={1.9} />
      </group>

      {/* Brown Dwarf */}
      <group position={[7.5, 0, 0]}>
        <PlanetBody name="Sub-stellar" classification="brown-dwarf" radius={1.5} hasAtmosphere={false} />
      </group>
    </StoryCanvas>
  ),
};
