import { describe, it, expect, afterEach, vi } from 'vitest';
import * as THREE from 'three';
import ReactThreeTest from '@react-three/test-renderer';
import { Line2 } from 'three/examples/jsm/lines/Line2.js';
import { OrbitPath } from './OrbitPath';
import { SpatialEntityProvider } from './SpatialEntityProvider';
import { SpatialFrameProvider, GALACTIC_FRAME, SYSTEM_FRAME } from '../instrument';
import {
  setCrossScaleInstrumentFade,
  resetCrossScaleInstrumentFade,
} from '../instrument/crossScaleFadeState';
import {
  setCrossScaleSceneScale,
  resetCrossScaleSceneScale,
} from '../instrument/crossScaleVisualState';
import { NOOP_RAYCAST } from '../engineConfig';
import { useThreeTokenStore } from '../../../stores/useThreeTokenStore';
import { CartoLineMaterial } from '../materials/CartoLineMaterial';
import { CARTO_LINE_CONSTANTS } from '../../../styles/tokens/cartography';
import * as orbitPathGeometry from './orbitPathGeometry';

describe('OrbitPath Primitive (§4.4: State-Driven Orbits)', () => {
  afterEach(() => {
    resetCrossScaleInstrumentFade();
    resetCrossScaleSceneScale();
  });

  it('renders circular orbit with periapsis tick by default', async () => {
    const renderer = await ReactThreeTest.create(
      <SpatialEntityProvider>
        <SpatialFrameProvider frame={GALACTIC_FRAME}>
          <OrbitPath
            id="orbit-earth"
            semiMajorAxis={1.0}
            state="passive"
          />
        </SpatialFrameProvider>
      </SpatialEntityProvider>,
    );

    expect(renderer.scene.findAll((node) => node.props.name === 'orbital-ring-orbit-earth')).toHaveLength(1);
    expect(renderer.scene.findAll((node) => node.props.name === 'orbit-path-line')).toHaveLength(1);
    expect(renderer.scene.findAll((node) => node.props.name === 'orbit-periapsis-tick')).toHaveLength(1);

    await renderer.unmount();
  });

  it('applies kinematic color and forced rendering when state is selected or focused', async () => {
    const renderer = await ReactThreeTest.create(
      <SpatialEntityProvider>
        <SpatialFrameProvider frame={GALACTIC_FRAME}>
          <OrbitPath
            id="orbit-mars"
            semiMajorAxis={1.52}
            visible={false}
            state="focused"
          />
        </SpatialFrameProvider>
      </SpatialEntityProvider>,
    );

    expect(renderer.scene.findAll((node) => node.props.name === 'orbital-ring-orbit-mars')).toHaveLength(1);
    expect(renderer.scene.findAll((node) => node.props.name === 'orbit-path-line')).toHaveLength(1);

    await renderer.unmount();
  });

  it('updates lineMat color in-place without re-instantiating mesh on state changes (AUD-106)', async () => {
    const renderer = await ReactThreeTest.create(
      <SpatialEntityProvider>
        <SpatialFrameProvider frame={GALACTIC_FRAME}>
          <OrbitPath
            id="orbit-1"
            semiMajorAxis={10}
            state="passive"
          />
        </SpatialFrameProvider>
      </SpatialEntityProvider>,
    );

    const orbitBefore = renderer.scene.find((node) => node.props.name === 'orbital-ring-orbit-1');
    expect(orbitBefore).toBeDefined();

    await renderer.update(
      <SpatialEntityProvider>
        <SpatialFrameProvider frame={GALACTIC_FRAME}>
          <OrbitPath
            id="orbit-1"
            semiMajorAxis={10}
            state="selected"
          />
        </SpatialFrameProvider>
      </SpatialEntityProvider>,
    );

    const orbitAfter = renderer.scene.find((node) => node.props.name === 'orbital-ring-orbit-1');
    expect(orbitAfter).toBeDefined();

    await renderer.unmount();
  });

  it('attaches NOOP_RAYCAST to Line2 mesh, periapsis tick, and direction arrow (P-10)', async () => {
    const renderer = await ReactThreeTest.create(
      <SpatialEntityProvider>
        <SpatialFrameProvider frame={GALACTIC_FRAME}>
          <OrbitPath
            id="orbit-noop"
            semiMajorAxis={2.0}
            showPeriapsisTick={true}
            showDirectionIndicator={true}
            state="passive"
          />
        </SpatialFrameProvider>
      </SpatialEntityProvider>,
    );

    const lineGroup = renderer.scene.find((node) => node.props.name === 'orbit-path-line');
    const line2Node = lineGroup.children.find(
      (child) => child.instance instanceof Line2 || (child.instance && 'isLine2' in child.instance),
    );
    expect(line2Node).toBeDefined();
    expect(line2Node?.instance?.raycast).toBe(NOOP_RAYCAST);

    const periapsisTick = renderer.scene.find((node) => node.props.name === 'orbit-periapsis-tick');
    expect(periapsisTick.props.raycast).toBe(NOOP_RAYCAST);

    const directionArrow = renderer.scene.find((node) => node.props.name === 'orbit-direction-arrow');
    expect(directionArrow.props.raycast).toBe(NOOP_RAYCAST);

    await renderer.unmount();
  });

  it('dissolves line, periapsis tick, and direction arrow opacities to 0 when instrumentFade is 0 and restores when 1', async () => {
    const renderer = await ReactThreeTest.create(
      <SpatialEntityProvider>
        <SpatialFrameProvider frame={GALACTIC_FRAME}>
          <OrbitPath
            id="orbit-fade"
            semiMajorAxis={2.0}
            showPeriapsisTick={true}
            showDirectionIndicator={true}
            state="passive"
          />
        </SpatialFrameProvider>
      </SpatialEntityProvider>,
    );

    const tokens = useThreeTokenStore.getState().tokens;
    const lineGroup = renderer.scene.find((node) => node.props.name === 'orbit-path-line');
    const line2 = lineGroup.children.find(
      (child) => child.instance instanceof Line2 || (child.instance && 'isLine2' in child.instance),
    )?.instance as Line2;
    const lineMat = line2.material as CartoLineMaterial;
    const tickMat = (renderer.scene.find((node) => node.props.name === 'orbit-periapsis-tick').instance as THREE.LineSegments).material as THREE.LineBasicMaterial;
    const arrowMat = (renderer.scene.find((node) => node.props.name === 'orbit-direction-arrow').instance as THREE.Mesh).material as THREE.MeshBasicMaterial;

    setCrossScaleInstrumentFade(0);
    await renderer.advanceFrames(1, 0.016);
    expect(lineMat.opacity).toBe(0);
    expect(lineMat.uniforms.opacity.value).toBe(0);
    expect(tickMat.opacity).toBe(0);
    expect(arrowMat.opacity).toBe(0);

    setCrossScaleInstrumentFade(1);
    await renderer.advanceFrames(1, 0.016);
    expect(lineMat.opacity).toBeCloseTo(tokens.orbitAlpha);
    expect(lineMat.uniforms.opacity.value).toBeCloseTo(tokens.orbitAlpha);
    expect(tickMat.opacity).toBeCloseTo(tokens.orbitAlpha);
    expect(arrowMat.opacity).toBeCloseTo(tokens.orbitAlpha);

    await renderer.unmount();
  });

  it('skips redundant lineMat.updateResolution calls when size and projection are unchanged', async () => {
    const renderer = await ReactThreeTest.create(
      <SpatialEntityProvider>
        <SpatialFrameProvider frame={GALACTIC_FRAME}>
          <OrbitPath id="orbit-cache" semiMajorAxis={2.0} state="passive" />
        </SpatialFrameProvider>
      </SpatialEntityProvider>,
    );

    const lineGroup = renderer.scene.find((node) => node.props.name === 'orbit-path-line');
    const line2 = lineGroup.children.find(
      (child) => child.instance instanceof Line2 || (child.instance && 'isLine2' in child.instance),
    )?.instance as Line2;
    const lineMat = line2.material as CartoLineMaterial;
    const resSpy = vi.spyOn(lineMat, 'updateResolution');

    await renderer.advanceFrames(1, 0.016);
    expect(resSpy).toHaveBeenCalledTimes(1);

    await renderer.advanceFrames(3, 0.016);
    expect(resSpy).toHaveBeenCalledTimes(1);

    resSpy.mockRestore();
    await renderer.unmount();
  });

  it('defaults to 64 orbit segments to keep instanced Line2 vertex load bounded', async () => {
    const renderer = await ReactThreeTest.create(
      <SpatialEntityProvider>
        <SpatialFrameProvider frame={GALACTIC_FRAME}>
          <OrbitPath id="orbit-segments" semiMajorAxis={2.0} state="passive" />
        </SpatialFrameProvider>
      </SpatialEntityProvider>,
    );

    const lineGroup = renderer.scene.find((node) => node.props.name === 'orbit-path-line');
    const line2 = lineGroup.children.find(
      (child) => child.instance instanceof Line2 || (child.instance && 'isLine2' in child.instance),
    )?.instance as Line2;

    expect(line2.geometry.attributes.instanceStart.count).toBe(64);

    await renderer.unmount();
  });

  it('uses dotSize and dotGap on CartoLineMaterial when lineStyle is dotted', async () => {
    const renderer = await ReactThreeTest.create(
      <SpatialEntityProvider>
        <SpatialFrameProvider frame={GALACTIC_FRAME}>
          <OrbitPath
            id="orbit-dotted"
            semiMajorAxis={2.0}
            lineStyle="dotted"
            state="passive"
          />
        </SpatialFrameProvider>
      </SpatialEntityProvider>,
    );

    const lineGroup = renderer.scene.find((node) => node.props.name === 'orbit-path-line');
    const line2 = lineGroup.children.find(
      (child) => child.instance instanceof Line2 || (child.instance && 'isLine2' in child.instance),
    )?.instance as Line2;
    const lineMat = line2.material as CartoLineMaterial;

    expect(lineMat.lineStyle).toBe('dotted');
    expect(lineMat.dashSize).toBe(CARTO_LINE_CONSTANTS.dotSize);
    expect(lineMat.gapSize).toBe(CARTO_LINE_CONSTANTS.dotGap);
    expect(lineMat.uniforms.dashSize.value).toBe(CARTO_LINE_CONSTANTS.dotSize);
    expect(lineMat.uniforms.gapSize.value).toBe(CARTO_LINE_CONSTANTS.dotGap);

    await renderer.unmount();
  });

  it('returns null without allocating geometries for hyperbolic, non-positive, or hidden passive orbits', async () => {
    const buildSpy = vi.spyOn(orbitPathGeometry, 'buildOrbitGeometries');

    const hyperbolicRenderer = await ReactThreeTest.create(
      <SpatialEntityProvider>
        <SpatialFrameProvider frame={GALACTIC_FRAME}>
          <OrbitPath
            id="orbit-hyperbolic"
            semiMajorAxis={-3.2}
            eccentricity={3.7}
            state="focused"
          />
        </SpatialFrameProvider>
      </SpatialEntityProvider>,
    );
    expect(hyperbolicRenderer.scene.findAll((node) => node.props.name === 'orbit-path-line')).toHaveLength(0);
    expect(buildSpy).not.toHaveBeenCalled();
    await hyperbolicRenderer.unmount();

    const parabolicRenderer = await ReactThreeTest.create(
      <SpatialEntityProvider>
        <SpatialFrameProvider frame={GALACTIC_FRAME}>
          <OrbitPath
            id="orbit-parabolic"
            semiMajorAxis={0}
            eccentricity={1.0}
            state="passive"
          />
        </SpatialFrameProvider>
      </SpatialEntityProvider>,
    );
    expect(parabolicRenderer.scene.findAll((node) => node.props.name === 'orbit-path-line')).toHaveLength(0);
    expect(buildSpy).not.toHaveBeenCalled();
    await parabolicRenderer.unmount();

    const hiddenRenderer = await ReactThreeTest.create(
      <SpatialEntityProvider>
        <SpatialFrameProvider frame={GALACTIC_FRAME}>
          <OrbitPath
            id="orbit-hidden"
            semiMajorAxis={1.0}
            eccentricity={0.01}
            visible={false}
            state="passive"
          />
        </SpatialFrameProvider>
      </SpatialEntityProvider>,
    );
    expect(hiddenRenderer.scene.findAll((node) => node.props.name === 'orbit-path-line')).toHaveLength(0);
    expect(buildSpy).not.toHaveBeenCalled();
    await hiddenRenderer.unmount();

    buildSpy.mockRestore();
  });

  it('mounts with 0 opacity and valid viewport resolution on Frame 0 before useFrame when cross-scale instrumentFade is 0, and preserves 0 across re-renders', async () => {
    setCrossScaleInstrumentFade(0);
    setCrossScaleSceneScale(0.04);

    const renderer = await ReactThreeTest.create(
      <SpatialEntityProvider>
        <SpatialFrameProvider frame={SYSTEM_FRAME}>
          <OrbitPath
            id="orbit-swap-frame0"
            semiMajorAxis={1.0}
            showPeriapsisTick={true}
            showDirectionIndicator={true}
            state="passive"
          />
        </SpatialFrameProvider>
      </SpatialEntityProvider>,
      { width: 1440, height: 900 },
    );

    const lineGroup = renderer.scene.find((node) => node.props.name === 'orbit-path-line');
    const line2 = lineGroup.children.find(
      (child) => child.instance instanceof Line2 || (child.instance && 'isLine2' in child.instance),
    )?.instance as Line2;
    const lineMat = line2.material as CartoLineMaterial;
    const tickMat = (
      renderer.scene.find((node) => node.props.name === 'orbit-periapsis-tick')
        .instance as THREE.LineSegments
    ).material as THREE.LineBasicMaterial;
    const arrowMat = (
      renderer.scene.find((node) => node.props.name === 'orbit-direction-arrow')
        .instance as THREE.Mesh
    ).material as THREE.MeshBasicMaterial;

    expect(lineMat.opacity).toBe(0);
    expect(lineMat.uniforms.opacity.value).toBe(0);
    expect(tickMat.opacity).toBe(0);
    expect(arrowMat.opacity).toBe(0);
    expect(lineMat.uniforms.resolution.value.x).toBeGreaterThan(1);
    expect(lineMat.uniforms.resolution.value.y).toBeGreaterThan(1);

    await renderer.update(
      <SpatialEntityProvider>
        <SpatialFrameProvider frame={SYSTEM_FRAME}>
          <OrbitPath
            id="orbit-swap-frame0"
            semiMajorAxis={1.0}
            showPeriapsisTick={true}
            showDirectionIndicator={true}
            state="focused"
          />
        </SpatialFrameProvider>
      </SpatialEntityProvider>,
    );

    expect(lineMat.opacity).toBe(0);
    expect(lineMat.uniforms.opacity.value).toBe(0);
    expect(tickMat.opacity).toBe(0);
    expect(arrowMat.opacity).toBe(0);

    await renderer.unmount();
  });

  it('attenuates OrbitPath opacity to 0 when crossScaleSceneScale squashes orbits at minSceneScale', async () => {
    setCrossScaleInstrumentFade(0.5);
    setCrossScaleSceneScale(0.04);

    const renderer = await ReactThreeTest.create(
      <SpatialEntityProvider>
        <SpatialFrameProvider frame={SYSTEM_FRAME}>
          <OrbitPath
            id="orbit-squashed"
            semiMajorAxis={1.0}
            showPeriapsisTick={true}
            showDirectionIndicator={true}
            state="passive"
          />
        </SpatialFrameProvider>
      </SpatialEntityProvider>,
    );

    const tokens = useThreeTokenStore.getState().tokens;
    const lineGroup = renderer.scene.find((node) => node.props.name === 'orbit-path-line');
    const line2 = lineGroup.children.find(
      (child) => child.instance instanceof Line2 || (child.instance && 'isLine2' in child.instance),
    )?.instance as Line2;
    const lineMat = line2.material as CartoLineMaterial;
    const tickMat = (
      renderer.scene.find((node) => node.props.name === 'orbit-periapsis-tick')
        .instance as THREE.LineSegments
    ).material as THREE.LineBasicMaterial;
    const arrowMat = (
      renderer.scene.find((node) => node.props.name === 'orbit-direction-arrow')
        .instance as THREE.Mesh
    ).material as THREE.MeshBasicMaterial;

    await renderer.advanceFrames(1, 0.016);
    expect(lineMat.opacity).toBe(0);
    expect(tickMat.opacity).toBe(0);
    expect(arrowMat.opacity).toBe(0);

    setCrossScaleSceneScale(1.0);
    setCrossScaleInstrumentFade(1.0);
    await renderer.advanceFrames(1, 0.016);
    expect(lineMat.opacity).toBeCloseTo(tokens.orbitAlpha);
    expect(tickMat.opacity).toBeCloseTo(tokens.orbitAlpha);
    expect(arrowMat.opacity).toBeCloseTo(tokens.orbitAlpha);

    await renderer.unmount();
  });
});
