import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as THREE from 'three';
import { CameraTransitionController } from './cameraTransitionEngine';
import type { TransitionControlsLike } from './cameraTransitionPoseMath';
import * as reducedMotion from '../../../utils/reducedMotion';

const linearEasing = (t: number) => t;

describe('cameraTransitionEngine dynamic duration', () => {
  let perspCam: THREE.PerspectiveCamera;
  let mockControls: TransitionControlsLike & { target: THREE.Vector3 };

  beforeEach(() => {
    vi.spyOn(reducedMotion, 'prefersReducedMotion').mockReturnValue(false);
    perspCam = new THREE.PerspectiveCamera(45, 16 / 9, 0.1, 1000);
    perspCam.position.set(0, 0, 20);
    perspCam.up.set(0, 1, 0);
    perspCam.lookAt(0, 0, 0);
    mockControls = {
      target: new THREE.Vector3(0, 0, 0),
      enabled: true,
      update: vi.fn(),
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('computes distance-dependent duration for long hops and pure rotation when duration is omitted', () => {
    const controller = new CameraTransitionController();

    controller.start(perspCam, [100, 0, 0], mockControls.target, { easing: linearEasing }, 1000);
    controller.update(perspCam, mockControls, 1750);
    expect(controller.isTransitioning()).toBe(true);
    expect(mockControls.target.x).toBeCloseTo(50, 3);
    controller.update(perspCam, mockControls, 2500);
    expect(controller.isTransitioning()).toBe(false);

    perspCam.position.set(100, 0, 20);
    mockControls.target.set(100, 0, 0);
    controller.startPose(
      perspCam,
      { target: [100, 0, 0], direction: [1, 0, 0], distance: 20 },
      mockControls,
      { easing: linearEasing },
      3000,
    );
    controller.update(perspCam, mockControls, 3400);
    expect(controller.isTransitioning()).toBe(true);
    controller.update(perspCam, mockControls, 3800);
    expect(controller.isTransitioning()).toBe(false);
  });
});
