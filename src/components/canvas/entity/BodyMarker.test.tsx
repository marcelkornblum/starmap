import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as THREE from 'three';
import ReactThreeTest from '@react-three/test-renderer';
import { BodyMarker } from './BodyMarker';
import { OcclusionPass } from './OcclusionPass';
import { SpatialEntityProvider } from './SpatialEntityProvider';
import {
  EntityDotsBatchContext,
  createEntityDotsBatchRegistry,
} from './entityDotsBatchContext';
import { SpatialFrameProvider, GALACTIC_FRAME } from '../instrument';
import { CelestialOcclusionManager } from '../cartography/celestialOcclusionRegistry';
import { NOOP_RAYCAST } from '../engineConfig';

describe('BodyMarker Component & Interaction (AUD-115, AUD-116)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('renders central celestial marker in monochrome and hitarea mesh', async () => {
    const renderer = await ReactThreeTest.create(
      <SpatialEntityProvider>
        <SpatialFrameProvider frame={GALACTIC_FRAME}>
          <BodyMarker id="test-node" position={[1, 2, 3]} />
        </SpatialFrameProvider>
      </SpatialEntityProvider>,
    );

    expect(renderer.scene.findAll((node) => node.props.name === 'body-marker-test-node')).toHaveLength(1);
    expect(renderer.scene.findAll((node) => node.props.name === 'celestial-point-dot')).toHaveLength(1);
    expect(renderer.scene.findAll((node) => node.props.name === 'celestial-hitarea')).toHaveLength(1);

    const dot = renderer.scene.find((node) => node.props.name === 'celestial-point-dot');
    const hitarea = renderer.scene.find((node) => node.props.name === 'celestial-hitarea');
    expect(dot.props.raycast).toBe(NOOP_RAYCAST);
    expect(hitarea.props.raycast).toBeUndefined();
    expect(hitarea.instance.raycast).not.toBe(NOOP_RAYCAST);
    // Hitarea starts collapsed at scale 0 until first useFrame syncs matrixWorld and screen-invariant radius
    expect(hitarea.instance.scale.x).toBe(0);
    expect(hitarea.instance.scale.y).toBe(0);
    // Zero-draw hitarea: invisible to WebGLRenderer while Raycaster continues raycasting normally
    expect(hitarea.props.visible).toBe(false);
    expect(hitarea.instance.visible).toBe(false);

    await renderer.unmount();
  });

  it('supports custom size, debugHitarea wireframe mesh, and shared invisible hitarea material', async () => {
    const renderer = await ReactThreeTest.create(
      <SpatialEntityProvider>
        <SpatialFrameProvider frame={GALACTIC_FRAME}>
          <BodyMarker id="mono-node" position={[0, 0, 0]} pixelSize={6} debugHitarea={true} />
          <BodyMarker id="hidden-node-1" position={[1, 0, 0]} debugHitarea={false} />
          <BodyMarker id="hidden-node-2" position={[2, 0, 0]} debugHitarea={false} />
        </SpatialFrameProvider>
      </SpatialEntityProvider>,
    );

    expect(renderer.scene.findAll((node) => node.props.name === 'body-marker-mono-node')).toHaveLength(1);
    const hitareas = renderer.scene.findAll((node) => node.props.name === 'celestial-hitarea');
    expect(hitareas).toHaveLength(3);

    const debugHitareaMesh = hitareas[0].instance;
    const hiddenHitarea1 = hitareas[1].instance;
    const hiddenHitarea2 = hitareas[2].instance;

    expect(hitareas[0].props.visible).toBe(true);
    expect(debugHitareaMesh.visible).toBe(true);
    if (!(debugHitareaMesh instanceof THREE.Mesh) || !(debugHitareaMesh.material instanceof THREE.MeshBasicMaterial)) {
      throw new Error('Expected debugHitareaMesh to be a THREE.Mesh with MeshBasicMaterial');
    }
    expect(debugHitareaMesh.material.wireframe).toBe(true);
    expect(debugHitareaMesh.material.opacity).toBe(0.35);

    expect(hitareas[1].props.visible).toBe(false);
    expect(hitareas[2].props.visible).toBe(false);
    if (
      !(hiddenHitarea1 instanceof THREE.Mesh) ||
      !(hiddenHitarea2 instanceof THREE.Mesh) ||
      !(hiddenHitarea1.material instanceof THREE.MeshBasicMaterial)
    ) {
      throw new Error('Expected hiddenHitarea meshes with MeshBasicMaterial');
    }
    expect(hiddenHitarea1.material).toBe(hiddenHitarea2.material);
    expect(hiddenHitarea1.material.opacity).toBe(0);
    expect(hiddenHitarea1.material.transparent).toBe(true);
    expect(hiddenHitarea1.material.depthWrite).toBe(false);
    expect(hiddenHitarea1.material.side).toBe(THREE.DoubleSide);

    await renderer.unmount();
  });

  it('calls billboardRef.current.updateMatrixWorld(true) after updating transforms in useFrame (AUD-115)', async () => {
    const spy = vi.spyOn(THREE.Group.prototype, 'updateMatrixWorld');

    const renderer = await ReactThreeTest.create(
      <SpatialEntityProvider>
        <SpatialFrameProvider frame={GALACTIC_FRAME}>
          <BodyMarker id="alpha-centauri" position={[1, 2, 3]} />
        </SpatialFrameProvider>
      </SpatialEntityProvider>,
    );

    spy.mockClear();

    // Advance frame loop
    await renderer.advanceFrames(1, 0.016);

    expect(spy).toHaveBeenCalledWith(true);
    spy.mockRestore();
    await renderer.unmount();
  });

  it('skips updateMatrixWorld and evaluateHitAreaOffset when interactive={false}, and deduplicates updates on stationary frames when interactive={true}', async () => {
    const updateMatrixSpy = vi.spyOn(THREE.Group.prototype, 'updateMatrixWorld');
    const occlusionManager = new CelestialOcclusionManager();
    const evalHitAreaSpy = vi.spyOn(occlusionManager, 'evaluateHitAreaOffset');

    // 1. Passive marker (interactive={false})
    const passiveRenderer = await ReactThreeTest.create(
      <SpatialEntityProvider occlusionManager={occlusionManager}>
        <SpatialFrameProvider frame={GALACTIC_FRAME}>
          <BodyMarker id="passive-star" position={[1, 2, 3]} interactive={false} />
        </SpatialFrameProvider>
      </SpatialEntityProvider>,
    );

    updateMatrixSpy.mockClear();
    evalHitAreaSpy.mockClear();

    await passiveRenderer.advanceFrames(1, 0.016);
    expect(updateMatrixSpy).not.toHaveBeenCalled();
    expect(evalHitAreaSpy).not.toHaveBeenCalled();
    await passiveRenderer.unmount();

    // 2. Interactive marker (interactive={true})
    const interactiveRenderer = await ReactThreeTest.create(
      <SpatialEntityProvider occlusionManager={occlusionManager}>
        <SpatialFrameProvider frame={GALACTIC_FRAME}>
          <BodyMarker id="interactive-star" position={[1, 2, 3]} interactive={true} />
        </SpatialFrameProvider>
      </SpatialEntityProvider>,
    );

    updateMatrixSpy.mockClear();
    evalHitAreaSpy.mockClear();

    // Frame 1: Initial frame should sync billboard transform and update matrix
    await interactiveRenderer.advanceFrames(1, 0.016);
    expect(updateMatrixSpy).toHaveBeenCalledTimes(1);
    expect(evalHitAreaSpy).toHaveBeenCalledWith('interactive-star');

    // Frame 2: Stationary camera should skip redundant updateMatrixWorld
    updateMatrixSpy.mockClear();
    evalHitAreaSpy.mockClear();
    await interactiveRenderer.advanceFrames(1, 0.016);
    expect(updateMatrixSpy).not.toHaveBeenCalled();

    updateMatrixSpy.mockRestore();
    evalHitAreaSpy.mockRestore();
    await interactiveRenderer.unmount();
  });

  it('triggers onClick when pointer jitter is <= 8px (AUD-116)', async () => {
    const handleClick = vi.fn();

    const renderer = await ReactThreeTest.create(
      <SpatialEntityProvider>
        <SpatialFrameProvider frame={GALACTIC_FRAME}>
          <BodyMarker id="sirius" position={[0, 0, 0]} onClick={handleClick} />
        </SpatialFrameProvider>
      </SpatialEntityProvider>,
    );

    const hitarea = renderer.scene.find((node) => node.props.name === 'celestial-hitarea');
    expect(hitarea).toBeDefined();

    // Pointer down at (100, 100) and pointer up at (104, 103) -> hypot(4, 3) = 5px <= 8px
    await renderer.fireEvent(hitarea, 'pointerDown', { clientX: 100, clientY: 100, stopPropagation: vi.fn() });
    await renderer.fireEvent(hitarea, 'pointerUp', { clientX: 104, clientY: 103, stopPropagation: vi.fn() });

    expect(handleClick).toHaveBeenCalledTimes(1);
    expect(handleClick).toHaveBeenCalledWith('sirius', expect.anything());

    await renderer.unmount();
  });

  it('suppresses onClick when pointer movement is > 8px (AUD-116)', async () => {
    const handleClick = vi.fn();

    const renderer = await ReactThreeTest.create(
      <SpatialEntityProvider>
        <SpatialFrameProvider frame={GALACTIC_FRAME}>
          <BodyMarker id="vega" position={[0, 0, 0]} onClick={handleClick} />
        </SpatialFrameProvider>
      </SpatialEntityProvider>,
    );

    const hitarea = renderer.scene.find((node) => node.props.name === 'celestial-hitarea');
    expect(hitarea).toBeDefined();

    // Pointer down at (100, 100) and pointer up at (110, 100) -> 10px > 8px
    await renderer.fireEvent(hitarea, 'pointerDown', { clientX: 100, clientY: 100, stopPropagation: vi.fn() });
    await renderer.fireEvent(hitarea, 'pointerUp', { clientX: 110, clientY: 100, stopPropagation: vi.fn() });

    expect(handleClick).not.toHaveBeenCalled();

    await renderer.unmount();
  });

  it('skips redundant hitarea/projection work during idle OcclusionPass frames even after >250ms, and resumes on footprint change (P-09)', async () => {
    let now = 10_000;
    vi.spyOn(performance, 'now').mockImplementation(() => now);

    const occlusionManager = new CelestialOcclusionManager();
    const evalHitAreaSpy = vi.spyOn(occlusionManager, 'evaluateHitAreaOffset');

    const renderer = await ReactThreeTest.create(
      <SpatialEntityProvider occlusionManager={occlusionManager}>
        <OcclusionPass enabled={true} />
        <SpatialFrameProvider frame={GALACTIC_FRAME}>
          <BodyMarker id="idle-marker" position={[1, 2, 3]} interactive={true} />
        </SpatialFrameProvider>
      </SpatialEntityProvider>,
    );

    await renderer.advanceFrames(1, 0.016);
    expect(evalHitAreaSpy).toHaveBeenCalledTimes(1);

    // Advance >250ms while idle: should skip evaluateHitAreaOffset completely
    evalHitAreaSpy.mockClear();
    now += 300;
    await renderer.advanceFrames(1, 0.016);
    expect(evalHitAreaSpy).not.toHaveBeenCalled();

    // Mutate footprint: should immediately re-evaluate on next frame
    occlusionManager.register({
      id: 'idle-marker',
      state: 'selected',
      screenX: 0,
      screenY: 0,
      worldPos: [1, 2, 3],
      reticleRadius: 20,
      starRadius: 0.035,
      hasReticle: true,
      visible: true,
      updatedAt: 0,
    });
    await renderer.advanceFrames(1, 0.016);
    expect(evalHitAreaSpy).toHaveBeenCalledTimes(1);

    await renderer.unmount();
  });

  it('registers with EntityDotsBatch and suppresses per-entity celestial-point-dot when inside a batch context', async () => {
    const registry = createEntityDotsBatchRegistry();
    const updateMatrixSpy = vi.spyOn(THREE.Group.prototype, 'updateMatrixWorld');

    const renderer = await ReactThreeTest.create(
      <EntityDotsBatchContext.Provider value={registry}>
        <SpatialEntityProvider>
          <SpatialFrameProvider frame={GALACTIC_FRAME}>
            <BodyMarker id="batched-star" position={[3, 4, 5]} pixelSize={7} color="#ffcc00" />
          </SpatialFrameProvider>
        </SpatialEntityProvider>
      </EntityDotsBatchContext.Provider>,
    );

    // Per-entity dot mesh is suppressed in batch mode, while hitarea remains active
    expect(renderer.scene.findAll((node) => node.props.name === 'celestial-point-dot')).toHaveLength(0);
    expect(renderer.scene.findAll((node) => node.props.name === 'celestial-hitarea')).toHaveLength(1);
    expect(registry.size).toBe(1);

    const [entry] = Array.from(registry);
    expect(entry.id).toBe('batched-star');
    expect(entry.pixelSize).toBe(7);
    expect(entry.color).toBe('#ffcc00');

    // Interactive hitarea billboard still syncs in useFrame
    updateMatrixSpy.mockClear();
    await renderer.advanceFrames(1, 0.016);
    expect(updateMatrixSpy).toHaveBeenCalledWith(true);

    // Prop update re-registers with updated values
    await renderer.update(
      <EntityDotsBatchContext.Provider value={registry}>
        <SpatialEntityProvider>
          <SpatialFrameProvider frame={GALACTIC_FRAME}>
            <BodyMarker id="batched-star" position={[6, 7, 8]} pixelSize={9} />
          </SpatialFrameProvider>
        </SpatialEntityProvider>
      </EntityDotsBatchContext.Provider>,
    );
    const [updatedEntry] = Array.from(registry);
    expect(updatedEntry.pixelSize).toBe(9);

    // Unmount unregisters cleanly
    await renderer.unmount();
    expect(registry.size).toBe(0);
  });
});
