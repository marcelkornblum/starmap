import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as THREE from 'three';
import ReactThreeTest from '@react-three/test-renderer';
import { CoordinateFins } from './CoordinateFins';
import { SpatialFrameProvider, GALACTIC_FRAME } from './index';
import { NOOP_RAYCAST } from '../engineConfig';
import { useThreeTokenStore } from '../../../stores/useThreeTokenStore';
import { useSettingsStore } from '../../../stores/useSettingsStore';
import type { ReferenceFrame } from '../../../types/spatial';

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

describe('CoordinateFins Primitive', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useThreeTokenStore.getState().resetTokens();
    useSettingsStore.getState().resetSettings();
  });

  afterEach(() => {
    useThreeTokenStore.getState().resetTokens();
    useSettingsStore.getState().resetSettings();
  });

  it('consolidates into 3 plane groups and <= 9 ShaderMaterial LineSegments with matrixAutoUpdate=false', async () => {
    const renderer = await ReactThreeTest.create(
      <SpatialFrameProvider frame={GALACTIC_FRAME}>
        <CoordinateFins rings={[2.5, 5, 10]} />
      </SpatialFrameProvider>,
    );

    const rootGroup = renderer.scene.findByProps({ name: 'travelling-fins' });
    expect(rootGroup).toBeDefined();
    expect((rootGroup.instance as THREE.Group).matrixAutoUpdate).toBe(true);

    for (const plane of ['xy', 'xz', 'yz']) {
      const planeGroup = renderer.scene.findByProps({ name: `fin-${plane}` });
      expect(planeGroup).toBeDefined();
      expect((planeGroup.instance as THREE.Group).matrixAutoUpdate).toBe(false);

      expect(renderer.scene.findByProps({ name: `${plane}-perimeter` })).toBeDefined();
      expect(renderer.scene.findByProps({ name: `${plane}-ticks` })).toBeDefined();
      expect(renderer.scene.findByProps({ name: `${plane}-arcs` })).toBeDefined();
    }

    const lineNodes = renderer.scene.findAll((node) => node.instance instanceof THREE.LineSegments);
    expect(lineNodes).toHaveLength(9);

    const uniqueMaterials = new Set<THREE.Material>();
    for (const node of lineNodes) {
      const instance = node.instance as THREE.LineSegments;
      expect(instance.matrixAutoUpdate).toBe(false);
      expect(node.props.raycast).toBe(NOOP_RAYCAST);
      expect(instance.material).toBeInstanceOf(THREE.ShaderMaterial);
      uniqueMaterials.add(instance.material as THREE.Material);
    }
    expect(uniqueMaterials.size).toBe(9);

    await renderer.unmount();
  });

  it('renders <= 6 LineSegments and ShaderMaterials when ticks or rangeArcs are disabled', async () => {
    const noTicksFrame: ReferenceFrame = {
      ...GALACTIC_FRAME,
      coordinateFins: { ...GALACTIC_FRAME.coordinateFins, ticks: false },
    };
    const noTicksRenderer = await ReactThreeTest.create(
      <SpatialFrameProvider frame={noTicksFrame}>
        <CoordinateFins rings={[5]} />
      </SpatialFrameProvider>,
    );
    const noTicksLines = noTicksRenderer.scene.findAll((node) => node.instance instanceof THREE.LineSegments);
    expect(noTicksLines).toHaveLength(6);
    expect(new Set(noTicksLines.map((n) => (n.instance as THREE.LineSegments).material)).size).toBe(6);
    await noTicksRenderer.unmount();

    const noArcsFrame: ReferenceFrame = {
      ...GALACTIC_FRAME,
      coordinateFins: { ...GALACTIC_FRAME.coordinateFins, rangeArcs: false },
    };
    const noArcsRenderer = await ReactThreeTest.create(
      <SpatialFrameProvider frame={noArcsFrame}>
        <CoordinateFins rings={[5]} />
      </SpatialFrameProvider>,
    );
    const noArcsLines = noArcsRenderer.scene.findAll((node) => node.instance instanceof THREE.LineSegments);
    expect(noArcsLines).toHaveLength(6);
    expect(new Set(noArcsLines.map((n) => (n.instance as THREE.LineSegments).material)).size).toBe(6);
    await noArcsRenderer.unmount();
  });

  it('respects enabled=false toggle', async () => {
    const renderer = await ReactThreeTest.create(
      <SpatialFrameProvider frame={GALACTIC_FRAME}>
        <CoordinateFins enabled={false} />
      </SpatialFrameProvider>,
    );

    const fins = renderer.scene.findAll((node) => node.props.name === 'travelling-fins');
    expect(fins).toHaveLength(0);
    expect(renderer.scene.findAll((node) => node.instance instanceof THREE.LineSegments)).toHaveLength(0);

    await renderer.unmount();
  });

  it('performs zero allocations (color.copy / Vector3) inside useFrame (AUD-107)', async () => {
    const renderer = await ReactThreeTest.create(
      <SpatialFrameProvider frame={GALACTIC_FRAME}>
        <CoordinateFins enabled={true} />
      </SpatialFrameProvider>,
    );

    await renderer.advanceFrames(1, 0.016);

    const colorCopySpy = vi.spyOn(THREE.Color.prototype, 'copy');
    const colorCloneSpy = vi.spyOn(THREE.Color.prototype, 'clone');
    const vec3CloneSpy = vi.spyOn(THREE.Vector3.prototype, 'clone');
    const vec4CloneSpy = vi.spyOn(THREE.Vector4.prototype, 'clone');

    await renderer.advanceFrames(1, 0.016);

    expect(colorCopySpy).not.toHaveBeenCalled();
    expect(colorCloneSpy).not.toHaveBeenCalled();
    expect(vec3CloneSpy).not.toHaveBeenCalled();
    expect(vec4CloneSpy).not.toHaveBeenCalled();
    colorCopySpy.mockRestore();
    colorCloneSpy.mockRestore();
    vec3CloneSpy.mockRestore();
    vec4CloneSpy.mockRestore();

    await renderer.unmount();
  });

  it('updates shader uniforms per frame for fixed rings, zoom-adaptive rings, and plane weights', async () => {
    useSettingsStore.getState().setEnableOrthographicProjection(true);

    // Fixed rings with explicit majorRingIndex
    const fixedRenderer = await ReactThreeTest.create(
      <SpatialFrameProvider frame={GALACTIC_FRAME}>
        <CoordinateFins rings={[2.5, 5, 10]} majorRingIndex={1} />
      </SpatialFrameProvider>,
    );
    await fixedRenderer.advanceFrames(2, 0.016);

    const xyPerimLine = fixedRenderer.scene.findByProps({ name: 'xy-perimeter' }).instance as THREE.LineSegments;
    const xzPerimLine = fixedRenderer.scene.findByProps({ name: 'xz-perimeter' }).instance as THREE.LineSegments;
    const yzPerimLine = fixedRenderer.scene.findByProps({ name: 'yz-perimeter' }).instance as THREE.LineSegments;
    const xyPerimMat = xyPerimLine.material as THREE.ShaderMaterial;
    const xyArcsMat = (fixedRenderer.scene.findByProps({ name: 'xy-arcs' }).instance as THREE.LineSegments)
      .material as THREE.ShaderMaterial;

    expect(xyPerimLine.visible).toBe(true);
    expect(xzPerimLine.visible).toBe(false);
    expect(yzPerimLine.visible).toBe(false);
    expect(xyPerimMat.uniforms.uApertureRadius.value).toBeGreaterThan(0);
    expect(xyPerimMat.uniforms.uGrazingFade.value).toBeGreaterThan(1e-3);
    expect((xyArcsMat.uniforms.uRingRadii.value as Float32Array).slice(0, 4)).toEqual(
      new Float32Array([2.5, 5, 10, 0]),
    );
    const tokens = useThreeTokenStore.getState().tokens;
    const alphas = xyArcsMat.uniforms.uRingAlphas.value as Float32Array;
    expect(alphas[0]).toBeCloseTo(tokens.ringMinorAlpha);
    expect(alphas[1]).toBeCloseTo(tokens.ringMajorAlpha);
    expect(alphas[2]).toBeCloseTo(tokens.ringMinorAlpha);
    expect(alphas[3]).toBe(0);

    await fixedRenderer.unmount();

    // Zoom-adaptive rings when screenConstant=true and no explicit rings prop
    const adaptiveFrame: ReferenceFrame = {
      ...GALACTIC_FRAME,
      screenConstant: true,
    };
    const adaptiveRenderer = await ReactThreeTest.create(
      <SpatialFrameProvider frame={adaptiveFrame}>
        <CoordinateFins />
      </SpatialFrameProvider>,
    );
    await adaptiveRenderer.advanceFrames(2, 0.016);

    const adaptiveArcsMat = (adaptiveRenderer.scene.findByProps({ name: 'xy-arcs' }).instance as THREE.LineSegments)
      .material as THREE.ShaderMaterial;
    const adaptiveRadii = adaptiveArcsMat.uniforms.uRingRadii.value as Float32Array;
    expect(adaptiveRadii[0]).toBeGreaterThan(0);

    await adaptiveRenderer.unmount();
  });

  it('propagates theme token updates to uniforms, invalidates, and disposes on unmount', async () => {
    const renderer = await ReactThreeTest.create(
      <SpatialFrameProvider frame={GALACTIC_FRAME}>
        <CoordinateFins rings={[5]} />
      </SpatialFrameProvider>,
    );

    const perimNode = renderer.scene.findByProps({ name: 'xy-perimeter' }).instance as THREE.LineSegments;
    const ticksNode = renderer.scene.findByProps({ name: 'xy-ticks' }).instance as THREE.LineSegments;
    const arcsNode = renderer.scene.findByProps({ name: 'xy-arcs' }).instance as THREE.LineSegments;

    const perimMat = perimNode.material as THREE.ShaderMaterial;
    const ticksMat = ticksNode.material as THREE.ShaderMaterial;
    const arcsMat = arcsNode.material as THREE.ShaderMaterial;

    const perimGeomDispose = vi.spyOn(perimNode.geometry, 'dispose');
    const perimMatDispose = vi.spyOn(perimMat, 'dispose');
    const ticksMatDispose = vi.spyOn(ticksMat, 'dispose');
    const arcsMatDispose = vi.spyOn(arcsMat, 'dispose');

    mockInvalidate.mockClear();
    const prevTokens = useThreeTokenStore.getState().tokens;
    await ReactThreeTest.act(async () => {
      useThreeTokenStore.getState().setTokens({
        ...prevTokens,
        gridSecondaryColor: '#123456',
        rangeTickColor: '#654321',
        finPerimeterAlpha: 0.42,
        tickAlpha: 0.77,
      });
    });

    await renderer.advanceFrames(1, 0.016);

    expect((perimMat.uniforms.uColor.value as THREE.Color).getHexString()).toBe('123456');
    expect((arcsMat.uniforms.uColor.value as THREE.Color).getHexString()).toBe('123456');
    expect((ticksMat.uniforms.uColor.value as THREE.Color).getHexString()).toBe('654321');
    expect(perimMat.uniforms.uBaseAlpha.value).toBeCloseTo(0.42);
    expect(ticksMat.uniforms.uBaseAlpha.value).toBeCloseTo(0.77);
    expect(mockInvalidate).toHaveBeenCalled();

    await renderer.unmount();

    expect(perimGeomDispose).toHaveBeenCalledTimes(1);
    expect(perimMatDispose).toHaveBeenCalledTimes(1);
    expect(ticksMatDispose).toHaveBeenCalledTimes(1);
    expect(arcsMatDispose).toHaveBeenCalledTimes(1);
  });
});
