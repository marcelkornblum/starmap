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
        <Canvas camera={{ position: [5, 5, 5], fov: 45 }} gl={{ antialias: true, alpha: true }}>
          <SceneTokenBridge />
          <CartographicGrid radius={6} rangeRings={[2, 4, 6]} showFins={false} />
          <Story />
          <OrbitControls makeDefault enableDamping dampingFactor={0.05} />
        </Canvas>
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof CelestialNode>;

export const DefaultPassive: Story = {
  args: {
    id: 'sirius',
    name: 'Sirius A',
    position: [0, 0, 1.5],
    classification: 'star',
    state: 'passive',
    spectralType: 'A1V',
  },
};

export const ActiveState: Story = {
  args: {
    id: 'sol',
    name: 'Sol',
    position: [0, 0, 1.2],
    classification: 'star',
    state: 'active',
    spectralType: 'G2V',
  },
};

export const SelectedWithStalk: Story = {
  args: {
    id: 'vega',
    name: 'Vega',
    position: [1, 2, 2.0],
    classification: 'star',
    state: 'selected',
    spectralType: 'A0V',
  },
};

export const FocusedPositiveZ: Story = {
  args: {
    id: 'alpha-centauri',
    name: 'Alpha Centauri A',
    position: [0, 0, 2.5],
    classification: 'star',
    state: 'focused',
    spectralType: 'G2V',
  },
};

export const FocusedNegativeZ: Story = {
  args: {
    id: 'proxima',
    name: 'Proxima Centauri',
    position: [1.5, -1, -2.0],
    classification: 'star',
    state: 'focused',
    spectralType: 'M5.5Ve',
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
          position={[0, 0, 1.8]}
          classification="star"
          state={state}
          spectralType="M1-M2Ia-ab"
          onClick={handleCycle}
        />
      );
    };

    return <InteractiveDemo />;
  },
};

export const UniversalTaxonomyGallery: Story = {
  render: () => {
    const classifications: Array<{ type: CelestialClassification; name: string; tag: string; x: number }> = [
      { type: 'star', name: 'Sol', tag: 'G2V', x: -4.5 },
      { type: 'brown-dwarf', name: 'Luhman 16', tag: 'L7.5', x: -3.2 },
      { type: 'white-dwarf', name: 'Sirius B', tag: 'DA2', x: -1.9 },
      { type: 'hazard', name: 'Crab Pulsar', tag: 'PSR', x: -0.6 },
      { type: 'black-hole', name: 'Cygnus X-1', tag: 'BH', x: 0.7 },
      { type: 'terrestrial', name: 'Earth', tag: '1.0 M⊕', x: 2.0 },
      { type: 'gas-giant', name: 'Jupiter', tag: '318 M⊕', x: 3.3 },
      { type: 'ice-giant', name: 'Neptune', tag: '17 M⊕', x: 4.6 },
    ];

    return (
      <group>
        {classifications.map((item) => (
          <CelestialNode
            key={item.type}
            id={item.type}
            name={item.name}
            position={[item.x, 0, 1.2]}
            classification={item.type}
            state="active"
            spectralType={item.tag}
          />
        ))}
      </group>
    );
  },
};
