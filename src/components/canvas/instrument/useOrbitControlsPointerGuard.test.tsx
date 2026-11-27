import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as THREE from 'three';
import ReactThreeTest from '@react-three/test-renderer';
import { OrbitControls } from 'three-stdlib';
import { useOrbitControlsPointerGuard } from './useOrbitControlsPointerGuard';

function createPointerEvent(
  type: string,
  opts: {
    pointerId: number;
    pointerType?: string;
    pageX?: number;
    pageY?: number;
    clientX?: number;
    clientY?: number;
    bubbles?: boolean;
  },
): PointerEvent {
  const px = opts.pageX ?? opts.clientX ?? 0;
  const py = opts.pageY ?? opts.clientY ?? 0;
  const cx = opts.clientX ?? px;
  const cy = opts.clientY ?? py;

  if (typeof PointerEvent === 'function') {
    const ev = new PointerEvent(type, {
      pointerId: opts.pointerId,
      pointerType: opts.pointerType ?? 'touch',
      clientX: cx,
      clientY: cy,
      bubbles: opts.bubbles ?? true,
      cancelable: true,
    });
    if (ev.pointerId !== opts.pointerId) {
      Object.defineProperty(ev, 'pointerId', { value: opts.pointerId, configurable: true });
    }
    if (ev.pointerType !== (opts.pointerType ?? 'touch')) {
      Object.defineProperty(ev, 'pointerType', {
        value: opts.pointerType ?? 'touch',
        configurable: true,
      });
    }
    if (ev.pageX !== px) {
      Object.defineProperty(ev, 'pageX', { value: px, configurable: true });
    }
    if (ev.pageY !== py) {
      Object.defineProperty(ev, 'pageY', { value: py, configurable: true });
    }
    return ev;
  }

  const ev = new MouseEvent(type, {
    clientX: cx,
    clientY: cy,
    bubbles: opts.bubbles ?? true,
    cancelable: true,
  }) as unknown as PointerEvent;
  Object.defineProperty(ev, 'pointerId', { value: opts.pointerId, configurable: true });
  Object.defineProperty(ev, 'pointerType', {
    value: opts.pointerType ?? 'touch',
    configurable: true,
  });
  Object.defineProperty(ev, 'pageX', { value: px, configurable: true });
  Object.defineProperty(ev, 'pageY', { value: py, configurable: true });
  return ev;
}

interface GuardHarnessProps {
  domElement: HTMLElement | null;
  controls: OrbitControls | undefined;
  camera: THREE.Camera | undefined;
}

function GuardHarness({ domElement, controls, camera }: GuardHarnessProps) {
  useOrbitControlsPointerGuard({ domElement, controls, camera });
  return null;
}

describe('useOrbitControlsPointerGuard', () => {
  let canvas: HTMLCanvasElement;
  let sibling: HTMLDivElement;
  let camera: THREE.PerspectiveCamera;
  let controls: OrbitControls;

  beforeEach(() => {
    canvas = document.createElement('canvas');
    Object.defineProperty(canvas, 'clientWidth', { value: 390, configurable: true });
    Object.defineProperty(canvas, 'clientHeight', { value: 844, configurable: true });
    canvas.setPointerCapture = vi.fn();
    canvas.releasePointerCapture = vi.fn();
    sibling = document.createElement('div');
    document.body.appendChild(canvas);
    document.body.appendChild(sibling);

    camera = new THREE.PerspectiveCamera(45, 390 / 844, 0.1, 1000);
    camera.position.set(0, 0, 10);
    camera.lookAt(0, 0, 0);
    camera.updateMatrixWorld();

    controls = new OrbitControls(camera, canvas);
  });

  afterEach(() => {
    controls.dispose();
    canvas.remove();
    sibling.remove();
    vi.restoreAllMocks();
  });

  it('flushes leaked OrbitControls pointer when pointercancel fires off-canvas on document so next single-finger drag still rotates', async () => {
    const renderer = await ReactThreeTest.create(
      <GuardHarness domElement={canvas} controls={controls} camera={camera} />,
    );

    // Touch 1 starts on canvas, then gets cancelled over sibling overlay (not canvas)
    canvas.dispatchEvent(
      createPointerEvent('pointerdown', { pointerId: 1, pointerType: 'touch', pageX: 100, pageY: 100 }),
    );
    sibling.dispatchEvent(
      createPointerEvent('pointercancel', { pointerId: 1, pointerType: 'touch', pageX: 100, pageY: 100 }),
    );

    const posBeforeDrag = camera.position.clone();

    // Next single-finger touch drag should rotate (not enter 2-finger dolly or STATE.NONE)
    canvas.dispatchEvent(
      createPointerEvent('pointerdown', { pointerId: 2, pointerType: 'touch', pageX: 150, pageY: 150 }),
    );
    document.dispatchEvent(
      createPointerEvent('pointermove', { pointerId: 2, pointerType: 'touch', pageX: 250, pageY: 150 }),
    );
    controls.update();
    document.dispatchEvent(
      createPointerEvent('pointerup', { pointerId: 2, pointerType: 'touch', pageX: 250, pageY: 150 }),
    );

    expect(Number.isFinite(camera.position.x)).toBe(true);
    expect(Number.isFinite(camera.position.y)).toBe(true);
    expect(Number.isFinite(camera.position.z)).toBe(true);
    expect(camera.position.distanceTo(posBeforeDrag)).toBeGreaterThan(0.1);

    await renderer.unmount();
  });

  it('flushes stale reused pointerId before OrbitControls onPointerDown without throwing TypeError or producing NaN', async () => {
    const renderer = await ReactThreeTest.create(
      <GuardHarness domElement={canvas} controls={controls} camera={camera} />,
    );

    // Start pointer 7 without ever sending pointerup/pointercancel
    canvas.dispatchEvent(
      createPointerEvent('pointerdown', { pointerId: 7, pointerType: 'touch', pageX: 120, pageY: 200 }),
    );

    // Reuse pointerId 7 at exact same or different coordinates -> must not throw or produce NaN
    expect(() => {
      canvas.dispatchEvent(
        createPointerEvent('pointerdown', { pointerId: 7, pointerType: 'touch', pageX: 120, pageY: 200 }),
      );
      document.dispatchEvent(
        createPointerEvent('pointermove', { pointerId: 7, pointerType: 'touch', pageX: 160, pageY: 240 }),
      );
      controls.update();
      document.dispatchEvent(
        createPointerEvent('pointerup', { pointerId: 7, pointerType: 'touch', pageX: 160, pageY: 240 }),
      );
    }).not.toThrow();

    expect(Number.isFinite(camera.position.x)).toBe(true);
    expect(Number.isFinite(camera.position.y)).toBe(true);
    expect(Number.isFinite(camera.position.z)).toBe(true);
    expect(Number.isFinite(camera.quaternion.w)).toBe(true);

    await renderer.unmount();
  });

  it('suppresses coincident 0px two-finger touch start and move so OrbitControls never corrupts camera to NaN/Infinity', async () => {
    const renderer = await ReactThreeTest.create(
      <GuardHarness domElement={canvas} controls={controls} camera={camera} />,
    );

    canvas.dispatchEvent(
      createPointerEvent('pointerdown', { pointerId: 10, pointerType: 'touch', pageX: 100, pageY: 100 }),
    );
    // Second touch at identical position (< 1px away)
    canvas.dispatchEvent(
      createPointerEvent('pointerdown', { pointerId: 11, pointerType: 'touch', pageX: 100, pageY: 100 }),
    );
    // Move second finger or another finger onto exact same coords
    document.dispatchEvent(
      createPointerEvent('pointermove', { pointerId: 10, pointerType: 'touch', pageX: 100, pageY: 100 }),
    );
    controls.update();

    expect(Number.isFinite(camera.position.x)).toBe(true);
    expect(Number.isFinite(camera.position.y)).toBe(true);
    expect(Number.isFinite(camera.position.z)).toBe(true);

    // Also test non-coincident 2-finger pinch that moves to coincident 0px distance
    document.dispatchEvent(
      createPointerEvent('pointerup', { pointerId: 10, pointerType: 'touch', pageX: 100, pageY: 100 }),
    );
    canvas.dispatchEvent(
      createPointerEvent('pointerdown', { pointerId: 12, pointerType: 'touch', pageX: 100, pageY: 100 }),
    );
    canvas.dispatchEvent(
      createPointerEvent('pointerdown', { pointerId: 13, pointerType: 'touch', pageX: 140, pageY: 100 }),
    );
    document.dispatchEvent(
      createPointerEvent('pointermove', { pointerId: 13, pointerType: 'touch', pageX: 100, pageY: 100 }),
    );
    controls.update();

    expect(Number.isFinite(camera.position.x)).toBe(true);
    expect(Number.isFinite(camera.position.y)).toBe(true);
    expect(Number.isFinite(camera.position.z)).toBe(true);

    await renderer.unmount();
  });

  it('flushes active pointers on window blur', async () => {
    const renderer = await ReactThreeTest.create(
      <GuardHarness domElement={canvas} controls={controls} camera={camera} />,
    );

    canvas.dispatchEvent(
      createPointerEvent('pointerdown', { pointerId: 21, pointerType: 'touch', pageX: 80, pageY: 80 }),
    );

    window.dispatchEvent(new Event('blur'));

    const posBeforeDrag = camera.position.clone();
    // Subsequent single-finger drag should still rotate cleanly (not 2-finger dolly)
    canvas.dispatchEvent(
      createPointerEvent('pointerdown', { pointerId: 22, pointerType: 'touch', pageX: 100, pageY: 100 }),
    );
    document.dispatchEvent(
      createPointerEvent('pointermove', { pointerId: 22, pointerType: 'touch', pageX: 220, pageY: 100 }),
    );
    controls.update();
    document.dispatchEvent(
      createPointerEvent('pointerup', { pointerId: 22, pointerType: 'touch', pageX: 220, pageY: 100 }),
    );

    expect(camera.position.distanceTo(posBeforeDrag)).toBeGreaterThan(0.1);
    expect(Number.isFinite(camera.position.x)).toBe(true);

    await renderer.unmount();
  });

  it('restores last finite camera and target pose on the -0.95 frame check if camera or target becomes non-finite', async () => {
    const renderer = await ReactThreeTest.create(
      <GuardHarness domElement={canvas} controls={controls} camera={camera} />,
    );

    camera.position.set(3, 4, 12);
    controls.target.set(1, -2, 0.5);
    camera.updateMatrixWorld();

    // Record finite snapshot on first frame
    await renderer.advanceFrames(1, 0.016);

    // Corrupt camera.position and controls.target to NaN/Infinity
    camera.position.set(Number.NaN, Number.POSITIVE_INFINITY, 0);
    controls.target.set(Number.NaN, 0, 0);

    await renderer.advanceFrames(1, 0.016);

    expect(camera.position.x).toBe(3);
    expect(camera.position.y).toBe(4);
    expect(camera.position.z).toBe(12);
    expect(controls.target.x).toBe(1);
    expect(controls.target.y).toBe(-2);
    expect(controls.target.z).toBe(0.5);

    await renderer.unmount();
  });
});
