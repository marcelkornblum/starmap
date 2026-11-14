// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useEffect } from 'react';
import { render } from '@testing-library/react';
import * as THREE from 'three';
import { EntityLabel } from '../src/components/canvas/entity/EntityLabel';
import { useOcclusionManager } from '../src/components/canvas/entity/SpatialEntityContext';
import { SpatialEntityProvider } from '../src/components/canvas/entity/SpatialEntityProvider';
import { createSpatialEntityStore } from '../src/components/canvas/entity/SpatialEntityStore';
import { SpatialFrameProvider, GALACTIC_FRAME } from '../src/components/canvas/instrument';
import type { SafeHtmlProps } from '../src/components/canvas/SafeHtml';
import type { CelestialFootprint } from '../src/components/canvas/cartography/celestialOcclusionRegistry';

const mockSafeHtmlProps: SafeHtmlProps[] = [];

vi.mock('../src/components/canvas/SafeHtml', () => ({
  SafeHtml: (props: SafeHtmlProps) => {
    mockSafeHtmlProps.push(props);
    return (
      <div data-testid="mock-safe-html" data-center={props.center === true ? 'true' : 'false'}>
        {props.children}
      </div>
    );
  },
  SafeHtmlPortalOutlet: () => null,
}));

vi.mock('@react-three/fiber', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@react-three/fiber')>();
  return {
    ...actual,
    useFrame: vi.fn(),
    useThree: vi.fn(() => ({
      camera: new THREE.PerspectiveCamera(45, 1, 0.1, 1000),
      size: { width: 1440, height: 900 },
      gl: { domElement: document.createElement('canvas') },
    })),
  };
});

describe('EntityLabel Primitive (Layer 3: Typographic Label)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSafeHtmlProps.length = 0;
  });

  it('renders with center={false} on SafeHtml to prevent label centering over reticle facet', () => {
    const store = createSpatialEntityStore();

    render(
      <SpatialFrameProvider frame={GALACTIC_FRAME}>
        <SpatialEntityProvider store={store}>
          <EntityLabel
            id="star-40-eri"
            name="40 Eridani"
            spectralType="K1V · dM4.5e · DA4"
            state="selected"
            position={[0, 0, 0]}
          />
        </SpatialEntityProvider>
      </SpatialFrameProvider>,
    );

    expect(mockSafeHtmlProps.length).toBeGreaterThan(0);
    const lastProps = mockSafeHtmlProps[mockSafeHtmlProps.length - 1];
    expect(lastProps.center).toBe(false);
  });

  it('calculates screen activeBox starting at anchorX and anchorY with full height h', async () => {
    const store = createSpatialEntityStore();
    const { useFrame } = vi.mocked(await import('@react-three/fiber'));

    let occlusionMgr: ReturnType<typeof useOcclusionManager> | null = null;
    const TestConsumer = () => {
      const mgr = useOcclusionManager();
      useEffect(() => {
        occlusionMgr = mgr;
      }, [mgr]);
      return (
        <EntityLabel
          id="star-test"
          name="40 Eridani"
          spectralType="K1V"
          state="selected"
          position={[0, 0, 0]}
        />
      );
    };

    render(
      <SpatialFrameProvider frame={GALACTIC_FRAME}>
        <SpatialEntityProvider store={store}>
          <TestConsumer />
        </SpatialEntityProvider>
      </SpatialFrameProvider>,
    );

    expect(occlusionMgr).not.toBeNull();
    const fp: CelestialFootprint = {
      id: 'star-test',
      name: '40 Eridani',
      state: 'selected',
      screenX: 200,
      screenY: 300,
      reticleRadius: 20,
      starRadius: 0.035,
      hasReticle: true,
      visible: true,
      updatedAt: 0,
    };
    occlusionMgr!.register(fp);

    // Trigger useFrame callback for EntityLabel
    const calls = vi.mocked(useFrame).mock.calls;
    const labelFrameCall = calls[calls.length - 1];
    expect(labelFrameCall).toBeDefined();

    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000);
    camera.position.set(0, 0, 10);
    labelFrameCall![0]({ camera, size: { width: 1440, height: 900 } } as any, 0.016);

    const updatedFp = occlusionMgr!.getFootprint('star-test');
    expect(updatedFp?.labelBox).toBeDefined();
    const box = updatedFp!.labelBox!;

    const expectedAnchorX = 200 + 1.15 * 20; // 223
    const expectedAnchorY = 300 - 0.75 * 20; // 285

    expect(box.left).toBeCloseTo(expectedAnchorX);
    expect(box.top).toBeCloseTo(expectedAnchorY);
    expect(box.bottom).toBeGreaterThan(box.top);
    expect(box.right).toBeGreaterThan(box.left);
  });

  it('applies Target Immunity to focused and selected entity labels, setting data-occluded="false"', async () => {
    const store = createSpatialEntityStore();
    const { useFrame } = vi.mocked(await import('@react-three/fiber'));

    const { getByTestId } = render(
      <SpatialFrameProvider frame={GALACTIC_FRAME}>
        <SpatialEntityProvider store={store}>
          <EntityLabel
            id="star-immune"
            name="Tau Ceti"
            spectralType="G8.5V"
            state="focused"
            position={[0, 0, 0]}
          />
        </SpatialEntityProvider>
      </SpatialFrameProvider>,
    );

    const innerLabel = getByTestId('entity-label-inner-star-immune');
    expect(innerLabel.getAttribute('data-occluded')).toBe('false');

    const calls = vi.mocked(useFrame).mock.calls;
    const labelFrameCall = calls[calls.length - 1];
    expect(labelFrameCall).toBeDefined();

    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000);
    camera.position.set(0, 0, 10);
    labelFrameCall![0]({ camera, size: { width: 1440, height: 900 } } as any, 0.016);

    expect(innerLabel.getAttribute('data-occluded')).toBe('false');
  });

  it('deduplicates billboard transform syncs avoiding redundant updateMatrixWorld calls in the same frame or on stationary frames', async () => {
    const store = createSpatialEntityStore();
    const updateMatrixSpy = vi.spyOn(THREE.Group.prototype, 'updateMatrixWorld');
    const { useFrame } = vi.mocked(await import('@react-three/fiber'));

    render(
      <SpatialFrameProvider frame={GALACTIC_FRAME}>
        <SpatialEntityProvider store={store}>
          <EntityLabel
            id="star-dedup"
            name="Sirius"
            spectralType="A1V"
            state="active"
            position={[10, 20, 30]}
          />
        </SpatialEntityProvider>
      </SpatialFrameProvider>,
    );

    const calls = vi.mocked(useFrame).mock.calls;
    const labelFrameCall = calls[calls.length - 1];
    expect(labelFrameCall).toBeDefined();

    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000);
    camera.position.set(0, 0, 10);
    camera.quaternion.set(0, 0, 0, 1);

    updateMatrixSpy.mockClear();

    // Call 1: Frame 1
    labelFrameCall![0]({ camera, size: { width: 1440, height: 900 } } as any, 0.016);
    const initialCallCount = updateMatrixSpy.mock.calls.length;
    expect(initialCallCount).toBe(1);

    // Also simulate handleCalculatePosition from SafeHtml on same frame
    const lastSafeHtmlProps = mockSafeHtmlProps[mockSafeHtmlProps.length - 1];
    const dummyObj = new THREE.Object3D();
    lastSafeHtmlProps.calculatePosition?.(dummyObj, camera, { width: 1440, height: 900 });

    // Should NOT have called updateMatrixWorld again!
    expect(updateMatrixSpy.mock.calls.length).toBe(1);

    // Call 2: Stationary next frame should also NOT call updateMatrixWorld
    updateMatrixSpy.mockClear();
    labelFrameCall![0]({ camera, size: { width: 1440, height: 900 } } as any, 0.016);
    expect(updateMatrixSpy).not.toHaveBeenCalled();

    updateMatrixSpy.mockRestore();
  });
});
