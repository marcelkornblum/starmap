import { describe, it, expect, vi } from 'vitest';
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

  it('threads onTouchPointerMissed through spatial-viewport onPointerMissed before clearing focus', async () => {
    const store = createSpatialEntityStore({ focusedId: 'star-a' });
    const onFocusChange = vi.fn();
    const onTouchPointerMissed = vi
      .fn<() => boolean>()
      .mockReturnValueOnce(true)
      .mockReturnValueOnce(false);

    const renderer = await ReactThreeTest.create(
      <SpatialFrameProvider frame={GALACTIC_FRAME}>
        <SpatialEntityProvider store={store}>
          <SpatialViewportContent
            entities={[
              {
                id: 'star-a',
                name: 'Star A',
                classification: 'star',
                position: [0, 0, 0],
              },
            ]}
            onFocusChange={onFocusChange}
            onTouchPointerMissed={onTouchPointerMissed}
          />
        </SpatialEntityProvider>
      </SpatialFrameProvider>,
    );

    const viewportGroup = renderer.scene.find((node) => node.props.name === 'spatial-viewport');

    // First touch miss: onTouchPointerMissed returns true -> preserves focus
    await renderer.fireEvent(viewportGroup, 'pointerMissed', { pointerType: 'touch' });
    expect(onTouchPointerMissed).toHaveBeenCalledTimes(1);
    expect(store.getState().focusedId).toBe('star-a');
    expect(onFocusChange).not.toHaveBeenCalled();

    // Second touch miss: onTouchPointerMissed returns false -> clears focus
    await renderer.fireEvent(viewportGroup, 'pointerMissed', { pointerType: 'touch' });
    expect(onTouchPointerMissed).toHaveBeenCalledTimes(2);
    expect(store.getState().focusedId).toBeNull();
    expect(onFocusChange).toHaveBeenCalledWith(null);

    await renderer.unmount();
  });
});
