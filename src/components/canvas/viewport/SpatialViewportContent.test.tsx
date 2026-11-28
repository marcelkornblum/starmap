import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as THREE from 'three';
import ReactThreeTest from '@react-three/test-renderer';
import { SpatialViewportContent } from './SpatialViewportContent';
import { GALACTIC_FRAME } from '../../../config/referenceFrames';
import { SpatialFrameProvider } from '../instrument/SpatialFrameProvider';
import { SpatialEntityProvider, createSpatialEntityStore } from '../entity';
import { resetEntityPointersForTesting } from '../entity/bodyMarkerHelpers';

const { domElementRef, patchedGlCache } = vi.hoisted(() => ({
  domElementRef: { current: undefined as HTMLElement | undefined },
  patchedGlCache: new WeakMap<object, object>(),
}));

vi.mock('@react-three/fiber', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@react-three/fiber')>();
  return {
    ...actual,
    useThree: ((selector?: (state: unknown) => unknown) => {
      const selected: unknown = actual.useThree(
        (selector ?? ((s: unknown) => s)) as Parameters<typeof actual.useThree>[0],
      );
      if (domElementRef.current && selected && typeof selected === 'object' && 'render' in (selected as object)) {
        let patched = patchedGlCache.get(selected as object);
        if (!patched || (patched as { domElement?: HTMLElement }).domElement !== domElementRef.current) {
          patched = { ...(selected as object), domElement: domElementRef.current };
          patchedGlCache.set(selected as object, patched);
        }
        return patched;
      }
      return selected;
    }) as typeof actual.useThree,
  };
});

function createDomPointerEvent(
  type: string,
  opts: { pointerId: number; pointerType?: string; clientX: number; clientY: number },
): PointerEvent {
  if (typeof PointerEvent === 'function') {
    const ev = new PointerEvent(type, {
      pointerId: opts.pointerId,
      pointerType: opts.pointerType ?? 'touch',
      clientX: opts.clientX,
      clientY: opts.clientY,
      bubbles: true,
      cancelable: true,
    });
    if (ev.pointerId !== opts.pointerId) {
      Object.defineProperty(ev, 'pointerId', { value: opts.pointerId, configurable: true });
    }
    if (ev.pointerType !== (opts.pointerType ?? 'touch')) {
      Object.defineProperty(ev, 'pointerType', { value: opts.pointerType ?? 'touch', configurable: true });
    }
    return ev;
  }
  const ev = new MouseEvent(type, {
    clientX: opts.clientX,
    clientY: opts.clientY,
    bubbles: true,
    cancelable: true,
  }) as unknown as PointerEvent;
  Object.defineProperty(ev, 'pointerId', { value: opts.pointerId, configurable: true });
  Object.defineProperty(ev, 'pointerType', { value: opts.pointerType ?? 'touch', configurable: true });
  return ev;
}

describe('SpatialViewportContent Component', () => {
  beforeEach(() => {
    domElementRef.current = undefined;
    resetEntityPointersForTesting();
  });

  afterEach(() => {
    domElementRef.current = undefined;
    resetEntityPointersForTesting();
    vi.restoreAllMocks();
  });
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

  it('handles 8px-12px DOM touch tap misses once, suppresses trailing click, and ignores drags, pinches, and entity hits', async () => {
    const canvas = document.createElement('canvas');
    document.body.appendChild(canvas);
    domElementRef.current = canvas;
    const store = createSpatialEntityStore({ focusedId: 'star-a' });
    const onTouchPointerMissed = vi.fn(() => true);

    try {
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
              onTouchPointerMissed={onTouchPointerMissed}
            />
          </SpatialEntityProvider>
        </SpatialFrameProvider>,
      );

      const viewportGroup = renderer.scene.find((node) => node.props.name === 'spatial-viewport');
      const hitarea = renderer.scene.find((node) => node.props.name === 'celestial-hitarea');

      // 1. 10px touch tap on empty canvas invokes onTouchPointerMissed once
      canvas.dispatchEvent(createDomPointerEvent('pointerdown', { pointerId: 1, clientX: 100, clientY: 100 }));
      canvas.dispatchEvent(createDomPointerEvent('pointerup', { pointerId: 1, clientX: 110, clientY: 100 }));
      expect(onTouchPointerMissed).toHaveBeenCalledTimes(1);

      // Trailing R3F click miss must not double-fire
      await renderer.fireEvent(viewportGroup, 'pointerMissed', { type: 'click', clientX: 101, clientY: 100 });
      expect(onTouchPointerMissed).toHaveBeenCalledTimes(1);

      // 2. 20px touch drag (> 14px slop) does not invoke onTouchPointerMissed
      canvas.dispatchEvent(createDomPointerEvent('pointerdown', { pointerId: 2, clientX: 100, clientY: 100 }));
      canvas.dispatchEvent(createDomPointerEvent('pointerup', { pointerId: 2, clientX: 120, clientY: 100 }));
      expect(onTouchPointerMissed).toHaveBeenCalledTimes(1);

      // 3. 2-finger pinch does not invoke onTouchPointerMissed
      canvas.dispatchEvent(createDomPointerEvent('pointerdown', { pointerId: 3, clientX: 100, clientY: 100 }));
      canvas.dispatchEvent(createDomPointerEvent('pointerdown', { pointerId: 4, clientX: 150, clientY: 100 }));
      canvas.dispatchEvent(createDomPointerEvent('pointerup', { pointerId: 4, clientX: 150, clientY: 100 }));
      canvas.dispatchEvent(createDomPointerEvent('pointerup', { pointerId: 3, clientX: 102, clientY: 100 }));
      expect(onTouchPointerMissed).toHaveBeenCalledTimes(1);

      // 4. Touch tap that hits a BodyMarker entity does not invoke onTouchPointerMissed
      canvas.dispatchEvent(createDomPointerEvent('pointerdown', { pointerId: 5, clientX: 200, clientY: 200 }));
      await renderer.fireEvent(hitarea, 'pointerDown', {
        pointerId: 5,
        pointerType: 'touch',
        clientX: 200,
        clientY: 200,
        stopPropagation: vi.fn(),
      });
      canvas.dispatchEvent(createDomPointerEvent('pointerup', { pointerId: 5, clientX: 205, clientY: 200 }));
      expect(onTouchPointerMissed).toHaveBeenCalledTimes(1);

      await renderer.unmount();
    } finally {
      canvas.remove();
    }
  });
});
