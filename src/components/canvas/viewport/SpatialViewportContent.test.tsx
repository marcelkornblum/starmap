import { describe, it, expect } from 'vitest';
import ReactThreeTest from '@react-three/test-renderer';
import { SpatialViewportContent } from './SpatialViewportContent';
import { GALACTIC_FRAME } from '../../../config/referenceFrames';
import { SpatialFrameProvider } from '../instrument/SpatialFrameProvider';
import { SpatialEntityProvider, createSpatialEntityStore } from '../entity';

describe('SpatialViewportContent Component', () => {
  it('renders viewport group with entities', async () => {
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
            ]}
          />
        </SpatialEntityProvider>
      </SpatialFrameProvider>,
    );

    expect(renderer.scene.findAll((node) => node.props.name === 'spatial-viewport')).toHaveLength(1);
    expect(renderer.scene.findAll((node) => node.props.name === 'celestial-entity-sol')).toHaveLength(1);
    await renderer.unmount();
  });
});
