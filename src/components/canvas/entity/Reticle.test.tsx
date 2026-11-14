import { describe, it, expect } from 'vitest';
import ReactThreeTest from '@react-three/test-renderer';
import { Reticle } from './Reticle';
import { SpatialEntityProvider } from './SpatialEntityProvider';
import { SpatialFrameProvider, GALACTIC_FRAME } from '../instrument';
import type { CelestialClassification } from '../cartography/reticleGeometry';

describe('Reticle Primitive (Layer 2: Tactical Geometric Reticle)', () => {
  it('renders basic geometric diamond frame for single star without multiplicity annotations in active state', async () => {
    const renderer = await ReactThreeTest.create(
      <SpatialEntityProvider>
        <SpatialFrameProvider frame={GALACTIC_FRAME}>
          <Reticle
            id="star-reticle"
            classification="star"
            state="active"
            size={0.45}
          />
        </SpatialFrameProvider>
      </SpatialEntityProvider>,
    );

    expect(renderer.scene.findAll((node) => node.props.name === 'reticle-star-reticle')).toHaveLength(1);
    expect(renderer.scene.findAll((node) => node.props.name === 'reticle-geometry')).toHaveLength(1);
    expect(renderer.scene.findAll((node) => node.props.name === 'multiplicity-pips')).toHaveLength(0);

    await renderer.unmount();
  });

  it('renders multiplicity annotations for binary/multiple systems in active state', async () => {
    const renderer = await ReactThreeTest.create(
      <SpatialEntityProvider>
        <SpatialFrameProvider frame={GALACTIC_FRAME}>
          <Reticle
            id="binary-active"
            classification="star"
            state="active"
            size={0.45}
            multiplicity={2}
          />
        </SpatialFrameProvider>
      </SpatialEntityProvider>,
    );

    expect(renderer.scene.findAll((node) => node.props.name === 'reticle-binary-active')).toHaveLength(1);
    expect(renderer.scene.findAll((node) => node.props.name === 'multiplicity-pips')).toHaveLength(1);

    await renderer.unmount();
  });

  it('renders full Four-Facet composite reticle with multiplicity and census in selected/focused states', async () => {
    const renderer = await ReactThreeTest.create(
      <SpatialEntityProvider>
        <SpatialFrameProvider frame={GALACTIC_FRAME}>
          <Reticle
            id="binary-star"
            classification="star"
            state="selected"
            size={0.45}
            multiplicity={2}
            planets={[
              { id: 'p1', name: 'Planet b', classification: 'terrestrial' },
              { id: 'p2', name: 'Planet c', classification: 'terrestrial' },
            ]}
            spectralType="G2V"
          />
        </SpatialFrameProvider>
      </SpatialEntityProvider>,
    );

    expect(renderer.scene.findAll((node) => node.props.name === 'reticle-binary-star')).toHaveLength(1);
    expect(renderer.scene.findAll((node) => node.props.name === 'multiplicity-pips')).toHaveLength(1);
    expect(renderer.scene.findAll((node) => node.props.name === 'planetary-census-pips')).toHaveLength(1);

    await renderer.unmount();
  });

  it('renders category-specific reticle geometries for brown dwarfs, white dwarfs, and black holes', async () => {
    const classifications: readonly CelestialClassification[] = [
      'brown-dwarf',
      'white-dwarf',
      'neutron-star',
      'black-hole',
      'terrestrial',
      'gas-giant',
      'ice-giant',
      'stellar-cluster',
      'construct',
    ];

    for (const cls of classifications) {
      const renderer = await ReactThreeTest.create(
        <SpatialEntityProvider>
          <SpatialFrameProvider frame={GALACTIC_FRAME}>
            <Reticle
              id={`reticle-${cls}`}
              classification={cls}
              state="active"
            />
          </SpatialFrameProvider>
        </SpatialEntityProvider>,
      );

      expect(renderer.scene.findAll((node) => node.props.name === `reticle-reticle-${cls}`)).toHaveLength(1);
      await renderer.unmount();
    }
  });
});
