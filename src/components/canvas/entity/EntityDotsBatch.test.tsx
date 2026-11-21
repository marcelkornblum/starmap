import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as THREE from 'three';
import ReactThreeTest from '@react-three/test-renderer';
import { EntityDotsBatch } from './EntityDotsBatch';
import {
  EntityDotsBatchContext,
  createEntityDotsBatchRegistry,
  type EntityDotRegistration,
} from './entityDotsBatchContext';
import { NOOP_RAYCAST } from '../engineConfig';
import { useThreeTokenStore } from '../../../stores/useThreeTokenStore';

const { mockInvalidate, wrappedInvalidateCache } = vi.hoisted(() => ({
  mockInvalidate: vi.fn(),
  wrappedInvalidateCache: new WeakMap<
    (frames?: number) => void,
    (frames?: number) => void
  >(),
}));

vi.mock('@react-three/fiber', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@react-three/fiber')>();
  return {
    ...actual,
    useThree: ((selector?: (state: unknown) => unknown) => {
      const realInvalidate = actual.useThree((s) => s.invalidate);
      const selected: unknown = actual.useThree(
        (selector ?? ((s: unknown) => s)) as Parameters<typeof actual.useThree>[0],
      );
      if (selected === realInvalidate) {
        let wrapped = wrappedInvalidateCache.get(realInvalidate);
        if (!wrapped) {
          wrapped = (frames?: number) => {
            mockInvalidate(frames);
            return realInvalidate(frames);
          };
          wrappedInvalidateCache.set(realInvalidate, wrapped);
        }
        return wrapped;
      }
      return selected;
    }) as typeof actual.useThree,
  };
});

function createGroupRef(x = 0, y = 0, z = 0, parentVisible = true): React.RefObject<THREE.Group | null> {
  const parent = new THREE.Group();
  parent.visible = parentVisible;
  const group = new THREE.Group();
  group.position.set(x, y, z);
  parent.add(group);
  return { current: group };
}

describe('EntityDotsBatch', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useThreeTokenStore.getState().setTokens({
      ...useThreeTokenStore.getState().tokens,
      reticleBracketColor: '#ffffff',
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('supports registry register, unregister, markDirty, subscribeVersion, and iterable entries', () => {
    const registry = createEntityDotsBatchRegistry();
    const listener = vi.fn();
    const unsub = registry.subscribeVersion(listener);

    expect(registry.version).toBe(0);
    expect(registry.size).toBe(0);

    const regA: EntityDotRegistration = {
      id: 'star-a',
      groupRef: createGroupRef(1, 2, 3),
      pixelSize: 5,
    };
    registry.register(regA);
    expect(registry.version).toBe(1);
    expect(registry.size).toBe(1);
    expect(listener).toHaveBeenCalledTimes(1);
    expect(Array.from(registry)).toEqual([regA]);

    registry.markDirty();
    expect(registry.version).toBe(2);
    expect(listener).toHaveBeenCalledTimes(2);

    registry.unregister('star-a');
    expect(registry.version).toBe(3);
    expect(registry.size).toBe(0);
    expect(listener).toHaveBeenCalledTimes(3);

    // Unregistering missing id is a no-op
    registry.unregister('missing');
    expect(registry.version).toBe(3);

    unsub();
    registry.markDirty();
    expect(listener).toHaveBeenCalledTimes(3);
  });

  it('batches N registered entities into a single <points> with NOOP_RAYCAST and updates drawRange', async () => {
    const registry = createEntityDotsBatchRegistry();

    const renderer = await ReactThreeTest.create(
      <EntityDotsBatchContext.Provider value={registry}>
        <EntityDotsBatch />
      </EntityDotsBatchContext.Provider>,
    );

    const pointsNodes = renderer.scene.findAll((node) => node.props.name === 'entity-dots-batch');
    expect(pointsNodes).toHaveLength(1);
    const pointsNode = pointsNodes[0];
    expect(pointsNode.type).toBe('Points');
    expect(pointsNode.props.raycast).toBe(NOOP_RAYCAST);
    expect(pointsNode.props.frustumCulled).toBe(false);

    const pointsInstance = pointsNode.instance as THREE.Points;
    const geom = pointsInstance.geometry;
    expect(geom.drawRange.count).toBe(0);

    mockInvalidate.mockClear();
    registry.register({
      id: 'sol',
      groupRef: createGroupRef(),
      worldPosition: [1, 2, 3],
      pixelSize: 5,
    });
    registry.register({
      id: 'sirius',
      groupRef: createGroupRef(),
      worldPosition: new THREE.Vector3(-4, 5, -6),
      pixelSize: 7,
      color: '#ff0000',
    });
    expect(mockInvalidate).toHaveBeenCalled();

    await renderer.advanceFrames(1, 0.016);

    expect(geom.drawRange.count).toBe(2);
    const posAttr = geom.getAttribute('position') as THREE.BufferAttribute;
    const sizeAttr = geom.getAttribute('aPixelSize') as THREE.BufferAttribute;
    const colorAttr = geom.getAttribute('aColor') as THREE.BufferAttribute;
    const alphaAttr = geom.getAttribute('aAlpha') as THREE.BufferAttribute;

    expect(posAttr.getX(0)).toBeCloseTo(1);
    expect(posAttr.getY(0)).toBeCloseTo(2);
    expect(posAttr.getZ(0)).toBeCloseTo(3);
    expect(posAttr.getX(1)).toBeCloseTo(-4);
    expect(posAttr.getY(1)).toBeCloseTo(5);
    expect(posAttr.getZ(1)).toBeCloseTo(-6);

    expect(sizeAttr.getX(0)).toBe(5);
    expect(sizeAttr.getX(1)).toBe(7);

    const expectedDefault = new THREE.Color('#ffffff');
    const expectedRed = new THREE.Color('#ff0000');
    expect(colorAttr.getX(0)).toBeCloseTo(expectedDefault.r);
    expect(colorAttr.getY(0)).toBeCloseTo(expectedDefault.g);
    expect(colorAttr.getZ(0)).toBeCloseTo(expectedDefault.b);
    expect(colorAttr.getX(1)).toBeCloseTo(expectedRed.r);
    expect(colorAttr.getY(1)).toBeCloseTo(expectedRed.g);
    expect(colorAttr.getZ(1)).toBeCloseTo(expectedRed.b);

    expect(alphaAttr.getX(0)).toBe(1);
    expect(alphaAttr.getX(1)).toBe(1);

    mockInvalidate.mockClear();
    registry.unregister('sol');
    expect(mockInvalidate).toHaveBeenCalled();

    await renderer.advanceFrames(1, 0.016);
    expect(geom.drawRange.count).toBe(1);
    expect(posAttr.getX(0)).toBeCloseTo(-4);

    await renderer.unmount();
  });

  it('reads groupRef.getWorldPosition when worldPosition is omitted and respects nodeAlphaRef & parent.visible', async () => {
    const registry = createEntityDotsBatchRegistry();
    const alphaRef = { current: 0.42 };
    const groupRef = createGroupRef(10, 20, 30, true);

    registry.register({
      id: 'planet-1',
      groupRef,
      pixelSize: 6,
      color: new THREE.Color('#00ff88'),
      nodeAlphaRef: alphaRef,
    });

    const renderer = await ReactThreeTest.create(
      <EntityDotsBatchContext.Provider value={registry}>
        <EntityDotsBatch />
      </EntityDotsBatchContext.Provider>,
    );

    const pointsInstance = renderer.scene.find((node) => node.props.name === 'entity-dots-batch').instance as THREE.Points;
    const geom = pointsInstance.geometry;

    await renderer.advanceFrames(1, 0.016);

    const posAttr = geom.getAttribute('position') as THREE.BufferAttribute;
    const alphaAttr = geom.getAttribute('aAlpha') as THREE.BufferAttribute;
    expect(posAttr.getX(0)).toBeCloseTo(10);
    expect(posAttr.getY(0)).toBeCloseTo(20);
    expect(posAttr.getZ(0)).toBeCloseTo(30);
    expect(alphaAttr.getX(0)).toBeCloseTo(0.42);

    // Update nodeAlphaRef dynamically
    alphaRef.current = 0.85;
    await renderer.advanceFrames(1, 0.016);
    expect(alphaAttr.getX(0)).toBeCloseTo(0.85);

    // Parent group hidden by BodyCrossfadeTracker -> alpha 0
    if (groupRef.current?.parent) {
      groupRef.current.parent.visible = false;
    }
    await renderer.advanceFrames(1, 0.016);
    expect(alphaAttr.getX(0)).toBe(0);

    await renderer.unmount();
  });

  it('updates uPixelRatio uniform from gl.getPixelRatio() and disposes geometry & material on unmount', async () => {
    const registry = createEntityDotsBatchRegistry();
    const renderer = await ReactThreeTest.create(
      <EntityDotsBatchContext.Provider value={registry}>
        <EntityDotsBatch />
      </EntityDotsBatchContext.Provider>,
    );

    const pointsInstance = renderer.scene.find((node) => node.props.name === 'entity-dots-batch').instance as THREE.Points;
    const geom = pointsInstance.geometry;
    const mat = pointsInstance.material as THREE.ShaderMaterial;

    const geomDisposeSpy = vi.spyOn(geom, 'dispose');
    const matDisposeSpy = vi.spyOn(mat, 'dispose');

    await renderer.advanceFrames(1, 0.016);
    expect(mat.uniforms.uPixelRatio.value).toBeGreaterThan(0);

    await renderer.unmount();
    expect(geomDisposeSpy).toHaveBeenCalledTimes(1);
    expect(matDisposeSpy).toHaveBeenCalledTimes(1);
  });

  it('grows preallocated typed buffers cleanly when exceeding initial capacity (> 128 entities)', async () => {
    const registry = createEntityDotsBatchRegistry();
    for (let i = 0; i < 150; i++) {
      registry.register({
        id: `star-${i}`,
        groupRef: createGroupRef(),
        worldPosition: [i, 0, 0],
        pixelSize: 5,
      });
    }

    const renderer = await ReactThreeTest.create(
      <EntityDotsBatchContext.Provider value={registry}>
        <EntityDotsBatch />
      </EntityDotsBatchContext.Provider>,
    );

    await renderer.advanceFrames(1, 0.016);

    const pointsInstance = renderer.scene.find((node) => node.props.name === 'entity-dots-batch').instance as THREE.Points;
    const geom = pointsInstance.geometry;
    expect(geom.drawRange.count).toBe(150);
    const posAttr = geom.getAttribute('position') as THREE.BufferAttribute;
    expect(posAttr.count).toBeGreaterThanOrEqual(150);
    expect(posAttr.getX(149)).toBeCloseTo(149);

    await renderer.unmount();
  });
});
