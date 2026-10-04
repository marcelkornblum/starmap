import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { CelestialNode, type CelestialClassification, type CelestialInteractionState } from './CelestialNode';
import { CartographicGrid } from './CartographicGrid';
import { SceneTokenBridge, ThemeTokenBridge } from '../ThemeTokenBridge';
import styles from './StorybookCanvasWrapper.module.css';

const meta: Meta<typeof CelestialNode> = {
  title: 'Canvas/Cartography/CelestialNode',
  component: CelestialNode,
  parameters: {
    layout: 'padded',
  },
  decorators: [
    (Story) => (
      <div className={styles.viewportContainer}>
        <ThemeTokenBridge />
        <Canvas camera={{ position: [5, 5, 4], fov: 45 }} gl={{ antialias: true, alpha: true }}>
          <SceneTokenBridge />
          <CartographicGrid
            radius={6}
            rangeRings={[1, 2, 3, 4, 5, 6]}
            showFins={false}
            showFullDatumCircle={true}
            showAxisLines={true}
            lockToFocusPoint={false}
            position={[0, 0, 0]}
          />
          <Story />
          <OrbitControls makeDefault enableDamping dampingFactor={0.05} minDistance={2.0} maxDistance={50} />
        </Canvas>
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof CelestialNode>;

export const Default: Story = {
  name: 'Default (Interactive Circumbinary System)',
  args: {
    id: 'kepler-47',
    name: 'Kepler-47',
    position: [1.8, 1.4, 2.0],
    classification: 'star',
    spectralType: 'G6V + M3V',
    multiplicity: 2,
    planets: [
      { id: 'kepler-47-b', name: 'Kepler-47 b', classification: 'terrestrial' },
      { id: 'kepler-47-d', name: 'Kepler-47 d', classification: 'ice-giant' },
      { id: 'kepler-47-c', name: 'Kepler-47 c', classification: 'gas-giant' },
    ],
  },
};

export const DefaultPassive: Story = {
  args: {
    id: 'sirius',
    name: 'Sirius A',
    position: [1.8, 1.4, 2.0],
    classification: 'star',
    state: 'passive',
    spectralType: 'A1V',
    showStalk: true,
  },
};

export const ActiveState: Story = {
  args: {
    id: 'sol',
    name: 'Sol',
    position: [1.8, 1.4, 1.8],
    classification: 'star',
    state: 'active',
    spectralType: 'G2V',
    showStalk: true,
  },
};

export const SelectedWithStalk: Story = {
  args: {
    id: 'vega',
    name: 'Vega',
    position: [1.8, 2.2, 2.5],
    classification: 'star',
    state: 'selected',
    spectralType: 'A0V',
    showStalk: true,
  },
};

export const FocusedPositiveZ: Story = {
  args: {
    id: 'alpha-centauri',
    name: 'Alpha Centauri A',
    position: [2.0, 1.6, 2.5],
    classification: 'star',
    state: 'focused',
    spectralType: 'G2V',
    showStalk: true,
  },
};

export const FocusedNegativeZ: Story = {
  args: {
    id: 'proxima',
    name: 'Proxima Centauri',
    position: [1.8, -1.5, -2.0],
    classification: 'star',
    state: 'focused',
    spectralType: 'M5.5Ve',
    showStalk: true,
  },
};

export const InteractiveStateCycle: Story = {
  render: () => {
    const InteractiveDemo = () => {
      const [state, setState] = useState<CelestialInteractionState>('active');
      const states: CelestialInteractionState[] = ['passive', 'active', 'selected', 'focused'];

      const handleCycle = () => {
        const nextIdx = (states.indexOf(state) + 1) % states.length;
        setState(states[nextIdx]);
      };

      return (
        <CelestialNode
          id="interactive-star"
          name="Betelgeuse"
          position={[1.8, 1.4, 2.2]}
          classification="star"
          state={state}
          spectralType="M1-M2Ia-ab"
          showStalk={true}
          onClick={handleCycle}
        />
      );
    };

    return <InteractiveDemo />;
  },
};

export const UniversalTaxonomyGallery: Story = {
  render: () => {
    const classifications: Array<{
      type: CelestialClassification;
      name: string;
      tag: string;
      x: number;
      y: number;
      z: number;
    }> = [
      { type: 'star', name: 'Sol', tag: 'G2V', x: -5.0, y: 1.5, z: 1.8 },
      { type: 'brown-dwarf', name: 'Luhman 16', tag: 'L7.5', x: -4.0, y: 1.8, z: 1.8 },
      { type: 'white-dwarf', name: 'Sirius B', tag: 'DA2', x: -3.0, y: 1.4, z: 1.8 },
      { type: 'neutron-star', name: 'Crab Pulsar', tag: 'PSR', x: -2.0, y: 1.7, z: 1.8 },
      { type: 'black-hole', name: 'Cygnus X-1', tag: 'BH', x: -1.0, y: 1.5, z: 1.8 },
      { type: 'barycentre', name: 'Solar Barycentre', tag: 'BC', x: 0.2, y: 1.8, z: 1.8 },
      { type: 'stellar-cluster', name: 'Pleiades', tag: 'M45', x: 1.4, y: 1.4, z: 1.8 },
      { type: 'construct', name: 'Voyager 1', tag: 'ART', x: 2.5, y: 1.7, z: 1.8 },
      { type: 'terrestrial', name: 'Earth', tag: '1.0 M⊕', x: 3.5, y: 1.5, z: 1.8 },
      { type: 'gas-giant', name: 'Jupiter', tag: '318 M⊕', x: 4.5, y: 1.8, z: 1.8 },
      { type: 'ice-giant', name: 'Neptune', tag: '17 M⊕', x: 5.5, y: 1.4, z: 1.8 },
    ];

    return (
      <group>
        {classifications.map((item) => (
          <CelestialNode
            key={item.type}
            id={item.type}
            name={item.name}
            position={[item.x, item.y, item.z]}
            classification={item.type}
            state="active"
            spectralType={item.tag}
            showStalk={true}
          />
        ))}
      </group>
    );
  },
};

export const LabelOcclusionDemo: Story = {
  name: 'Label Occlusion (Priority Behind Star & Reticle)',
  render: () => {
    const OcclusionDemo = () => {
      const [selectedId, setSelectedId] = useState<string | null>(null);

      return (
        <group>
          {/* Node 1: Primary star whose label points toward Node 2 */}
          <CelestialNode
            id="node-primary"
            name="Alpha Centauri A"
            position={[0.8, 1.2, 1.5]}
            classification="star"
            state={selectedId === 'node-primary' ? 'selected' : 'active'}
            spectralType="G2V"
            showStalk={true}
            onClick={() => setSelectedId((prev) => (prev === 'node-primary' ? null : 'node-primary'))}
          />

          {/* Node 2: Secondary companion star situated directly in Node 1's label path */}
          <CelestialNode
            id="node-companion"
            name="Alpha Centauri B"
            position={[1.5, 1.6, 1.5]}
            classification="star"
            state={selectedId === 'node-companion' ? 'selected' : 'active'}
            spectralType="K1V"
            showStalk={true}
            onClick={() => setSelectedId((prev) => (prev === 'node-companion' ? null : 'node-companion'))}
          />
        </group>
      );
    };

    return <OcclusionDemo />;
  },
};

