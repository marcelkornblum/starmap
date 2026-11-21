import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import ReactThreeTest from '@react-three/test-renderer';
import { SpatialViewportContent } from './SpatialViewportContent';
import { GALACTIC_FRAME } from '../../../config/referenceFrames';
import { SpatialFrameProvider } from '../instrument/SpatialFrameProvider';
import { SpatialEntityProvider, createSpatialEntityStore } from '../entity';

describe('SpatialViewportContent Component', () => {
  it('renders viewport group with entities and batches entity dots into EntityDotsBatch', async () => {
    const store = createSpatialEntityStore();
    const renderer = await ReactThreeTest.create(
      <SpatialFrameProvider frame={GALACTIC_FRAME}>
        <SpatialEntityProvider store={store}>
          <SpatialViewportContent
            entities={[
              {
                id: 'sol',
                name: 'Sol',
                classification: 'star',
                position: [0, 0, 0],
              },
              {
                id: 'alpha-cen',
                name: 'Alpha Centauri',
                classification: 'star',
                position: [1.3, 0, 0],
              },
            ]}
          />
        </SpatialEntityProvider>
      </SpatialFrameProvider>,
    );

    expect(renderer.scene.findAll((node) => node.props.name === 'spatial-viewport')).toHaveLength(1);
    expect(renderer.scene.findAll((node) => node.props.name === 'celestial-entity-sol')).toHaveLength(1);
    expect(renderer.scene.findAll((node) => node.props.name === 'celestial-entity-alpha-cen')).toHaveLength(1);
    expect(renderer.scene.findAll((node) => node.props.name === 'entity-dots-batch')).toHaveLength(1);
    expect(renderer.scene.findAll((node) => node.props.name === 'celestial-point-dot')).toHaveLength(0);

    await renderer.advanceFrames(1, 0.016);
    const batchPoints = renderer.scene.find((node) => node.props.name === 'entity-dots-batch').instance as THREE.Points;
    expect(batchPoints.geometry.drawRange.count).toBe(2);

    await renderer.unmount();
  });
});
