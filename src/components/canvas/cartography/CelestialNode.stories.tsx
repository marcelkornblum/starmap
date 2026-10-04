import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { CelestialNode, type CelestialClassification } from './CelestialNode';
import { CartographicGrid } from './CartographicGrid';
import { getStandardInitialCamera } from './cartographyMath';
import { SceneTokenBridge, ThemeTokenBridge } from '../ThemeTokenBridge';
import styles from './StorybookCanvasWrapper.module.css';

const standardCam = getStandardInitialCamera(8, [0, 0, 0]);

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
        <Canvas
          camera={{
            position: standardCam.position,
            up: standardCam.up,
            fov: standardCam.fov,
          }}
          gl={{ antialias: true, alpha: true }}
        >
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
          <OrbitControls makeDefault target={standardCam.target} enableDamping dampingFactor={0.05} minDistance={2.0} maxDistance={50} />
        </Canvas>
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof CelestialNode>;

export const Default: Story = {
  name: 'Stellar System (Full Facets)',
  args: {
    id: 'kepler-90',
    name: 'Kepler-90',
    position: [1.8, 1.4, 2.0],
    classification: 'star',
    state: 'focused',
    spectralType: 'G0V + M3V + M5V',
    multiplicity: 3,
    showStalk: true,
    planets: [
      { id: 'kepler-90-b', name: 'Kepler-90 b', classification: 'terrestrial' },
      { id: 'kepler-90-c', name: 'Kepler-90 c', classification: 'terrestrial' },
      { id: 'kepler-90-i', name: 'Kepler-90 i', classification: 'terrestrial' },
      { id: 'kepler-90-d', name: 'Kepler-90 d', classification: 'ice-giant' },
      { id: 'kepler-90-e', name: 'Kepler-90 e', classification: 'ice-giant' },
      { id: 'kepler-90-f', name: 'Kepler-90 f', classification: 'gas-giant' },
      { id: 'kepler-90-g', name: 'Kepler-90 g', classification: 'gas-giant' },
      { id: 'kepler-90-h', name: 'Kepler-90 h', classification: 'gas-giant' },
    ],
  },
};

export const Taxonomy: Story = {
  name: 'Taxonomy',
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

export const Occlusion: Story = {
  name: 'Occlusion',
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

