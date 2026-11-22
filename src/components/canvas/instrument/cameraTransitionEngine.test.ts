import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as THREE from 'three';
import {
  CameraTransitionController,
  type TransitionControlsLike,
} from './cameraTransitionEngine';
import * as reducedMotion from '../../../utils/reducedMotion';

interface MockControls extends TransitionControlsLike {
  target: THREE.Vector3;
  enabled: boolean;
  enableDamping: boolean;
  update: ReturnType<typeof vi.fn<() => void>>;
}

const linearEasing = (t: number) => t;
const mockMatchMedia = (reduced: boolean) => vi.spyOn(reducedMotion, 'prefersReducedMotion').mockReturnValue(reduced);

describe('cameraTransitionEngine', () => {
  let perspCam: THREE.PerspectiveCamera;
  let orthoCam: THREE.OrthographicCamera;
  let mockControls: MockControls;

  beforeEach(() => {
    mockMatchMedia(false);
    perspCam = new THREE.PerspectiveCamera(45, 16 / 9, 0.1, 1000);
    perspCam.position.set(0, 0, 20);
    perspCam.up.set(0, 1, 0);
    perspCam.lookAt(0, 0, 0);

    orthoCam = new THREE.OrthographicCamera(-10, 10, 10, -10, 0.1, 1000);
    orthoCam.position.set(0, 0, 20);
    orthoCam.zoom = 1;

    mockControls = {
      target: new THREE.Vector3(0, 0, 0),
      enabled: true,
      enableDamping: true,
      update: vi.fn<() => void>(),
    };
  });

  afterEach(() => {
    mockMatchMedia(false);
    vi.restoreAllMocks();
  });

  it('uses DEFAULT_CAMERA_EASING_CURVE (easeOutCubic) by default', () => {
    const controller = new CameraTransitionController();
    controller.start(perspCam, [100, 0, 0], mockControls.target, { duration: 1.0 }, 1000);
    controller.update(perspCam, mockControls, 1250);
    expect(mockControls.target.x).toBeCloseTo(57.8125, 4);
  });

  it('drains residual inertia pre-flight, keeps damping paused in flight, and settles update() BEFORE restoring enableDamping', () => {
    const controller = new CameraTransitionController();
    const onComplete = vi.fn();
    const dampingAtUpdateCalls: boolean[] = [];

    mockControls.update = vi.fn<() => void>(() => {
      dampingAtUpdateCalls.push(mockControls.enableDamping);
      if (dampingAtUpdateCalls.length === 1) mockControls.target.set(2, 0, 0);
    });

    controller.startPose(
      perspCam,
      { target: [10, 0, 0], position: [10, 0, 20] },
      mockControls,
      { duration: 1.0, easing: linearEasing, onComplete },
      1000,
    );

    expect(mockControls.enabled).toBe(true);
    expect(mockControls.enableDamping).toBe(false);
    expect(dampingAtUpdateCalls).toEqual([false]);

    controller.update(perspCam, mockControls, 1500);
    expect(mockControls.target.x).toBeCloseTo(6, 4);
    expect(mockControls.enableDamping).toBe(false);
    expect(dampingAtUpdateCalls).toEqual([false]);

    controller.update(perspCam, mockControls, 2000);
    expect(controller.isTransitioning()).toBe(false);
    expect(mockControls.enabled).toBe(true);
    expect(mockControls.enableDamping).toBe(true);
    expect(dampingAtUpdateCalls).toEqual([false, false]);
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it('performs identical pre-flight drain and post-flight settle when start() receives controls', () => {
    const controller = new CameraTransitionController();
    const dampingAtUpdateCalls: boolean[] = [];
    mockControls.update = vi.fn<() => void>(() => {
      dampingAtUpdateCalls.push(mockControls.enableDamping);
    });

    controller.start(perspCam, [20, 0, 0], mockControls.target, { duration: 1.0 }, 1000, mockControls);
    expect(dampingAtUpdateCalls).toEqual([false]);
    expect(mockControls.enableDamping).toBe(false);

    controller.update(perspCam, mockControls, 2000);
    expect(dampingAtUpdateCalls).toEqual([false, false]);
    expect(mockControls.enableDamping).toBe(true);
    expect(mockControls.target.x).toBeCloseTo(20, 4);
  });

  it('restores enableDamping AFTER calling controls.update() on cancel', () => {
    const controller = new CameraTransitionController();
    const onCancel = vi.fn();
    const dampingAtUpdateCalls: boolean[] = [];
    mockControls.update = vi.fn<() => void>(() => {
      dampingAtUpdateCalls.push(mockControls.enableDamping);
    });

    controller.startPose(perspCam, { target: [10, 0, 0], position: [10, 0, 20] }, mockControls, { duration: 1.0, onCancel }, 1000);
    expect(mockControls.enabled).toBe(true);
    expect(mockControls.enableDamping).toBe(false);
    controller.update(perspCam, mockControls, 1250);
    expect(dampingAtUpdateCalls).toEqual([false]);

    controller.cancel();
    expect(controller.isTransitioning()).toBe(false);
    expect(mockControls.enabled).toBe(true);
    expect(mockControls.enableDamping).toBe(true);
    expect(dampingAtUpdateCalls).toEqual([false, false]);
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('does not overwrite enableDamping when already disabled before flight', () => {
    mockControls.enableDamping = false;
    const controller = new CameraTransitionController();
    controller.startPose(perspCam, { target: [10, 0, 0], position: [10, 0, 20] }, mockControls, { duration: 1.0 }, 1000);
    expect(mockControls.enableDamping).toBe(false);
    controller.update(perspCam, mockControls, 2000);
    expect(mockControls.enableDamping).toBe(false);
  });

  it('anchors startTime on first update when now is omitted (pendingStart frame-0 stall guard)', () => {
    const controller = new CameraTransitionController();
    controller.start(perspCam, [100, 0, 0], mockControls.target, { duration: 1.0, easing: linearEasing });
    expect(controller.update(perspCam, mockControls, 5000)).toBe(true);
    expect(mockControls.target.x).toBeCloseTo(0, 4);
    expect(controller.isTransitioning()).toBe(true);

    controller.update(perspCam, mockControls, 5500);
    expect(mockControls.target.x).toBeCloseTo(50, 3);
    expect(controller.isTransitioning()).toBe(true);

    controller.update(perspCam, mockControls, 6000);
    expect(mockControls.target.x).toBeCloseTo(100, 4);
    expect(controller.isTransitioning()).toBe(false);
  });

  it('snaps immediately, calls controls.update() after snap while damping is paused, and restores damping under prefersReducedMotion', () => {
    mockMatchMedia(true);
    const controller = new CameraTransitionController();
    const onComplete = vi.fn();
    const dampingAtUpdateCalls: boolean[] = [];
    mockControls.update = vi.fn<() => void>(() => {
      dampingAtUpdateCalls.push(mockControls.enableDamping);
    });

    controller.startPose(perspCam, { target: [10, 20, 30], position: [10, 20, 50], up: [0, 0, 1], fov: 60 }, mockControls, { duration: 0.8, onComplete });

    expect(controller.isTransitioning()).toBe(false);
    expect(mockControls.enabled).toBe(true);
    expect(mockControls.enableDamping).toBe(true);
    expect(dampingAtUpdateCalls).toEqual([false, false]);
    expect(mockControls.target.toArray()).toEqual([10, 20, 30]);
    expect(perspCam.position.toArray()).toEqual([10, 20, 50]);
    expect(perspCam.up.toArray()).toEqual([0, 0, 1]);
    expect(perspCam.fov).toBe(60);
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it('snaps immediately and calls controls.update() when duration <= 0', () => {
    const controller = new CameraTransitionController();
    const onComplete = vi.fn();
    controller.start(perspCam, [5, 6, 7], mockControls.target, { duration: 0, onComplete }, undefined, mockControls);
    expect(controller.isTransitioning()).toBe(false);
    expect(mockControls.enableDamping).toBe(true);
    expect(mockControls.update).toHaveBeenCalledTimes(2);
    expect(mockControls.target.toArray()).toEqual([5, 6, 7]);
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it('interpolates spherical direction, logarithmic distance, up vector, and PerspectiveCamera fov', () => {
    const controller = new CameraTransitionController();
    perspCam.position.set(0, 0, 100);
    perspCam.up.set(0, 1, 0);
    perspCam.fov = 40;

    controller.startPose(perspCam, { target: [0, 0, 0], direction: [1, 0, 0], distance: 1, up: [0, 0, 1], fov: 60 }, mockControls, { duration: 1.0, logarithmicDistance: true, easing: linearEasing }, 1000);

    controller.update(perspCam, mockControls, 1500);
    expect(perspCam.position.length()).toBeCloseTo(10, 2);
    expect(perspCam.position.x).toBeCloseTo(10 * Math.SQRT1_2, 2);
    expect(perspCam.position.z).toBeCloseTo(10 * Math.SQRT1_2, 2);
    expect(perspCam.fov).toBeCloseTo(50, 3);
    expect(perspCam.up.y).toBeCloseTo(Math.SQRT1_2, 2);
    expect(perspCam.up.z).toBeCloseTo(Math.SQRT1_2, 2);

    controller.update(perspCam, mockControls, 2000);
    expect(perspCam.position.x).toBeCloseTo(1, 4);
    expect(perspCam.position.z).toBeCloseTo(0, 4);
    expect(perspCam.fov).toBeCloseTo(60, 4);
    expect(perspCam.up.z).toBeCloseTo(1, 4);
  });

  it('interpolates OrthographicCamera orthoZoom cleanly', () => {
    const controller = new CameraTransitionController();
    orthoCam.zoom = 1.0;
    controller.startPose(orthoCam, { target: [0, 0, 0], orthoZoom: 3.0 }, mockControls, { duration: 1.0, easing: linearEasing }, 1000);
    controller.update(orthoCam, mockControls, 1500);
    expect(orthoCam.zoom).toBeCloseTo(2.0, 4);
    controller.update(orthoCam, mockControls, 2000);
    expect(orthoCam.zoom).toBeCloseTo(3.0, 4);
    expect(controller.isTransitioning()).toBe(false);
  });

  it('preempts an active transition cleanly without leaving enableDamping disabled', () => {
    const controller = new CameraTransitionController();
    const firstCancel = vi.fn();

    controller.startPose(perspCam, { target: [10, 0, 0], position: [10, 0, 20] }, mockControls, { duration: 1.0, onCancel: firstCancel }, 1000);
    expect(mockControls.enabled).toBe(true);
    expect(mockControls.enableDamping).toBe(false);

    controller.startPose(perspCam, { target: [20, 0, 0], position: [20, 0, 20] }, mockControls, { duration: 1.0 }, 1200);
    expect(firstCancel).toHaveBeenCalledTimes(1);
    expect(mockControls.enabled).toBe(true);
    expect(mockControls.enableDamping).toBe(false);

    controller.update(perspCam, mockControls, 2200);
    expect(mockControls.enabled).toBe(true);
    expect(mockControls.enableDamping).toBe(true);
    expect(mockControls.target.x).toBeCloseTo(20, 4);
  });

  it('supports windowed orientation [0, 0.5] and translation [0.2, 1.0] easing', () => {
    const controller = new CameraTransitionController();
    controller.startPose(perspCam, { target: [100, 0, 0], direction: [1, 0, 0], distance: 20, up: [0, 0, 1] }, mockControls, { duration: 1.0, easing: linearEasing, orientationWindow: [0, 0.5], translationWindow: [0.2, 1.0] }, 1000);

    // At progress = 0.2: target has not started moving, orientation is 40% complete (0.2 / 0.5)
    controller.update(perspCam, mockControls, 1200);
    expect(mockControls.target.x).toBeCloseTo(0, 5);
    const dirAt02 = perspCam.position.clone().sub(mockControls.target).normalize();
    expect(dirAt02.angleTo(new THREE.Vector3(0, 0, 1))).toBeCloseTo(0.4 * (Math.PI / 2), 4);

    // At progress = 0.5: orientation has settled to [1, 0, 0], target is 3/8 along [0.2, 1.0]
    controller.update(perspCam, mockControls, 1500);
    const dirAt05 = perspCam.position.clone().sub(mockControls.target).normalize();
    expect(dirAt05.x).toBeCloseTo(1, 4);
    expect(dirAt05.z).toBeCloseTo(0, 4);
    expect(perspCam.up.z).toBeCloseTo(1, 4);
    expect(mockControls.target.x).toBeCloseTo(37.5, 3);

    controller.update(perspCam, mockControls, 2000);
    expect(controller.isTransitioning()).toBe(false);
    expect(mockControls.target.x).toBeCloseTo(100, 4);
    expect(perspCam.position.x).toBeCloseTo(120, 4);
  });

  it('rotates dir and up as a rigid body for frameTiltRad, keeping dot(dir, up) ≈ 0', () => {
    const controller = new CameraTransitionController();
    const tiltRad = (83.63 * Math.PI) / 180;
    controller.startPose(perspCam, { target: [10, 0, 0], distance: 40, frameTiltRad: tiltRad }, mockControls, { duration: 1.0, easing: linearEasing }, 1000);

    for (const t of [0.25, 0.5, 1.0]) {
      controller.update(perspCam, mockControls, 1000 + t * 1000);
      const dir = perspCam.position.clone().sub(mockControls.target).normalize();
      expect(Math.abs(dir.dot(perspCam.up))).toBeCloseTo(0, 5);
    }
    const finalDir = perspCam.position.clone().sub(mockControls.target).normalize();
    expect(finalDir.angleTo(new THREE.Vector3(0, 0, 1))).toBeCloseTo(tiltRad, 4);
    expect(perspCam.up.angleTo(new THREE.Vector3(0, 1, 0))).toBeCloseTo(tiltRad, 4);
  });

  it('invokes onProgress each active frame with progress in [0, 1]', () => {
    const controller = new CameraTransitionController();
    const progressValues: number[] = [];
    controller.startPose(perspCam, { target: [10, 0, 0], position: [10, 0, 20] }, mockControls, { duration: 1.0, easing: linearEasing, onProgress: (p) => progressValues.push(p) }, 1000);
    controller.update(perspCam, mockControls, 1250);
    controller.update(perspCam, mockControls, 1600);
    controller.update(perspCam, mockControls, 2000);
    expect(progressValues).toEqual([0.25, 0.6, 1.0]);
    expect(progressValues.every((p) => p >= 0 && p <= 1)).toBe(true);
  });
});
