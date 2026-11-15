import { describe, it, expect, vi, beforeEach } from 'vitest';
import ReactThreeTest from '@react-three/test-renderer';
import { SpatialViewport } from './SpatialViewport';
import {
  GALACTIC_FRAME,
  SYSTEM_FRAME,
  PLANETARY_FRAME,
} from '../instrument/referenceFrame';
import type { SpatialEntityDefinition } from '../../../types/spatial';
import { useUIStore } from '../../../stores/useUIStore';

describe('SpatialViewport Composition Root (Phase 4)', () => {
  beforeEach(() => {
    useUIStore.getState().resetUI();
  });

  const sampleEntities: SpatialEntityDefinition[] = [
    {
      id: 'sol',
      name: 'Sol',
      classification: 'star',
      position: [0, 0, 0],
      spectralType: 'G2V',
      multiplicity: 1,
    },
    {
      id: 'proxima',
      name: 'Proxima Centauri',
      classification: 'star',
      position: [1.3, 0.2, -0.5],
      spectralType: 'M5.5V',
      multiplicity: 1,
    },
  ];

  it('renders spatial viewport root with Galactic reference frame and celestial entities', async () => {
    const renderer = await ReactThreeTest.create(
      <SpatialViewport
        frame={GALACTIC_FRAME}
        entities={sampleEntities}
        mode="explore"
      />,
    );

    expect(renderer.scene.findAll((node) => node.props.name === 'spatial-viewport')).toHaveLength(1);
    expect(renderer.scene.findAll((node) => node.props.name === 'cartographic-grid')).toHaveLength(1);
    expect(renderer.scene.findAll((node) => node.props.name === 'celestial-entity-sol')).toHaveLength(1);
    expect(renderer.scene.findAll((node) => node.props.name === 'celestial-entity-proxima')).toHaveLength(1);

    await renderer.unmount();
  });

  it('renders spatial viewport with System frame and Planetary frame configurations', async () => {
    const rendererSystem = await ReactThreeTest.create(
      <SpatialViewport
        frame={SYSTEM_FRAME}
        entities={[sampleEntities[0]]}
        mode="focus"
      />,
    );
    expect(rendererSystem.scene.findAll((node) => node.props.name === 'spatial-viewport')).toHaveLength(1);
    expect(rendererSystem.scene.findAll((node) => node.props.name === 'celestial-entity-sol')).toHaveLength(1);
    await rendererSystem.unmount();

    const rendererPlanetary = await ReactThreeTest.create(
      <SpatialViewport
        frame={PLANETARY_FRAME}
        entities={[]}
        showInstrument={false}
      />,
    );
    expect(rendererPlanetary.scene.findAll((node) => node.props.name === 'spatial-viewport')).toHaveLength(1);
    expect(rendererPlanetary.scene.findAll((node) => node.props.name === 'cartographic-grid')).toHaveLength(0);
    await rendererPlanetary.unmount();
  });

  it('renders custom children (e.g. PlanetBody or bespoke visuals) alongside entities', async () => {
    const renderer = await ReactThreeTest.create(
      <SpatialViewport
        frame={PLANETARY_FRAME}
        entities={[]}
      >
        <mesh name="bespoke-planet-child" />
      </SpatialViewport>,
    );

    expect(renderer.scene.findAll((node) => node.props.name === 'bespoke-planet-child')).toHaveLength(1);
    await renderer.unmount();
  });

  it('supports debugHitarea flag for hit boundary inspection', async () => {
    const renderer = await ReactThreeTest.create(
      <SpatialViewport
        frame={SYSTEM_FRAME}
        entities={[sampleEntities[0]]}
        debugHitarea={true}
      />,
    );

    expect(renderer.scene.findAll((node) => node.props.name === 'celestial-hitarea')).toHaveLength(1);
    await renderer.unmount();
  });

  it('decouples planar footprints from instrument origin: instrument does not render rogue footprint', async () => {
    const renderer = await ReactThreeTest.create(
      <SpatialViewport
        frame={GALACTIC_FRAME}
        entities={sampleEntities}
      />,
    );

    expect(renderer.scene.findAll((node) => node.props.name === 'planar-galactic-grid')).toHaveLength(1);
    expect(renderer.scene.findAll((node) => node.props.name === 'planar-footprint')).toHaveLength(0);
    await renderer.unmount();
  });

  it('evaluates R_fin focal aperture: entities inside aperture are active, entities outside are passive, all interactive', async () => {
    const entitiesWithDistant: SpatialEntityDefinition[] = [
      {
        id: 'sol-local',
        name: 'Sol',
        classification: 'star',
        position: [0, 0, 0],
      },
      {
        id: 'distant-star',
        name: 'Distant Star',
        classification: 'star',
        position: [50, 0, 0],
      },
    ];

    const renderer = await ReactThreeTest.create(
      <SpatialViewport
        frame={GALACTIC_FRAME}
        entities={entitiesWithDistant}
      />,
    );

    expect(renderer.scene.findAll((node) => node.props.name === 'celestial-entity-sol-local')).toHaveLength(1);
    expect(renderer.scene.findAll((node) => node.props.name === 'reticle-sol-local')).toHaveLength(1);
    expect(renderer.scene.findAll((node) => node.props.name === 'celestial-entity-distant-star')).toHaveLength(1);
    expect(renderer.scene.findAll((node) => node.props.name === 'reticle-distant-star')).toHaveLength(0);
    expect(renderer.scene.findAll((node) => node.props.name === 'hitarea-billboard-sol-local')).toHaveLength(1);
    expect(renderer.scene.findAll((node) => node.props.name === 'hitarea-billboard-distant-star')).toHaveLength(0);

    await renderer.unmount();
  });

  it('renders drop stalk and ground footprint attached to star upon selection', async () => {
    const selectedStar: SpatialEntityDefinition[] = [
      {
        id: 'sirius',
        name: 'Sirius',
        classification: 'star',
        position: [-1.61, -2.13, -0.55],
      },
    ];

    const renderer = await ReactThreeTest.create(
      <SpatialViewport
        frame={GALACTIC_FRAME}
        entities={selectedStar}
        initialSelectedId="sirius"
      />,
    );

    expect(renderer.scene.findAll((node) => node.props.name === 'drop-stalk-sirius')).toHaveLength(1);
    expect(renderer.scene.findAll((node) => node.props.name === 'stalk-line')).toHaveLength(1);
    expect(renderer.scene.findAll((node) => node.props.name === 'stalk-footprint')).toHaveLength(1);

    await renderer.unmount();
  });

  it('accepts double-click and focus transition configuration props cleanly', async () => {
    const onDblClick = vi.fn();
    const renderer = await ReactThreeTest.create(
      <SpatialViewport
        frame={GALACTIC_FRAME}
        entities={sampleEntities}
        enableFocusTransition={true}
        focusTransitionDuration={0.6}
        onDoubleClick={onDblClick}
      />,
    );

    expect(renderer.scene.findAll((node) => node.props.name === 'spatial-viewport')).toHaveLength(1);
    expect(renderer.scene.findAll((node) => node.props.name === 'celestial-entity-sol')).toHaveLength(1);

    await renderer.unmount();
  });

  it('accepts onFocusChange callback and outerStore prop for cross-store focus/selection synchronisation', async () => {
    const onFocusChange = vi.fn();
    const onSelect = vi.fn();
    const renderer = await ReactThreeTest.create(
      <SpatialViewport
        frame={GALACTIC_FRAME}
        entities={sampleEntities}
        onFocusChange={onFocusChange}
        onSelect={onSelect}
      />,
    );

    expect(renderer.scene.findAll((node) => node.props.name === 'spatial-viewport')).toHaveLength(1);

    await renderer.unmount();
  });
});
