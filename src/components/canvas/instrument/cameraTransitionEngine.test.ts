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
  update: ReturnType<typeof vi.fn>;
}

function mockMatchMedia(reduced: boolean) {
  vi.spyOn(reducedMotion, 'prefersReducedMotion').mockReturnValue(reduced);
}

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
      update: vi.fn(),
    };
  });

  afterEach(() => {
    mockMatchMedia(false);
    vi.restoreAllMocks();
  });

  it('uses DEFAULT_CAMERA_EASING_CURVE (easeInOutQuad) by default', () => {
    const controller = new CameraTransitionController();
    controller.start(perspCam, [100, 0, 0], mockControls.target, { duration: 1.0 }, 1000);

    // At progress = 0.25, easeInOutQuad(0.25) = 2 * 0.25 * 0.25 = 0.125 (vs cubic 0.0625)
    controller.update(perspCam, mockControls, 1250);
    expect(mockControls.target.x).toBeCloseTo(12.5, 4);
  });

  it('gates OrbitControls.enabled during flight and calls controls.update() once on settle', () => {
    const controller = new CameraTransitionController();
    const onComplete = vi.fn();

    controller.startPose(
      perspCam,
      { target: [10, 0, 0], position: [10, 0, 20] },
      mockControls,
      { duration: 1.0, onComplete },
      1000,
    );

    expect(mockControls.enabled).toBe(false);
    expect(mockControls.update).not.toHaveBeenCalled();

    // Intermediate frame: controls stay disabled and controls.update is NOT called
    controller.update(perspCam, mockControls, 1500);
    expect(mockControls.enabled).toBe(false);
    expect(mockControls.update).not.toHaveBeenCalled();

    // Completion frame: controls.enabled restored and controls.update called exactly once
    controller.update(perspCam, mockControls, 2000);
    expect(controller.isTransitioning()).toBe(false);
    expect(mockControls.enabled).toBe(true);
    expect(mockControls.update).toHaveBeenCalledTimes(1);
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it('restores OrbitControls.enabled and calls controls.update() once on cancel', () => {
    const controller = new CameraTransitionController();
    const onCancel = vi.fn();

    controller.startPose(
      perspCam,
      { target: [10, 0, 0], position: [10, 0, 20] },
      mockControls,
      { duration: 1.0, onCancel },
      1000,
    );

    expect(mockControls.enabled).toBe(false);
    controller.update(perspCam, mockControls, 1250);
    expect(mockControls.update).not.toHaveBeenCalled();

    controller.cancel();
    expect(controller.isTransitioning()).toBe(false);
    expect(mockControls.enabled).toBe(true);
    expect(mockControls.update).toHaveBeenCalledTimes(1);
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('anchors startTime on first update when now is omitted (pendingStart frame-0 stall guard)', () => {
    const controller = new CameraTransitionController();
    controller.start(perspCam, [100, 0, 0], mockControls.target, { duration: 1.0 });

    // Simulate a 5-second shader-compile stall before frame 0 update arrives
    const firstTick = controller.update(perspCam, mockControls, 5000);
    expect(firstTick).toBe(true);
    expect(mockControls.target.x).toBeCloseTo(0, 4);
    expect(controller.isTransitioning()).toBe(true);

    // 0.5s after frame 0 -> halfway through glide
    controller.update(perspCam, mockControls, 5500);
    expect(mockControls.target.x).toBeCloseTo(50, 3);
    expect(controller.isTransitioning()).toBe(true);

    // 1.0s after frame 0 -> settled
    controller.update(perspCam, mockControls, 6000);
    expect(mockControls.target.x).toBeCloseTo(100, 4);
    expect(controller.isTransitioning()).toBe(false);
  });

  it('snaps immediately on start and startPose when prefersReducedMotion is active', () => {
    mockMatchMedia(true);
    const controller = new CameraTransitionController();
    const onComplete = vi.fn();

    controller.startPose(
      perspCam,
      {
        target: [10, 20, 30],
        position: [10, 20, 50],
        up: [0, 0, 1],
        fov: 60,
      },
      mockControls,
      { duration: 0.8, onComplete },
    );

    expect(controller.isTransitioning()).toBe(false);
    expect(mockControls.enabled).toBe(true);
    expect(mockControls.update).toHaveBeenCalledTimes(1);
    expect(mockControls.target.toArray()).toEqual([10, 20, 30]);
    expect(perspCam.position.toArray()).toEqual([10, 20, 50]);
    expect(perspCam.up.toArray()).toEqual([0, 0, 1]);
    expect(perspCam.fov).toBe(60);
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it('snaps immediately when duration <= 0', () => {
    const controller = new CameraTransitionController();
    const onComplete = vi.fn();

    controller.start(
      perspCam,
      [5, 6, 7],
      mockControls.target,
      { duration: 0, onComplete },
    );

    expect(controller.isTransitioning()).toBe(false);
    expect(mockControls.target.toArray()).toEqual([5, 6, 7]);
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it('interpolates spherical direction, logarithmic distance, up vector, and PerspectiveCamera fov', () => {
    const controller = new CameraTransitionController();
    perspCam.position.set(0, 0, 100);
    perspCam.up.set(0, 1, 0);
    perspCam.fov = 40;

    controller.startPose(
      perspCam,
      {
        target: [0, 0, 0],
        direction: [1, 0, 0],
        distance: 1,
        up: [0, 0, 1],
        fov: 60,
      },
      mockControls,
      { duration: 1.0, logarithmicDistance: true, easing: 'linear' },
      1000,
    );

    // At t = 0.5: direction rotated 45 deg in XZ plane, log distance = 10, fov = 50
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

    controller.startPose(
      orthoCam,
      { target: [0, 0, 0], orthoZoom: 3.0 },
      mockControls,
      { duration: 1.0, easing: 'linear' },
      1000,
    );

    controller.update(orthoCam, mockControls, 1500);
    expect(orthoCam.zoom).toBeCloseTo(2.0, 4);

    controller.update(orthoCam, mockControls, 2000);
    expect(orthoCam.zoom).toBeCloseTo(3.0, 4);
    expect(controller.isTransitioning()).toBe(false);
  });

  it('preempts an active transition cleanly without overwriting prevControlsEnabled', () => {
    const controller = new CameraTransitionController();
    const firstCancel = vi.fn();

    controller.startPose(
      perspCam,
      { target: [10, 0, 0], position: [10, 0, 20] },
      mockControls,
      { duration: 1.0, onCancel: firstCancel },
      1000,
    );
    expect(mockControls.enabled).toBe(false);

    controller.startPose(
      perspCam,
      { target: [20, 0, 0], position: [20, 0, 20] },
      mockControls,
      { duration: 1.0 },
      1200,
    );
    expect(firstCancel).toHaveBeenCalledTimes(1);
    expect(mockControls.enabled).toBe(false);

    controller.update(perspCam, mockControls, 2200);
    expect(mockControls.enabled).toBe(true);
    expect(mockControls.target.x).toBeCloseTo(20, 4);
  });
});
